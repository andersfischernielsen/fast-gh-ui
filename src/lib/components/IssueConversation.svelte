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
    listIssueReactions,
    createIssueCommentReaction,
    deleteIssueCommentReaction,
    createIssueReaction,
    deleteIssueReaction,
    getCurrentUser,
    mapReactions,
  } from "$lib/github/pulls";
  import type { ReactionData } from "$lib/types/comment";

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

  let descriptionReactions = $state<ReactionData[]>([]);

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
    const [issueComments, rawDescReactions] = await Promise.all([
      listPRComments(owner, repo, number),
      listIssueReactions(owner, repo, number),
    ]);
    const user = await getCurrentUser();
    descriptionReactions = mapReactions(
      rawDescReactions as Record<string, unknown>[],
      user,
    );
    threadedComments = (issueComments as Record<string, unknown>[])
      .map(toCommentData)
      .map((c) => ({
        ...c,
        replies: [],
      }));
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

  async function onreaction(
    commentId: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    if (remove && reactionId) {
      await deleteIssueCommentReaction(
        owner,
        repo,
        commentId,
        reactionId,
      );
    } else {
      await createIssueCommentReaction(owner, repo, commentId, emoji);
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
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <h3>Description</h3>
      <Markdown text={body} />
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
          {owner}
          {repo}
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
    padding: 16px 0;
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>
