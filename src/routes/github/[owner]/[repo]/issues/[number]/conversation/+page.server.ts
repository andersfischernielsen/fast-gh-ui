import { error, fail } from "@sveltejs/kit";
import { githubErrorMessage, getCurrentUser } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import {
  listPRComments,
  listCommentReactions,
  createPRComment,
  updatePRComment,
  deletePRComment,
  createIssueCommentReaction,
  deleteIssueCommentReaction,
  createIssueReaction,
  deleteIssueReaction,
} from "$lib/server/github/pulls";
import type { CommentData, ReactionData } from "$lib/types/comment";
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

export const load: PageServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

  const currentUser = await getCurrentUser(token);

  const comments: Promise<CommentData[]> = listPRComments(token, owner, repo, number)
    .then((raw) => raw.map((c) => mapComment(c, token, owner, repo, currentUser)))
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
  react: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const emoji = getFormValue(data, "emoji");
    const remove = data.get("remove") === "true";
    const reactionId = data.get("reactionId") ? Number(data.get("reactionId")) : undefined;
    if (!commentId || !emoji) return fail(400, { error: "Invalid input" });
    if (remove && reactionId) {
      await deleteIssueCommentReaction(token, params.owner, params.repo, commentId, reactionId);
    } else {
      await createIssueCommentReaction(token, params.owner, params.repo, commentId, emoji);
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
