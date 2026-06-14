import { error, fail } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import {
  listPRComments,
  listInlineComments,
  createPRComment,
  createInlineComment,
  updatePRComment,
  updateInlineComment,
  deletePRComment,
  deleteInlineComment,
  updatePullRequest,
} from "$lib/server/github/pulls";
import type { CommentData, ReviewCommentData } from "$lib/types/comment";
import type { Actions, PageServerLoad } from "./$types";

function mapComment(raw: Record<string, unknown>): CommentData {
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

function mapReviewComment(raw: Record<string, unknown>): ReviewCommentData {
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
    commitId: (raw.commit_id as string) ?? "",
    path: (raw.path as string) ?? "",
    line: (raw.line as number) ?? 1,
    originalLine: (raw.original_line as number | null) ?? null,
    inReplyToId: (raw.in_reply_to_id as number | null) ?? null,
  };
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);
  const { pr } = await parent();

  const comments: Promise<CommentData[]> = listPRComments(token, owner, repo, number)
    .then((raw) => raw.map(mapComment))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  const reviewComments: Promise<ReviewCommentData[]> = listInlineComments(
    token,
    owner,
    repo,
    number,
  )
    .then((raw) => raw.map(mapReviewComment))
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
};
