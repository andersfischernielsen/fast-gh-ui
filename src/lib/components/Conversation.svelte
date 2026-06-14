<script lang="ts">
  import { page } from "$app/stores";
  import Markdown from "./Markdown.svelte";
  import Comment from "./Comment.svelte";
  import CommentInput from "./CommentInput.svelte";
  import Reactions from "./Reactions.svelte";
  import {
    listPRTimeline,
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
  }

  interface ThreadedComment extends CommentData {
    replies: CommentData[];
    isReview?: boolean;
    commitId?: string;
    path?: string;
    line?: number;
  }

  let { body, editable = false }: { body: string | null; editable?: boolean } = $props();

  const PAGE_SIZE = 20;

  // One promise per page — {#await} handles the loading state for each
  let pages = $state<Promise<ThreadedComment[]>[]>([]);

  // Mutation overlays applied on top of resolved page data
  let localComments = $state<ThreadedComment[]>([]);
  let deletedIds = $state(new Set<number>());
  let patchedBodies = $state(new Map<number, string>());
  let addedReplies = $state(new Map<number, CommentData[]>());

  // Non-reactive lookup used for API routing on mutations
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
        result.push({ ...toCommentData(event), replies: [] });
      } else if (type === "line-commented") {
        const comments = (event.comments as Record<string, unknown>[]) ?? [];
        if (!comments.length) continue;
        const root = comments[0];
        reviewIds.add(root.id as number);
        comments.slice(1).forEach((r) => reviewIds.add(r.id as number));
        result.push({
          ...toCommentData(root),
          replies: comments.slice(1).map(toCommentData),
          isReview: true,
          commitId: root.commit_id as string,
          path: root.path as string,
          line: ((root.line ?? root.original_line ?? root.position) as number) ?? 1,
        });
      }
    }
    return result;
  }

  async function fetchPage(o: string, r: string, n: number, pageNum: number): Promise<{ comments: ThreadedComment[]; hasMore: boolean }> {
    const events = await listPRTimeline(o, r, n, pageNum);
    const comments = mapTimelineEvents(events as Record<string, unknown>[]);
    for (const c of comments) commentIndex.set(c.id, c);
    return { comments, hasMore: events.length === PAGE_SIZE };
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
    pages = [fetchPage(o, r, n, 1)];
  });

  function lazySentinel(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting)
        pages = [...pages, fetchPage(owner, repo, number, pages.length + 1)];
    });
    observer.observe(node);
    return { destroy() { observer.disconnect(); } };
  }

  // Applies mutation overlays to a comment before rendering
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
    const comment = { ...toCommentData(raw as Record<string, unknown>), replies: [] };
    commentIndex.set(comment.id, comment);
    localComments = [...localComments, comment];
  }

  async function replyToComment(parentId: number, replyBody: string) {
    const parent = commentIndex.get(parentId);
    if (!parent) return;

    let raw: Record<string, unknown>;
    if (parent.isReview && parent.commitId && parent.path) {
      raw = (await createInlineComment(
        owner, repo, number, replyBody,
        parent.commitId, parent.path, parent.line ?? 1,
        undefined, parentId,
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
    {#each pages as pagePromise, i}
      {#await pagePromise}
        <p class="status">Loading...</p>
      {:then { comments, hasMore }}
        {#each comments.filter((c) => !deletedIds.has(c.id)) as c (c.id)}
          {@const { comment, replies } = withOverlays(c)}
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
        {/each}
        {#if i === 0 && comments.length === 0 && localComments.length === 0}
          <p class="status">No comments yet</p>
        {/if}
        {#if i === pages.length - 1 && hasMore}
          <div use:lazySentinel></div>
        {/if}
      {:catch error}
        <p class="status error">{error.message}</p>
      {/await}
    {/each}

    {#each localComments.filter((c) => !deletedIds.has(c.id)) as c (c.id)}
      {@const { comment, replies } = withOverlays(c)}
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
    {/each}
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
  .status {
    padding: 16px 0;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
