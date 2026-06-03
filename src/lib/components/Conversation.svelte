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
    listInlineComments,
    createInlineComment,
    updateInlineComment,
    deleteInlineComment,
  } from "$lib/github/pulls";

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
      const [issueComments, reviewComments] = await Promise.all([
        listPRComments(owner, repo, number),
        listInlineComments(owner, repo, number),
      ]);

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
        const childReplies = replyMap.get(id) ?? [];
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
