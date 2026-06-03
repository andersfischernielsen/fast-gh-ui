<script lang="ts">
  import Markdown from "./Markdown.svelte";

  interface CommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    htmlUrl: string;
  }

  let {
    comment,
    replies = [],
    onreply,
    onupdate,
    ondelete,
  }: {
    comment: CommentData;
    replies?: CommentData[];
    onreply?: (parentId: number, body: string) => Promise<void>;
    onupdate?: (commentId: number, body: string) => Promise<void>;
    ondelete?: (commentId: number) => Promise<void>;
  } = $props();

  let showReply = $state(false);
  let replyBody = $state("");
  let submitting = $state(false);
  let editing = $state(false);
  let editingReplyId = $state<number | null>(null);
  let editBody = $state("");

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
      showReply = false;
    } finally {
      submitting = false;
    }
  }
</script>

<article class="comment">
  <div class="comment-header">
    <img
      class="avatar"
      src={comment.user.avatarUrl}
      alt=""
      width="32"
      height="32"
    />
    <strong>{comment.user.login}</strong>
    <a class="date" href={comment.htmlUrl} target="_blank" rel="noopener"
      >{formatDate(comment.createdAt)}</a
    >
    <span class="header-right">
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
            <button class="action-btn danger" onclick={() => handleDelete(comment.id)}
              >Delete</button
            >
          {/if}
        </span>
      {/if}
    </span>
  </div>
  <div class="comment-body">
    {#if editing && editingReplyId === null}
      <textarea bind:value={editBody} rows={3} disabled={submitting}
      ></textarea>
      <div class="edit-actions">
        <button class="cancel" onclick={() => (editing = false)}
          >Cancel</button
        >
        <button
          class="submit"
          onclick={handleEdit}
          disabled={submitting || !editBody.trim()}>Save</button
        >
      </div>
    {:else}
      <Markdown text={comment.body} />
    {/if}
  </div>
  {#if replies.length > 0}
    <div class="replies">
      {#each replies as reply (reply.id)}
        <article class="reply">
          <div class="reply-header">
            <img
              class="avatar"
              src={reply.user.avatarUrl}
              alt=""
              width="24"
              height="24"
            />
            <strong>{reply.user.login}</strong>
            <a class="date" href={reply.htmlUrl} target="_blank" rel="noopener"
              >{formatDate(reply.createdAt)}</a
            >
            <span class="header-right">
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
          </div>
        </article>
      {/each}
    </div>
  {/if}
  {#if onreply}
    {#if showReply}
      <div class="reply-input">
        <textarea
          bind:value={replyBody}
          placeholder="Write a reply..."
          rows={3}
          disabled={submitting}
        ></textarea>
        <div class="reply-actions">
          <button
            class="cancel-btn"
            onclick={() => {
              showReply = false;
              replyBody = "";
            }}>Cancel</button
          >
          <button
            class="reply-btn"
            onclick={handleReply}
            disabled={submitting || !replyBody.trim()}>Reply</button
          >
        </div>
      </div>
    {:else}
      <div class="reply-toggle">
        <button class="reply-link" onclick={() => (showReply = true)}
          >Reply</button
        >
      </div>
    {/if}
  {/if}
</article>

<style>
  .comment {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .comment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-size: 14px;
  }
  .avatar {
    border-radius: 50%;
  }
  .date {
    font-weight: 400;
    color: #656d76;
    font-size: 12px;
  }
  .header-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  .action-btn {
    background: none;
    border: none;
    font-size: 11px;
    cursor: pointer;
    color: #656d76;
    padding: 1px 4px;
    font-family: inherit;
  }
  .action-btn:hover {
    color: #1f2328;
  }
  .action-btn.danger:hover {
    color: #cf222e;
  }
  .comment-body {
    padding: 12px 16px;
    font-size: 14px;
  }
  .comment-body textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
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
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
  }
  .edit-actions .cancel {
    border: 1px solid #d0d7de;
    background: #fff;
  }
  .edit-actions .submit {
    border: 1px solid #1f883d;
    background: #1f883d;
    color: #fff;
  }
  .edit-actions .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .replies {
    border-top: 1px solid #d0d7de;
    padding: 8px 16px;
    background: #f6f8fa;
  }
  .reply {
    margin-bottom: 8px;
  }
  .reply:last-child {
    margin-bottom: 0;
  }
  .reply-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .reply-body {
    padding-left: 30px;
    font-size: 14px;
  }
  .reply-body textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }
  .reply-toggle {
    border-top: 1px solid #d0d7de;
    padding: 6px 16px;
  }
  .reply-link {
    background: none;
    border: none;
    color: #0969da;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    padding: 0;
  }
  .reply-link:hover {
    text-decoration: underline;
  }
  .reply-input {
    border-top: 1px solid #d0d7de;
    padding: 10px 16px;
  }
  .reply-input textarea {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }
  .reply-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
  .reply-actions button {
    padding: 5px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
  }
  .cancel-btn {
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #1f2328;
  }
  .cancel-btn:hover {
    background: #eaeef2;
  }
  .reply-btn {
    background: #1f883d;
    border: 1px solid #1f883d;
    color: #fff;
    font-weight: 500;
  }
  .reply-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
