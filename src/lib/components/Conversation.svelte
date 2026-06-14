<script lang="ts">
  import { page } from "$app/stores";
  import Markdown from "./Markdown.svelte";
  import Comment from "./Comment.svelte";
  import CommentInput from "./CommentInput.svelte";
  import Reactions from "./Reactions.svelte";
  import {
    listPRComments,
    createPRComment,
    updatePRComment,
    deletePRComment,
    listInlineComments,
    createInlineComment,
    updateInlineComment,
    deleteInlineComment,
    updatePullRequest,
    listIssueReactions,
    listCommentReactions,
    listReviewCommentReactions,
    createIssueCommentReaction,
    deleteIssueCommentReaction,
    createReviewCommentReaction,
    deleteReviewCommentReaction,
    createIssueReaction,
    deleteIssueReaction,
    getCurrentUser,
    mapReactions,
  } from "$lib/github/pulls";
  import { pr } from "$lib/stores/pr.svelte";
  import type { ReactionData } from "$lib/types/comment";

  interface CommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
  }

  interface ReviewCommentData extends CommentData {
    commitId: string;
    path: string;
    line: number;
  }

  interface ThreadedComment extends CommentData {
    replies: CommentData[];
    isReview?: boolean;
    commitId?: string;
    path?: string;
    line?: number;
  }

  let { body }: { body: string | null } = $props();

  let threadedComments = $state<ThreadedComment[]>([]);

  let editingDesc = $state(false);
  let editDescBody = $state("");
  let savingDesc = $state(false);
  let descError = $state<string | null>(null);

  let descriptionReactions = $state<ReactionData[]>([]);

  let reviewIds = new Set<number>();

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
      createdAt: raw.created_at as string,
      updatedAt: raw.updated_at as string,
      htmlUrl: raw.html_url as string,
    };
  }

  async function loadConversation(): Promise<void> {
    const [issueComments, reviewComments] = await Promise.all([
      listPRComments(owner, repo, number),
      listInlineComments(owner, repo, number),
    ]);

    const user = await getCurrentUser();

    const rawDescReactions = await listIssueReactions(owner, repo, number);
    descriptionReactions = mapReactions(
      rawDescReactions as Record<string, unknown>[],
      user,
    );

    const issueItems: ThreadedComment[] = (
      issueComments as Record<string, unknown>[]
    )
      .map(toCommentData)
      .map((c) => ({
        ...c,
        replies: [],
      }));

    const reviewItems = reviewComments as Record<string, unknown>[];

    const replyMap = new Map<number, Record<string, unknown>[]>();
    const rootReviews: Record<string, unknown>[] = [];

    for (const rc of reviewItems) {
      const inReplyTo = rc.in_reply_to_id as number | undefined;
      if (inReplyTo) {
        const list = replyMap.get(inReplyTo) ?? [];
        list.push(rc);
        replyMap.set(inReplyTo, list);
      } else {
        rootReviews.push(rc);
      }
    }

    const reviewThreads: ThreadedComment[] = rootReviews.map((rc) => {
      const id = rc.id as number;
      reviewIds.add(id);
      const childReplies = replyMap.get(id) ?? [];
      childReplies.forEach((r) => reviewIds.add(r.id as number));
      return {
        ...toCommentData(rc),
        replies: childReplies.map(toCommentData),
        isReview: true,
        commitId: (rc.commit_id as string) ?? "",
        path: (rc.path as string) ?? "",
        line: ((rc.line ?? rc.original_line ?? rc.position) as number) ?? 1,
      };
    });

    threadedComments = [...issueItems, ...reviewThreads].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  async function postComment(commentBody: string) {
    const raw = await createPRComment(owner, repo, number, commentBody);
    threadedComments = [
      ...threadedComments,
      {
        ...toCommentData(raw as Record<string, unknown>),
        replies: [],
      },
    ];
  }

  async function replyToComment(parentId: number, replyBody: string) {
    const parent = threadedComments.find((tc) => tc.id === parentId);
    if (!parent) return;

    let raw: {
      id: number;
      body: string;
      user: { login: string; avatar_url: string };
      created_at: string;
      updated_at: string;
      html_url: string;
    };

    if (parent.isReview && parent.commitId && parent.path) {
      raw = (await createInlineComment(
        owner,
        repo,
        number,
        replyBody,
        parent.commitId,
        parent.path,
        parent.line ?? 1,
        undefined,
        parentId,
      )) as unknown as typeof raw;
    } else {
      raw = (await createPRComment(
        owner,
        repo,
        number,
        replyBody,
      )) as unknown as typeof raw;
    }

    const reply: CommentData = toCommentData(
      raw as unknown as Record<string, unknown>,
    );
    threadedComments = threadedComments.map((tc) =>
      tc.id === parentId ? { ...tc, replies: [...tc.replies, reply] } : tc,
    );
  }

  async function onUpdateComment(commentId: number, body: string) {
    let useInline = false;
    const target = threadedComments.find((tc) => tc.id === commentId);
    if (target?.isReview) {
      useInline = true;
    } else if (!target) {
      const parent = threadedComments.find((tc) =>
        tc.replies.some((r) => r.id === commentId),
      );
      if (parent?.isReview) useInline = true;
    }
    if (useInline) {
      await updateInlineComment(owner, repo, commentId, body);
    } else {
      await updatePRComment(owner, repo, commentId, body);
    }
    threadedComments = threadedComments.map((tc) => {
      if (tc.id === commentId) return { ...tc, body };
      tc.replies = tc.replies.map((r) =>
        r.id === commentId ? { ...r, body } : r,
      );
      return tc;
    });
  }

  async function onDeleteComment(commentId: number) {
    let useInline = false;
    const target = threadedComments.find((tc) => tc.id === commentId);
    if (target?.isReview) {
      useInline = true;
    } else if (!target) {
      const parent = threadedComments.find((tc) =>
        tc.replies.some((r) => r.id === commentId),
      );
      if (parent?.isReview) useInline = true;
    }
    if (useInline) {
      await deleteInlineComment(owner, repo, commentId);
    } else {
      await deletePRComment(owner, repo, commentId);
    }
    threadedComments = threadedComments
      .map((tc) => {
        tc.replies = tc.replies.filter((r) => r.id !== commentId);
        return tc;
      })
      .filter((tc) => tc.id !== commentId);
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
        await deleteReviewCommentReaction(
          owner,
          repo,
          commentId,
          reactionId,
        );
      } else {
        await deleteIssueCommentReaction(
          owner,
          repo,
          commentId,
          reactionId,
        );
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
    _commentId: number,
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
      const result = await updatePullRequest(owner, repo, number, {
        body: editDescBody,
      });
      if (result && pr.value) {
        pr.value.body = result.body ?? null;
      }
      editingDesc = false;
    } catch (e) {
      descError =
        e instanceof Error ? e.message : "Failed to update description.";
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
        {#if editingDesc}
          <div class="desc-edit-actions">
            <button
              class="desc-save-btn"
              onclick={saveDescription}
              disabled={savingDesc}
            >
              {savingDesc ? "Saving..." : "Save"}
            </button>
            <button
              class="desc-cancel-btn"
              onclick={cancelEditDescription}
              disabled={savingDesc}
            >
              Cancel
            </button>
          </div>
        {:else}
          <button class="desc-edit-btn" onclick={startEditDescription}
            >Edit</button
          >
        {/if}
      </div>
      {#if editingDesc}
        <textarea
          class="desc-textarea"
          bind:value={editDescBody}
          disabled={savingDesc}
        ></textarea>
        {#if descError}
          <span class="desc-error">{descError}</span>
        {/if}
      {:else}
        <Markdown text={body} />
      {/if}
      {#await loadConversation() then}
        <Reactions
          reactions={descriptionReactions}
          commentId={-1}
          onreaction={onDescriptionReaction}
        />
      {/await}
    </div>
  {/if}
  {#await loadConversation()}
    <p class="status">Loading comments...</p>
  {:then}
    <div class="comments">
      {#each threadedComments as c (c.id)}
        <Comment
          comment={c}
          replies={c.replies}
          onreply={replyToComment}
          onupdate={onUpdateComment}
          ondelete={onDeleteComment}
          {onreaction}
        />
      {/each}
      {#if threadedComments.length === 0}
        <p class="status">No comments yet</p>
      {/if}
    </div>
  {:catch error}
    <p class="status error">{error.message}</p>
  {/await}
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
</style>
