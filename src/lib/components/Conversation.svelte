<script lang="ts">
  import { applyAction, deserialize } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import Markdown from "./Markdown.svelte";
  import Comment from "./Comment.svelte";
  import CommentInput from "./CommentInput.svelte";
  import Reactions from "./Reactions.svelte";
  import type { CommentData, ReactionData, ReviewCommentData } from "$lib/types/comment";

  interface ThreadedComment extends CommentData {
    replies: CommentData[];
    isReview?: boolean;
    commitId?: string;
    path?: string;
    line?: number;
  }

  let {
    body,
    comments,
    reviewComments,
    descriptionReactions,
  }: {
    body: string | null;
    comments: CommentData[];
    reviewComments: ReviewCommentData[];
    descriptionReactions?: Promise<ReactionData[]>;
  } = $props();

  let editingDesc = $state(false);
  let editDescBody = $state("");
  let savingDesc = $state(false);

  let reviewData = $derived.by(() => {
    const replyMap = new Map<number, ReviewCommentData[]>();
    const rootReviews: ReviewCommentData[] = [];
    const ids = new Set<number>();

    for (const rc of reviewComments) {
      ids.add(rc.id);
      if (rc.inReplyToId) {
        const list = replyMap.get(rc.inReplyToId) ?? [];
        list.push(rc);
        replyMap.set(rc.inReplyToId, list);
      } else {
        rootReviews.push(rc);
      }
    }

    const roots: ThreadedComment[] = rootReviews.map((rc) => {
      const childReplies = replyMap.get(rc.id) ?? [];
      for (const cr of childReplies) ids.add(cr.id);
      return {
        ...rc,
        replies: childReplies,
        isReview: true,
        commitId: rc.commitId,
        path: rc.path,
        line: rc.line,
      };
    });

    return { roots, ids };
  });

  let threadedComments = $derived<ThreadedComment[]>(
    [...comments.map((c) => ({ ...c, replies: [] })), ...reviewData.roots].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  );

  let reviewIds = $derived(reviewData.ids);

  async function submitAction(
    actionName: string,
    data: Record<string, string>,
  ) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) fd.set(k, v);
    const res = await fetch(`?/${actionName}`, { method: "POST", body: fd });
    const result = deserialize(await res.text());
    applyAction(result);
    if (result.type === "success") await invalidateAll();
  }

  async function onreply(parentId: number, replyBody: string) {
    const parent = threadedComments.find((tc) => tc.id === parentId);
    if (parent?.isReview && parent.commitId && parent.path) {
      await submitAction("reply", {
        body: replyBody,
        commitId: parent.commitId,
        path: parent.path,
        line: String(parent.line ?? 1),
        inReplyTo: String(parentId),
      });
    } else {
      await submitAction("comment", { body: replyBody });
    }
  }

  async function onUpdateComment(commentId: number, body: string) {
    await submitAction("updateComment", {
      commentId: String(commentId),
      body,
      isReview: reviewIds.has(commentId) ? "true" : "false",
    });
  }

  async function onDeleteComment(commentId: number) {
    await submitAction("deleteComment", {
      commentId: String(commentId),
      isReview: reviewIds.has(commentId) ? "true" : "false",
    });
  }

  async function onreaction(
    commentId: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    await submitAction("react", {
      commentId: String(commentId),
      emoji,
      remove: String(remove),
      reactionId: reactionId ? String(reactionId) : "",
      isReview: reviewIds.has(commentId) ? "true" : "false",
    });
  }

  async function onDescriptionReaction(
    _commentId: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    await submitAction("reactDescription", {
      emoji,
      remove: String(remove),
      reactionId: reactionId ? String(reactionId) : "",
    });
  }

  function startEditDescription() {
    editDescBody = body ?? "";
    editingDesc = true;
  }

  function cancelEditDescription() {
    editingDesc = false;
  }
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <div class="desc-header">
        <h3>Description</h3>
        {#if editingDesc}
          <form
            method="POST"
            action="?/updatePR"
            onsubmit={async (e) => {
              e.preventDefault();
              savingDesc = true;
              const fd = new FormData(e.currentTarget);
              const res = await fetch("?/updatePR", {
                method: "POST",
                body: fd,
              });
              const result = deserialize(await res.text());
              applyAction(result);
              if (result.type === "success") {
                await invalidateAll();
                editingDesc = false;
              }
              savingDesc = false;
            }}
            class="desc-edit-form"
          >
            <div class="desc-edit-actions">
              <button type="submit" class="desc-save-btn" disabled={savingDesc}>
                {savingDesc ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                class="desc-cancel-btn"
                onclick={cancelEditDescription}
                disabled={savingDesc}
              >
                Cancel
              </button>
            </div>
            <textarea
              class="desc-textarea"
              name="body"
              bind:value={editDescBody}
              disabled={savingDesc}
            ></textarea>
          </form>
        {:else}
          <button class="desc-edit-btn" onclick={startEditDescription}
            >Edit</button
          >
        {/if}
      </div>
      {#if !editingDesc}
        <Markdown text={body} />
        {#if descriptionReactions}
          {#await descriptionReactions}
            <span class="reactions-loading"></span>
          {:then reactions}
            <Reactions {reactions} commentId={-1} onreaction={onDescriptionReaction} />
          {:catch}
            <span class="reactions-loading"></span>
          {/await}
        {/if}
      {/if}
    </div>
  {/if}

  <div class="comments">
    {#each threadedComments as c (c.id)}
      <Comment
        comment={c}
        replies={c.replies}
        {onreply}
        onupdate={onUpdateComment}
        ondelete={onDeleteComment}
        {onreaction}
      />
    {/each}
    {#if threadedComments.length === 0}
      <p class="status">No comments yet</p>
    {/if}
  </div>

  <CommentInput action="?/comment" />
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
  .desc-edit-form {
    display: contents;
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
  .comments {
    margin-bottom: 16px;
  }
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .reactions-loading {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-top: 8px;
    border: 2px solid var(--border-primary);
    border-top-color: var(--text-secondary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
