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
    createIssueCommentReaction,
    deleteIssueCommentReaction,
    createIssueReaction,
    deleteIssueReaction,
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
  let loadError = $state<string | null>(null);
  let currentPage = $state(1);
  let hasMore = $state(true);
  let loadingMore = $state(false);

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
    return events
      .filter((e) => e.event === "commented")
      .map((e) => ({ ...toCommentData(e), replies: [] }));
  }

  async function loadConversation(o: string, r: string, n: number): Promise<void> {
    loading = true;
    loadError = null;
    threadedComments = [];

    try {
      const events = await listPRTimeline(o, r, n, 1);
      threadedComments = mapTimelineEvents(events as Record<string, unknown>[]);
      hasMore = (events as unknown[]).length === 20;
      currentPage = 2;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load comments";
    } finally {
      loading = false;
    }
  }

  async function loadMore(): Promise<void> {
    if (loadingMore || !hasMore) return;
    loadingMore = true;
    try {
      const events = await listPRTimeline(owner, repo, number, currentPage);
      threadedComments = [
        ...threadedComments,
        ...mapTimelineEvents(events as Record<string, unknown>[]),
      ];
      hasMore = (events as unknown[]).length === 20;
      currentPage++;
    } catch {
      // silently ignore — user can scroll again to retry
    } finally {
      loadingMore = false;
    }
  }

  function lazySentinel(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(node);
    return { destroy() { observer.disconnect(); } };
  }

  $effect(() => {
    const o = owner;
    const r = repo;
    const n = number;
    loadConversation(o, r, n);
  });

  async function postComment(commentBody: string) {
    const raw = await createPRComment(owner, repo, number, commentBody);
    threadedComments = [
      ...threadedComments,
      { ...toCommentData(raw as Record<string, unknown>), replies: [] },
    ];
  }

  async function replyToComment(parentId: number, replyBody: string) {
    const raw = await createPRComment(owner, repo, number, replyBody);
    const reply = toCommentData(raw as Record<string, unknown>);
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
      await deleteIssueCommentReaction(owner, repo, commentId, reactionId);
    } else {
      await createIssueCommentReaction(owner, repo, commentId, emoji);
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
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <h3>Description</h3>
      <Markdown text={body} />
      <Reactions
        {owner}
        {repo}
        issueNumber={number}
        onreaction={onDescriptionReaction}
      />
    </div>
  {/if}

  {#if loading}
    <p class="status">Loading comments...</p>
  {:else if loadError}
    <p class="status error">{loadError}</p>
  {:else}
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
      {#if threadedComments.length === 0 && !hasMore}
        <p class="status">No comments yet</p>
      {/if}
    </div>
    {#if loadingMore}
      <p class="status">Loading more...</p>
    {/if}
    {#if hasMore && !loadingMore}
      <div use:lazySentinel></div>
    {/if}
  {/if}

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
  .status.error {
    color: var(--text-danger);
  }
</style>
