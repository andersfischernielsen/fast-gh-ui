import { error, fail } from "@sveltejs/kit";
import { githubErrorMessage, getCurrentUser } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import {
  listPRComments,
  listInlineComments,
  listCommentReactions,
  listReviewCommentReactions,
  createPRComment,
  createInlineComment,
  updatePRComment,
  updateInlineComment,
  deletePRComment,
  deleteInlineComment,
  updatePullRequest,
  createIssueCommentReaction,
  deleteIssueCommentReaction,
  createReviewCommentReaction,
  deleteReviewCommentReaction,
  createIssueReaction,
  deleteIssueReaction,
} from "$lib/server/github/pulls";
import type { CommentData, ReactionData, ReviewCommentData } from "$lib/types/comment";
import type { Actions, PageServerLoad } from "./$types";

function mapReactions(raw: Record<string, unknown>[], currentUser: string): ReactionData[] {
  const grouped = new Map<string, { authors: string[]; userReactionId?: number }>();
  for (const r of raw) {
    const emoji = (r.content as string) ?? "";
    const author = (r.user as { login?: string } | undefined)?.login ?? "";
    const reactionId = r.id as number;
    if (!emoji) continue;
    const entry = grouped.get(emoji) ?? { authors: [] };
    entry.authors.push(author);
    if (author === currentUser) {
      entry.userReactionId = reactionId;
    }
    grouped.set(emoji, entry);
  }
  return Array.from(grouped.entries()).map(([emoji, { authors, userReactionId }]) => ({
    emoji,
    authors,
    userReactionId,
  }));
}

function mapComment(
  raw: Record<string, unknown>,
  token: string,
  owner: string,
  repo: string,
  currentUser: string,
): CommentData {
  const id = raw.id as number;
  return {
    id,
    body: (raw.body as string) ?? "",
    user: {
      login: (raw.user as { login?: string })?.login ?? "",
      avatarUrl: (raw.user as { avatar_url?: string })?.avatar_url ?? "",
    },
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    htmlUrl: raw.html_url as string,
    reactions: listCommentReactions(token, owner, repo, id)
      .then((r) => mapReactions(r, currentUser))
      .catch(() => []),
  };
}

function mapReviewComment(
  raw: Record<string, unknown>,
  token: string,
  owner: string,
  repo: string,
  currentUser: string,
): ReviewCommentData {
  const id = raw.id as number;
  return {
    id,
    body: (raw.body as string) ?? "",
    user: {
      login: (raw.user as { login?: string })?.login ?? "",
      avatarUrl: (raw.user as { avatar_url?: string })?.avatar_url ?? "",
    },
    createdAt: raw.created_at as string,
    updatedAt: raw.updated_at as string,
    htmlUrl: raw.html_url as string,
    commitId: (raw.commit_id as string) ?? "",
    path: (raw.path as string) ?? "",
    line: (raw.line as number) ?? 1,
    originalLine: (raw.original_line as number | null) ?? null,
    inReplyToId: (raw.in_reply_to_id as number | null) ?? null,
    reactions: listReviewCommentReactions(token, owner, repo, id)
      .then((r) => mapReactions(r, currentUser))
      .catch(() => []),
  };
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);
  const { pr } = await parent();
  const currentUser = await getCurrentUser(token);

  const comments: Promise<CommentData[]> = listPRComments(token, owner, repo, number)
    .then((raw) => raw.map((c) => mapComment(c, token, owner, repo, currentUser)))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  const reviewComments: Promise<ReviewCommentData[]> = listInlineComments(
    token,
    owner,
    repo,
    number,
  )
    .then((raw) => raw.map((c) => mapReviewComment(c, token, owner, repo, currentUser)))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { comments, reviewComments, pr };
};

export const actions: Actions = {
  comment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const body = getFormValue(data, "body");
    if (!body.trim()) return fail(400, { error: "Comment body is required" });
    await createPRComment(token, params.owner, params.repo, Number(params.number), body.trim());
    return {};
  },
  reply: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const body = getFormValue(data, "body");
    const commitId = getFormValue(data, "commitId");
    const path = getFormValue(data, "path");
    const line = data.get("line") ? Number(data.get("line")) : undefined;
    const inReplyTo = data.get("inReplyTo") ? Number(data.get("inReplyTo")) : undefined;
    if (!body.trim() || !commitId || !path || !line || !inReplyTo) {
      return fail(400, { error: "Invalid input" });
    }
    await createInlineComment(
      token,
      params.owner,
      params.repo,
      Number(params.number),
      body.trim(),
      commitId,
      path,
      line,
      undefined,
      inReplyTo,
    );
    return {};
  },
  updateComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const body = getFormValue(data, "body");
    const isReview = data.get("isReview") === "true";
    if (!commentId || !body.trim()) return fail(400, { error: "Invalid input" });
    if (isReview) {
      await updateInlineComment(token, params.owner, params.repo, commentId, body.trim());
    } else {
      await updatePRComment(token, params.owner, params.repo, commentId, body.trim());
    }
    return {};
  },
  deleteComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const isReview = data.get("isReview") === "true";
    if (!commentId) return fail(400, { error: "Invalid input" });
    if (isReview) {
      await deleteInlineComment(token, params.owner, params.repo, commentId);
    } else {
      await deletePRComment(token, params.owner, params.repo, commentId);
    }
    return {};
  },
  updatePR: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const title = getFormValue(data, "title");
    const body = getFormValue(data, "body");
    await updatePullRequest(token, params.owner, params.repo, Number(params.number), {
      title: title || undefined,
      body: body || undefined,
    });
    return {};
  },
  react: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const emoji = getFormValue(data, "emoji");
    const isReview = data.get("isReview") === "true";
    const remove = data.get("remove") === "true";
    const reactionId = data.get("reactionId") ? Number(data.get("reactionId")) : undefined;
    if (!commentId || !emoji) return fail(400, { error: "Invalid input" });
    if (remove && reactionId) {
      if (isReview) {
        await deleteReviewCommentReaction(token, params.owner, params.repo, commentId, reactionId);
      } else {
        await deleteIssueCommentReaction(token, params.owner, params.repo, commentId, reactionId);
      }
    } else {
      if (isReview) {
        await createReviewCommentReaction(token, params.owner, params.repo, commentId, emoji);
      } else {
        await createIssueCommentReaction(token, params.owner, params.repo, commentId, emoji);
      }
    }
    return {};
  },
  reactDescription: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const emoji = getFormValue(data, "emoji");
    const remove = data.get("remove") === "true";
    const reactionId = data.get("reactionId") ? Number(data.get("reactionId")) : undefined;
    if (!emoji) return fail(400, { error: "Invalid input" });
    if (remove && reactionId) {
      await deleteIssueReaction(
        token,
        params.owner,
        params.repo,
        Number(params.number),
        reactionId,
      );
    } else {
      await createIssueReaction(token, params.owner, params.repo, Number(params.number), emoji);
    }
    return {};
  },
};
