import { error, fail } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import {
  listPRFiles,
  listInlineComments,
  createInlineComment,
  updateInlineComment,
  deleteInlineComment,
} from "$lib/server/github/pulls";
import type { PRFile, InlineCommentData } from "$lib/types/comment";
import type { Actions, PageServerLoad } from "./$types";

function mapFile(raw: Record<string, unknown>): PRFile {
  return {
    filename: raw.filename as string,
    status: raw.status as string,
    additions: raw.additions as number,
    deletions: raw.deletions as number,
    changes: raw.changes as number,
    patch: raw.patch as string | undefined,
  };
}

function mapInlineComment(raw: Record<string, unknown>): InlineCommentData {
  return {
    id: raw.id as number,
    body: (raw.body as string) ?? "",
    user: {
      login: (raw.user as { login?: string })?.login ?? "",
      avatarUrl: (raw.user as { avatar_url?: string })?.avatar_url ?? "",
    },
    createdAt: raw.created_at as string,
    path: raw.path as string,
    line: raw.line as number | null,
    originalLine: raw.original_line as number | null,
    inReplyToId: (raw.in_reply_to_id as number | null) ?? null,
  };
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);
  const { pr } = await parent();
  const headSha = (await pr).head.sha;

  const files: Promise<PRFile[]> = listPRFiles(token, owner, repo, number)
    .then((raw) => raw.map(mapFile))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  const inlineComments: Promise<InlineCommentData[]> = listInlineComments(
    token,
    owner,
    repo,
    number,
  )
    .then((raw) => raw.map(mapInlineComment))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { files, inlineComments, headSha };
};

export const actions: Actions = {
  createInlineComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const body = getFormValue(data, "body");
    const commitId = getFormValue(data, "commitId");
    const path = getFormValue(data, "path");
    const line = Number(data.get("line"));
    const startLine = data.get("startLine") ? Number(data.get("startLine")) : undefined;
    const inReplyTo = data.get("inReplyTo") ? Number(data.get("inReplyTo")) : undefined;
    if (!body || !commitId || !path || !line) return fail(400, { error: "Invalid input" });
    await createInlineComment(
      token,
      params.owner,
      params.repo,
      Number(params.number),
      body,
      commitId,
      path,
      line,
      startLine,
      inReplyTo,
    );
    return {};
  },
  updateInlineComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    const body = getFormValue(data, "body");
    if (!commentId || !body) return fail(400, { error: "Invalid input" });
    await updateInlineComment(token, params.owner, params.repo, commentId, body);
    return {};
  },
  deleteInlineComment: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const commentId = Number(data.get("commentId"));
    if (!commentId) return fail(400, { error: "Invalid input" });
    await deleteInlineComment(token, params.owner, params.repo, commentId);
    return {};
  },
};
