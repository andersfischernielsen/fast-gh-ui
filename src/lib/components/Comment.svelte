<script lang="ts">
  import Markdown from "./Markdown.svelte";
  import Reactions from "./Reactions.svelte";
  import {
    listCommentReactions,
    listReviewCommentReactions,
    mapReactions,
    getCurrentUser,
  } from "$lib/github/pulls";
  import type { ReactionData } from "$lib/types/comment";

  interface CommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    htmlUrl?: string;
    isReview?: boolean;
  }

  let {
    comment,
    replies = [],
    onreply,
    onupdate,
    ondelete,
    onreaction,
  }: {
    comment: CommentData;
    replies?: CommentData[];
    onreply?: (parentId: number, body: string) => Promise<void>;
    onupdate?: (commentId: number, body: string) => Promise<void>;
    ondelete?: (commentId: number) => Promise<void>;
    onreaction?: (
      commentId: number,
      emoji: string,
      remove: boolean,
      reactionId?: number,
    ) => Promise<void>;
  } = $props();

  let replyBody = $state("");
  let submitting = $state(false);
  let editing = $state(false);
  let editingReplyId = $state<number | null>(null);
  let editBody = $state("");

  let commentReactions = $state<ReactionData[]>([]);
  let replyReactions = $state<Map<number, ReactionData[]>>(new Map());

  async function loadReactions(): Promise<void> {
    const user = await getCurrentUser();
    const fetchFn = comment.isReview
      ? listReviewCommentReactions
      : listCommentReactions;
    const raw = await fetchFn(undefined, undefined, comment.id);
    commentReactions = mapReactions(
      raw as Record<string, unknown>[],
      user,
    );
    const repReactions = new Map<number, ReactionData[]>();
    for (const reply of replies) {
      const replyRaw = await listCommentReactions(
        undefined,
        undefined,
        reply.id,
      );
      repReactions.set(
        reply.id,
        mapReactions(replyRaw as Record<string, unknown>[], user),
      );
    }
    replyReactions = repReactions;
  }

  function formatDate(dateStr: string): string {
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

  async function handleEdit() {
    if (!editBody.trim() || submitting) return;
    submitting = true;
    try {
      if (onupdate) await onupdate(editingReplyId ?? comment.id, editBody);
      editing = false;
      editingReplyId = null;
    } finally {
      submitting = false;
    }
  }

  async function handleDelete(id: number) {
    if (submitting) return;
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;
    submitting = true;
    try {
      if (ondelete) await ondelete(id);
    } finally {
      submitting = false;
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || submitting) return;
    submitting = true;
    try {
      if (onreply) await onreply(comment.id, replyBody);
      replyBody = "";
    } finally {
      submitting = false;
    }
  }
</script>

<article class="comment">
  <div class="comment-header">
    <span class="user-info">
      <img
        class="avatar"
        src={comment.user.avatarUrl}
        alt=""
        width="20"
        height="20"
      />
      <strong>{comment.user.login}</strong>
    </span>
    <span class="header-right">
      {#if comment.htmlUrl}
        <a class="date" href={comment.htmlUrl} target="_blank" rel="noopener"
          >{formatDate(comment.createdAt)}</a
        >
      {:else}
        <span class="date">{formatDate(comment.createdAt)}</span>
      {/if}
      {#if onupdate || ondelete}
        <span class="actions">
          {#if onupdate}
            <button
              class="action-btn"
              onclick={() => {
                editing = true;
                editingReplyId = null;
                editBody = comment.body;
              }}>Edit</button
            >
          {/if}
          {#if ondelete}
            <button
              class="action-btn danger"
              onclick={() => handleDelete(comment.id)}>Delete</button
            >
          {/if}
        </span>
      {/if}
    </span>
  </div>
  <div class="comment-body">
    {#if editing && editingReplyId === null}
      <textarea bind:value={editBody} rows={3} disabled={submitting}></textarea>
      <div class="edit-actions">
        <button class="cancel" onclick={() => (editing = false)}>Cancel</button>
        <button
          class="submit"
          onclick={handleEdit}
          disabled={submitting || !editBody.trim()}>Save</button
        >
      </div>
    {:else}
      <Markdown text={comment.body} />
    {/if}
    {#await loadReactions()}
      <span class="reactions-loading"></span>
    {:then}
      {#if commentReactions.length > 0 || onreaction}
        <Reactions
          reactions={commentReactions}
          {onreaction}
          commentId={comment.id}
        />
      {/if}
    {/await}
  </div>
  {#if replies.length > 0}
    <div class="replies">
      {#each replies as reply (reply.id)}
        <article class="reply">
          <div class="reply-header">
            <span class="user-info">
              <img
                class="avatar"
                src={reply.user.avatarUrl}
                alt=""
                width="20"
                height="20"
              />
              <strong>{reply.user.login}</strong>
            </span>
            <span class="header-right">
              {#if reply.htmlUrl}
                <a
                  class="date"
                  href={reply.htmlUrl}
                  target="_blank"
                  rel="noopener">{formatDate(reply.createdAt)}</a
                >
              {:else}
                <span class="date">{formatDate(reply.createdAt)}</span>
              {/if}
              <span class="actions">
                <button
                  class="action-btn"
                  onclick={() => {
                    editing = true;
                    editingReplyId = reply.id;
                    editBody = reply.body;
                  }}>Edit</button
                >
                <button
                  class="action-btn danger"
                  onclick={() => handleDelete(reply.id)}>Delete</button
                >
              </span>
            </span>
          </div>
          <div class="reply-body">
            {#if editing && editingReplyId === reply.id}
              <textarea bind:value={editBody} rows={3} disabled={submitting}
              ></textarea>
              <div class="edit-actions">
                <button
                  class="cancel"
                  onclick={() => {
                    editing = false;
                    editingReplyId = null;
                  }}>Cancel</button
                >
                <button
                  class="submit"
                  onclick={handleEdit}
                  disabled={submitting || !editBody.trim()}>Save</button
                >
              </div>
            {:else}
              <Markdown text={reply.body} />
            {/if}
            {#await loadReactions() then}
              <Reactions
                reactions={replyReactions.get(reply.id) ?? []}
                {onreaction}
                commentId={reply.id}
              />
            {/await}
          </div>
        </article>
      {/each}
    </div>
  {/if}
  {#if onreply}
    <div class="reply-input">
      <textarea
        bind:value={replyBody}
        placeholder="Write a reply..."
        rows={2}
        disabled={submitting}
      ></textarea>
      <div class="reply-actions">
        <button
          class="reply-btn"
          onclick={handleReply}
          disabled={submitting || !replyBody.trim()}>Reply</button
        >
      </div>
    </div>
  {/if}
</article>

<style>
  .comment {
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    margin-bottom: 4px;
    overflow: hidden;
  }
  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    font-size: 12px;
    font-family: "SF Mono", Menlo, Monaco, monospace;
  }
  .avatar {
    border-radius: 50%;
    flex-shrink: 0;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .date {
    color: var(--text-secondary);
    font-size: 11px;
    text-decoration: none;
  }
  @media (max-width: 768px) {
    .date {
      display: none;
    }
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  .action-btn {
    background: none;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 1px 6px;
    font-family: inherit;
  }
  .action-btn:hover {
    color: var(--text-primary);
  }
  .action-btn.danger:hover {
    color: var(--text-danger);
  }
  .comment-body {
    padding: 12px 16px;
    font-size: 12px;
  }
  .comment-body textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .edit-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    margin-top: 8px;
  }
  .edit-actions button {
    padding: 4px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
  }
  .edit-actions .cancel {
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
  }
  .edit-actions .submit {
    border: 1px solid var(--btn-primary-bg);
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
  }
  .edit-actions .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .replies {
    padding-left: 16px;
    padding-bottom: 8px;
    background: var(--bg-secondary);
  }
  .reply {
    padding-bottom: 8px;
  }
  .reply:last-child {
    padding-bottom: 0;
  }
  .reply-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
    font-family: "SF Mono", Menlo, Monaco, monospace;
    border-bottom: 1px solid var(--border-primary);
    border-top: 1px solid var(--border-primary);
    padding-bottom: 6px;
    padding-top: 6px;
    padding-right: 6px;
  }
  .reply-header:first-child {
    margin-top: 0;
  }
  .reply-body {
    padding-left: 26px;
    padding-top: 8px;
    font-size: 12px;
  }
  .reply-body textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
      sans-serif;
    resize: vertical;
    box-sizing: border-box;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .reply-input {
    border-top: 1px solid var(--border-primary);
    padding: 10px 16px;
  }
  .reply-input textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
      sans-serif;
    resize: vertical;
    box-sizing: border-box;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .reply-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
  .reply-btn {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid var(--btn-primary-bg);
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    font-size: 12px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
      sans-serif;
    cursor: pointer;
  }
  .reply-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .comment-body :global(.markdown),
  .reply-body :global(.markdown) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
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
