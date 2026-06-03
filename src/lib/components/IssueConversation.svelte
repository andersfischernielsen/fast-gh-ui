<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import Markdown from "./Markdown.svelte";
  import Comment from "./Comment.svelte";
  import CommentInput from "./CommentInput.svelte";
  import {
    listPRComments,
    createPRComment,
    updatePRComment,
    deletePRComment,
  } from "$lib/github/pulls";

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
  }

  let { body }: { body: string | null } = $props();

  let threadedComments = $state<ThreadedComment[]>([]);
  let loading = $state(true);

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

  onMount(async () => {
    try {
      const issueComments = await listPRComments(owner, repo, number);
      threadedComments = (issueComments as Record<string, unknown>[])
        .map(toCommentData)
        .map((c) => ({
          ...c,
          replies: [],
        }));
    } finally {
      loading = false;
    }
  });

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
    const raw = await createPRComment(owner, repo, number, replyBody);
    const reply: CommentData = toCommentData(
      raw as unknown as Record<string, unknown>,
    );
    threadedComments = threadedComments.map((tc) =>
      tc.id === parentId ? { ...tc, replies: [...tc.replies, reply] } : tc,
    );
  }

  async function onUpdateComment(commentId: number, body: string) {
    await updatePRComment(owner, repo, commentId, body);
    threadedComments = threadedComments.map((tc) => {
      if (tc.id === commentId) return { ...tc, body };
      tc.replies = tc.replies.map((r) =>
        r.id === commentId ? { ...r, body } : r,
      );
      return tc;
    });
  }

  async function onDeleteComment(commentId: number) {
    await deletePRComment(owner, repo, commentId);
    threadedComments = threadedComments
      .map((tc) => {
        tc.replies = tc.replies.filter((r) => r.id !== commentId);
        return tc;
      })
      .filter((tc) => tc.id !== commentId);
  }
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <h3>Description</h3>
      <Markdown text={body} />
    </div>
  {/if}
  {#if loading}
    <p class="status">Loading comments...</p>
  {:else}
    <div class="comments">
      {#each threadedComments as c (c.id)}
        <Comment
          comment={c}
          replies={c.replies}
          onreply={replyToComment}
          onupdate={onUpdateComment}
          ondelete={onDeleteComment}
        />
      {/each}
      {#if threadedComments.length === 0}
        <p class="status">No comments yet</p>
      {/if}
    </div>
  {/if}
  <CommentInput onsubmit={postComment} />
</div>

<style>
  .conversation {
    padding: 24px;
  }
  .description {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  .description h3 {
    font-size: 12px;
    color: #656d76;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .comments {
    margin-bottom: 16px;
  }
  .status {
    padding: 16px 0;
    color: #656d76;
    font-size: 12px;
  }
</style>
