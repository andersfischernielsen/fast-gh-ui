<script lang="ts">
  import Markdown from "./Markdown.svelte";

  interface CommentThread {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    replies: CommentThread[];
  }

  let {
    thread,
    onupdate,
    ondelete,
    onreply,
  }: {
    thread: CommentThread;
    onupdate?: (commentId: number, body: string) => Promise<void>;
    ondelete?: (commentId: number) => Promise<void>;
    onreply?: (commentId: number, body: string) => Promise<void>;
  } = $props();

  let editing = $state(false);
  let editingReplyId = $state<number | null>(null);
  let editBody = $state("");
  let replyBody = $state("");
  let submitting = $state(false);

  async function handleEdit() {
    if (!editBody.trim() || submitting) return;
    submitting = true;
    try {
      if (onupdate) await onupdate(editingReplyId ?? thread.id, editBody);
      editing = false;
      editingReplyId = null;
    } finally {
      submitting = false;
    }
  }

  async function handleDelete() {
    if (submitting) return;
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;
    submitting = true;
    try {
      if (ondelete) await ondelete(thread.id);
    } finally {
      submitting = false;
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || submitting) return;
    submitting = true;
    try {
      if (onreply) await onreply(thread.id, replyBody);
      replyBody = "";
    } finally {
      submitting = false;
    }
  }
</script>

<div class="inline-comment">
  <div class="thread">
    <div class="comment-bubble root-bubble">
      <div class="bubble-header">
        <span class="user-info">
          <img class="avatar" src={thread.user.avatarUrl} alt="" width="20" height="20" />
          <strong>{thread.user.login}</strong>
        </span>
        <span class="header-right">
          <span class="date">{thread.createdAt}</span>
          {#if onupdate || ondelete}
            <span class="actions">
              {#if onupdate}
                <button
                  class="action-btn"
                  onclick={() => {
                    editing = true;
                    editingReplyId = null;
                    editBody = thread.body;
                  }}>Edit</button
                >
              {/if}
              {#if ondelete}
                <button class="action-btn danger" onclick={handleDelete}
                  >Delete</button
                >
              {/if}
            </span>
          {/if}
        </span>
      </div>
      <div class="bubble-body">
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
          <Markdown text={thread.body} />
        {/if}
      </div>
      {#each thread.replies as reply (reply.id)}
        <div class="bubble-body reply-body">
          <div class="reply-header">
            <span class="user-info">
              <img class="avatar" src={reply.user.avatarUrl} alt="" width="20" height="20" />
              <strong>{reply.user.login}</strong>
            </span>
            <span class="header-right">
              <span class="date">{reply.createdAt}</span>
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
                  onclick={async () => {
                    if (submitting) return;
                    if (
                      !window.confirm(
                        "Are you sure you want to delete this comment?",
                      )
                    )
                      return;
                    submitting = true;
                    try {
                      if (ondelete) await ondelete(reply.id);
                    } finally {
                      submitting = false;
                    }
                  }}>Delete</button
                >
              </span>
            </span>
          </div>
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
      {/each}
      {#if onreply}
        <div class="reply-box">
          <textarea
            bind:value={replyBody}
            placeholder="Write a reply..."
            rows={2}
            disabled={submitting}
          ></textarea>
          <button
            class="reply-btn"
            onclick={handleReply}
            disabled={submitting || !replyBody.trim()}>Reply</button
          >
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .inline-comment {
    padding: 4px;
  }
  .root-bubble {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    overflow: hidden;
  }
  .bubble-header {
    padding: 6px 10px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .avatar {
    border-radius: 50%;
    flex-shrink: 0;
  }
  .bubble-body {
    padding: 6px 10px;
    font-size: 13px;
  }
  .reply-body {
    border-top: 1px solid #f0f0f0;
  }
  .reply-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
    font-size: 12px;
    gap: 6px;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .date {
    color: #656d76;
    font-size: 11px;
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
  }
  .action-btn:hover {
    color: #1f2328;
  }
  .action-btn.danger:hover {
    color: #cf222e;
  }
  .bubble-body :global(.markdown) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }
  .bubble-body textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
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

  .reply-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
    border-top: 1px solid #d0d7de;
  }
  .reply-box textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
  }
  .reply-btn {
    align-self: flex-end;
    padding: 6px 16px;
    border: 1px solid #1f883d;
    border-radius: 6px;
    background: #1f883d;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  .reply-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
