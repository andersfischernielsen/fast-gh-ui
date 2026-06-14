import { error, fail } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import {
  listPRComments,
  createPRComment,
  updatePRComment,
  deletePRComment,
} from "$lib/server/github/pulls";
import type { CommentData } from "$lib/types/comment";
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

export const load: PageServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

  const comments: Promise<CommentData[]> = listPRComments(
    token,
    owner,
    repo,
    number,
  )
    .then((raw) => raw.map(mapComment))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { comments };
};

export const actions: Actions = {
  comment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const body = getFormValue(data, "body");
    if (!body.trim()) return fail(400, { error: "Comment body is required" });
    await createPRComment(
      token,
      params.owner,
      params.repo,
      Number(params.number),
      body.trim(),
    );
    return {};
  },
  updateComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const body = getFormValue(data, "body");
    if (!commentId || !body.trim())
      return fail(400, { error: "Invalid input" });
    await updatePRComment(
      token,
      params.owner,
      params.repo,
      commentId,
      body.trim(),
    );
    return {};
  },
  deleteComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    if (!commentId) return fail(400, { error: "Invalid input" });
    await deletePRComment(token, params.owner, params.repo, commentId);
    return {};
  },
};
