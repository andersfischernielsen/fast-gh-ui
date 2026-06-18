<script lang="ts">
  import { page } from "$app/stores";
  import { untrack } from "svelte";
  import Markdown from "./Markdown.svelte";
  import Comment from "./Comment.svelte";
  import CommentSkeleton from "./CommentSkeleton.svelte";
  import CommentInput from "./CommentInput.svelte";
  import DiffSnippet from "./DiffSnippet.svelte";
  import Reactions from "./Reactions.svelte";
  import { parsePatch, suggestionLinesFromPatch } from "$lib/utils/diff";
  import {
    listPRTimeline,
    listInlineComments,
    createPRComment,
    updatePRComment,
    deletePRComment,
    createInlineComment,
    updateInlineComment,
    deleteInlineComment,
    updatePullRequest,
    createIssueCommentReaction,
    deleteIssueCommentReaction,
    createReviewCommentReaction,
    deleteReviewCommentReaction,
    createIssueReaction,
    deleteIssueReaction,
  } from "$lib/github/pulls";
  import { pr } from "$lib/stores/pr.svelte";

  interface CommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
    isReview?: boolean;
  }

  type EntryKind = "issue" | "inline-thread" | "review-summary";

  interface ThreadedComment extends CommentData {
    kind: EntryKind;
    replies: CommentData[];
    commitId?: string;
    path?: string;
    line?: number;
    startLine?: number | null;
    originalLine?: number | null;
    originalStartLine?: number | null;
    side?: "LEFT" | "RIGHT";
    diffHunk?: string;
    reviewState?: string;
  }

  let { body, editable = false }: { body: string | null; editable?: boolean } = $props();

  const PAGE_SIZE = 50;

  let timelineEntries = $state<ThreadedComment[]>([]);
  let inlineThreads = $state<ThreadedComment[]>([]);
  let loadedPages = $state(0);
  let hasMore = $state(true);
  let pageError = $state<string | null>(null);
  let loadingPage = $state(false);

  let localComments = $state<ThreadedComment[]>([]);
  let deletedIds = $state(new Set<number>());
  let patchedBodies = $state(new Map<number, string>());
  let addedReplies = $state(new Map<number, CommentData[]>());

  let commentIndex = new Map<number, ThreadedComment>();
  let reviewIds = new Set<number>();

  let editingDesc = $state(false);
  let editDescBody = $state("");
  let savingDesc = $state(false);
  let descError = $state<string | null>(null);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  function toCommentData(raw: Record<string, unknown>): CommentData {
    return {
      id: raw.id as number,
      body: (raw.body as string) ?? "",
      user: {
        login: (raw.user as { login?: string })?.login ?? "",
        avatarUrl: (raw.user as { avatar_url?: string })?.avatar_url ?? "",
      },
      createdAt: (raw.created_at as string) ?? "",
      updatedAt: (raw.updated_at as string) ?? "",
      htmlUrl: raw.html_url as string,
    };
  }

  function mapTimelineEvents(events: Record<string, unknown>[]): ThreadedComment[] {
    const result: ThreadedComment[] = [];
    for (const event of events) {
      const type = event.event as string;
      if (type === "commented") {
        result.push({
          kind: "issue",
          ...toCommentData(event),
          replies: [],
        });
      } else if (type === "reviewed") {
        const reviewBody = (event.body as string) ?? "";
        const state = (event.state as string) ?? "commented";
        // A "commented" review with no body is just an inline-comment container;
        // we already render those inline threads separately.
        if (!reviewBody && state === "commented") continue;
        const user = event.user as { login?: string; avatar_url?: string } | undefined;
        result.push({
          kind: "review-summary",
          id: event.id as number,
          body: reviewBody,
          user: {
            login: user?.login ?? "",
            avatarUrl: user?.avatar_url ?? "",
          },
          createdAt: (event.submitted_at as string) ?? "",
          updatedAt: (event.submitted_at as string) ?? "",
          htmlUrl: event.html_url as string,
          replies: [],
          reviewState: state,
        });
      }
    }
    return result;
  }

  function buildInlineThreads(raw: Record<string, unknown>[]): ThreadedComment[] {
    const byId = new Map<number, ThreadedComment>();
    const pendingReplies: Record<string, unknown>[] = [];
    for (const c of raw) {
      const inReplyTo = c.in_reply_to_id as number | undefined;
      if (inReplyTo != null) {
        pendingReplies.push(c);
        continue;
      }
      const id = c.id as number;
      reviewIds.add(id);
      byId.set(id, {
        kind: "inline-thread",
        ...toCommentData(c),
        isReview: true,
        replies: [],
        commitId: c.commit_id as string,
        path: c.path as string,
        line:
          ((c.line ?? c.original_line ?? c.position) as number) ?? 1,
        startLine: c.start_line as number | null,
        originalLine: c.original_line as number | null,
        originalStartLine: c.original_start_line as number | null,
        side: (c.side as "LEFT" | "RIGHT" | undefined) ?? "RIGHT",
        diffHunk: c.diff_hunk as string | undefined,
      });
    }
    for (const r of pendingReplies) {
      const parent = byId.get(r.in_reply_to_id as number);
      if (!parent) continue;
      reviewIds.add(r.id as number);
      parent.replies.push({ ...toCommentData(r), isReview: true });
    }
    return [...byId.values()];
  }

  async function loadNextTimelinePage(): Promise<void> {
    if (loadingPage || !hasMore) return;
    loadingPage = true;
    pageError = null;
    try {
      const pageNum = loadedPages + 1;
      const events = (await listPRTimeline(
        owner,
        repo,
        number,
        pageNum,
        PAGE_SIZE,
      )) as Record<string, unknown>[];
      const entries = mapTimelineEvents(events);
      for (const e of entries) commentIndex.set(e.id, e);
      timelineEntries = [...timelineEntries, ...entries];
      loadedPages = pageNum;
      hasMore = events.length === PAGE_SIZE;
    } catch (e) {
      pageError = e instanceof Error ? e.message : "Failed to load timeline.";
    } finally {
      loadingPage = false;
    }
  }

  async function loadAllInlineComments(
    o: string | undefined,
    r: string | undefined,
    n: number,
  ) {
    if (!o || !r) return;
    const all: Record<string, unknown>[] = [];
    let pageNum = 1;
    while (true) {
      const batch = (await listInlineComments(o, r, n, pageNum, 100)) as Record<
        string,
        unknown
      >[];
      if (!batch.length) break;
      all.push(...batch);
      if (batch.length < 100) break;
      pageNum++;
    }
    const threads = buildInlineThreads(all);
    for (const t of threads) commentIndex.set(t.id, t);
    inlineThreads = threads;
  }

  $effect(() => {
    const o = owner;
    const r = repo;
    const n = number;
    commentIndex = new Map();
    reviewIds = new Set();
    localComments = [];
    deletedIds = new Set();
    patchedBodies = new Map();
    addedReplies = new Map();
    timelineEntries = [];
    inlineThreads = [];
    loadedPages = 0;
    hasMore = true;
    pageError = null;
    loadingPage = false;
    untrack(() => {
      loadAllInlineComments(o, r, n);
      loadNextTimelinePage();
    });
  });

  let mergedEntries = $derived.by(() => {
    const all = [...timelineEntries, ...inlineThreads, ...localComments].filter(
      (c) => !deletedIds.has(c.id),
    );
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });

  function lazySentinel(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadNextTimelinePage();
    });
    observer.observe(node);
    return {
      destroy() {
        observer.disconnect();
      },
    };
  }

  function reviewSuggestionLines(c: ThreadedComment): string[] {
    if (!c.diffHunk) return [];
    const side = c.side ?? "RIGHT";
    const end =
      side === "RIGHT"
        ? (c.line ?? c.originalLine)
        : (c.originalLine ?? c.line);
    const start =
      (side === "RIGHT" ? c.startLine : c.originalStartLine) ?? end;
    if (end == null || start == null) return [];
    return suggestionLinesFromPatch(parsePatch(c.diffHunk), side, start, end);
  }

  function formatReviewState(state: string | undefined): string {
    switch (state) {
      case "approved":
        return "approved these changes";
      case "changes_requested":
        return "requested changes";
      case "commented":
      default:
        return "reviewed";
    }
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
  }

  function reviewLineLabel(c: ThreadedComment): string {
    const side = c.side ?? "RIGHT";
    const prefix = side === "RIGHT" ? "R" : "L";
    const end = c.line ?? c.originalLine;
    const start =
      (side === "RIGHT" ? c.startLine : c.originalStartLine) ?? null;
    if (end == null) return "";
    if (start != null && start !== end) return `${prefix}${start}–${prefix}${end}`;
    return `${prefix}${end}`;
  }

  function withOverlays(c: ThreadedComment): { comment: ThreadedComment; replies: CommentData[] } {
    return {
      comment: { ...c, body: patchedBodies.get(c.id) ?? c.body },
      replies: [
        ...c.replies
          .filter((r) => !deletedIds.has(r.id))
          .map((r) => ({ ...r, body: patchedBodies.get(r.id) ?? r.body })),
        ...(addedReplies.get(c.id) ?? []),
      ],
    };
  }

  async function postComment(commentBody: string) {
    const raw = await createPRComment(owner, repo, number, commentBody);
    const comment: ThreadedComment = {
      kind: "issue",
      ...toCommentData(raw as Record<string, unknown>),
      replies: [],
    };
    commentIndex.set(comment.id, comment);
    localComments = [...localComments, comment];
  }

  async function replyToComment(parentId: number, replyBody: string) {
    const parent = commentIndex.get(parentId);
    if (!parent) return;

    let raw: Record<string, unknown>;
    if (parent.kind === "inline-thread" && parent.commitId && parent.path) {
      raw = (await createInlineComment(
        owner, repo, number, replyBody,
        parent.commitId, parent.path, parent.line ?? 1,
        undefined, undefined, undefined, parentId,
      )) as Record<string, unknown>;
    } else {
      raw = (await createPRComment(owner, repo, number, replyBody)) as Record<string, unknown>;
    }

    const reply = toCommentData(raw);
    addedReplies = new Map([...addedReplies,
      [parentId, [...(addedReplies.get(parentId) ?? []), reply]],
    ]);
  }

  async function onUpdateComment(commentId: number, newBody: string) {
    if (reviewIds.has(commentId)) {
      await updateInlineComment(owner, repo, commentId, newBody);
    } else {
      await updatePRComment(owner, repo, commentId, newBody);
    }
    patchedBodies = new Map([...patchedBodies, [commentId, newBody]]);
  }

  async function onDeleteComment(commentId: number) {
    if (reviewIds.has(commentId)) {
      await deleteInlineComment(owner, repo, commentId);
    } else {
      await deletePRComment(owner, repo, commentId);
    }
    deletedIds = new Set([...deletedIds, commentId]);
  }

  async function onreaction(
    commentId: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    const isReview = reviewIds.has(commentId);
    if (remove && reactionId) {
      if (isReview) {
        await deleteReviewCommentReaction(owner, repo, commentId, reactionId);
      } else {
        await deleteIssueCommentReaction(owner, repo, commentId, reactionId);
      }
    } else {
      if (isReview) {
        await createReviewCommentReaction(owner, repo, commentId, emoji);
      } else {
        await createIssueCommentReaction(owner, repo, commentId, emoji);
      }
    }
  }

  async function onDescriptionReaction(
    _: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    if (remove && reactionId) {
      await deleteIssueReaction(owner, repo, number, reactionId);
    } else {
      await createIssueReaction(owner, repo, number, emoji);
    }
  }

  function startEditDescription() {
    editDescBody = body ?? "";
    editingDesc = true;
    descError = null;
  }

  function cancelEditDescription() {
    editingDesc = false;
    descError = null;
  }

  async function saveDescription() {
    savingDesc = true;
    descError = null;
    try {
      const result = await updatePullRequest(owner, repo, number, { body: editDescBody });
      if (result && pr.value) pr.value.body = result.body ?? null;
      editingDesc = false;
    } catch (e) {
      descError = e instanceof Error ? e.message : "Failed to update description.";
    } finally {
      savingDesc = false;
    }
  }
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <div class="desc-header">
        <h3>Description</h3>
        {#if editable}
          {#if editingDesc}
            <div class="desc-edit-actions">
              <button class="desc-save-btn" onclick={saveDescription} disabled={savingDesc}>
                {savingDesc ? "Saving..." : "Save"}
              </button>
              <button class="desc-cancel-btn" onclick={cancelEditDescription} disabled={savingDesc}>
                Cancel
              </button>
            </div>
          {:else}
            <button class="desc-edit-btn" onclick={startEditDescription}>Edit</button>
          {/if}
        {/if}
      </div>
      {#if editable && editingDesc}
        <textarea class="desc-textarea" bind:value={editDescBody} disabled={savingDesc}></textarea>
        {#if descError}
          <span class="desc-error">{descError}</span>
        {/if}
      {:else}
        <Markdown text={body} />
      {/if}
      <Reactions {owner} {repo} issueNumber={number} onreaction={onDescriptionReaction} />
    </div>
  {/if}

  <div class="comments">
    {#each mergedEntries as c (c.id)}
      {@const { comment, replies } = withOverlays(c)}
      {#if c.kind === "review-summary"}
        <article class="review-summary state-{c.reviewState ?? 'commented'}">
          <header class="review-summary-header">
            <span class="user-info">
              <img
                class="avatar"
                src={c.user.avatarUrl}
                alt=""
                width="20"
                height="20"
              />
              <strong>{c.user.login}</strong>
              <span class="review-state-badge"
                >{formatReviewState(c.reviewState)}</span
              >
            </span>
            {#if c.htmlUrl}
              <a
                class="date"
                href={c.htmlUrl}
                target="_blank"
                rel="noopener">{formatDate(c.createdAt)}</a
              >
            {/if}
          </header>
          {#if c.body}
            <div class="review-summary-body">
              <Markdown text={c.body} />
            </div>
          {/if}
        </article>
      {:else if c.kind === "inline-thread"}
        <div class="review-block">
          {#if c.path}
            <div class="review-header">
              <span class="review-path">{c.path}</span>
              {#if reviewLineLabel(c)}
                <span class="review-line">{reviewLineLabel(c)}</span>
              {/if}
            </div>
          {/if}
          {#if c.diffHunk}
            <DiffSnippet
              patch={c.diffHunk}
              highlightSide={c.side ?? "RIGHT"}
              highlightStart={(c.side ?? "RIGHT") === "RIGHT"
                ? (c.startLine ?? c.line ?? null)
                : (c.originalStartLine ?? c.originalLine ?? null)}
              highlightEnd={(c.side ?? "RIGHT") === "RIGHT"
                ? (c.line ?? null)
                : (c.originalLine ?? null)}
            />
          {/if}
          <Comment
            {comment}
            {replies}
            suggestionLines={reviewSuggestionLines(c)}
            {owner}
            {repo}
            onreply={replyToComment}
            onupdate={onUpdateComment}
            ondelete={onDeleteComment}
            {onreaction}
          />
        </div>
      {:else}
        <Comment
          {comment}
          {replies}
          {owner}
          {repo}
          onreply={replyToComment}
          onupdate={onUpdateComment}
          ondelete={onDeleteComment}
          {onreaction}
        />
      {/if}
    {/each}
    {#if loadingPage}
      <CommentSkeleton count={mergedEntries.length ? 2 : 3} />
    {:else if pageError}
      <p class="status error">{pageError}</p>
    {:else if !mergedEntries.length}
      <p class="status">No comments yet</p>
    {/if}
    {#if hasMore && !loadingPage}
      <div use:lazySentinel></div>
    {/if}
  </div>

  <CommentInput onsubmit={postComment} />
</div>

<style>
  .conversation {
    padding: 24px;
  }
  .description {
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  .desc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .desc-header h3 {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }
  .desc-edit-btn {
    padding: 2px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: transparent;
    font-size: 11px;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
    line-height: 1.4;
  }
  .desc-edit-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  .desc-edit-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .desc-save-btn {
    padding: 2px 8px;
    border: 1px solid var(--btn-primary-border);
    border-radius: 4px;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
    line-height: 1.4;
  }
  .desc-save-btn:hover:not(:disabled) {
    background: var(--btn-primary-hover);
  }
  .desc-save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .desc-cancel-btn {
    padding: 2px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--btn-secondary-bg);
    font-size: 11px;
    color: var(--btn-secondary-text);
    cursor: pointer;
    font-family: inherit;
    line-height: 1.4;
  }
  .desc-cancel-btn:hover:not(:disabled) {
    background: var(--btn-secondary-hover);
  }
  .desc-cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .desc-textarea {
    width: 100%;
    min-height: 120px;
    padding: 8px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: monospace;
    resize: vertical;
    box-sizing: border-box;
    line-height: 1.5;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .desc-error {
    display: block;
    font-size: 12px;
    color: var(--text-danger);
    margin-top: 4px;
  }
  .comments {
    margin-bottom: 16px;
  }
  .review-block {
    margin-bottom: 4px;
  }
  .review-summary {
    border: 1px solid var(--border-primary);
    border-left-width: 3px;
    border-radius: 6px;
    margin-bottom: 4px;
    overflow: hidden;
  }
  .review-summary.state-approved {
    border-left-color: var(--text-success);
  }
  .review-summary.state-changes_requested {
    border-left-color: var(--text-danger);
  }
  .review-summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    font-size: 12px;
    font-family: "SF Mono", Menlo, Monaco, monospace;
  }
  .review-summary .user-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .review-summary .avatar {
    border-radius: 50%;
    flex-shrink: 0;
  }
  .review-state-badge {
    color: var(--text-secondary);
    font-weight: normal;
  }
  .review-summary .date {
    color: var(--text-secondary);
    font-size: 11px;
    text-decoration: none;
  }
  .review-summary-body {
    padding: 12px 16px;
    font-size: 12px;
  }
  .review-header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid var(--border-primary);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--bg-secondary);
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 11px;
  }
  .review-path {
    color: var(--text-primary);
    overflow-wrap: anywhere;
  }
  .review-line {
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  .review-block :global(.snippet) {
    border-radius: 0;
    border-top: none;
  }
  .review-block > :global(.comment) {
    border-radius: 0 0 6px 6px;
    margin-top: -1px;
  }
  .status {
    padding: 16px 0;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
