<script lang="ts">
  import { applyAction, deserialize } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import Markdown from "./Markdown.svelte";
  import Comment from "./Comment.svelte";
  import CommentInput from "./CommentInput.svelte";
  import type { CommentData } from "$lib/types/comment";

  interface ThreadedComment extends CommentData {
    replies: CommentData[];
  }

  let {
    body,
    comments,
  }: {
    body?: string | null;
    comments: CommentData[];
  } = $props();

  let threadedComments = $derived<ThreadedComment[]>(
    comments.map((c) => ({ ...c, replies: [] })),
  );

  async function submitAction(actionName: string, data: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) fd.set(k, v);
    const res = await fetch(`?/${actionName}`, { method: "POST", body: fd });
    const result = deserialize(await res.text());
    applyAction(result);
    if (result.type === "success") await invalidateAll();
  }

  async function onreply(_parentId: number, replyBody: string) {
    await submitAction("comment", { body: replyBody });
  }

  async function onUpdateComment(commentId: number, body: string) {
    await submitAction("updateComment", { commentId: String(commentId), body });
  }

  async function onDeleteComment(commentId: number) {
    await submitAction("deleteComment", { commentId: String(commentId) });
  }
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <h3>Description</h3>
      <Markdown text={body} />
    </div>
  {/if}

  <div class="comments">
    {#each threadedComments as c (c.id)}
      <Comment
        comment={c}
        replies={c.replies}
        onreply={onreply}
        onupdate={onUpdateComment}
        ondelete={onDeleteComment}
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
  .description h3 {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .comments {
    margin-bottom: 16px;
  }
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>
