import { error, fail } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import {
  listPRComments,
  listCommentReactions,
  createPRComment,
  updatePRComment,
  deletePRComment,
} from "$lib/server/github/pulls";
import type { CommentData, ReactionData } from "$lib/types/comment";
import type { Actions, PageServerLoad } from "./$types";

function mapReactions(raw: Record<string, unknown>[]): ReactionData[] {
  const grouped = new Map<string, string[]>();
  for (const r of raw) {
    const emoji = (r.content as string) ?? "";
    const author = (r.user as { login?: string } | undefined)?.login ?? "";
    if (!emoji) continue;
    const list = grouped.get(emoji) ?? [];
    list.push(author);
    grouped.set(emoji, list);
  }
  return Array.from(grouped.entries()).map(([emoji, authors]) => ({ emoji, authors }));
}

function mapComment(
  raw: Record<string, unknown>,
  token: string,
  owner: string,
  repo: string,
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
      .then(mapReactions)
      .catch(() => []),
  };
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

  const comments: Promise<CommentData[]> = listPRComments(token, owner, repo, number)
    .then((raw) => raw.map((c) => mapComment(c, token, owner, repo)))
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
    await createPRComment(token, params.owner, params.repo, Number(params.number), body.trim());
    return {};
  },
  updateComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const body = getFormValue(data, "body");
    if (!commentId || !body.trim()) return fail(400, { error: "Invalid input" });
    await updatePRComment(token, params.owner, params.repo, commentId, body.trim());
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
