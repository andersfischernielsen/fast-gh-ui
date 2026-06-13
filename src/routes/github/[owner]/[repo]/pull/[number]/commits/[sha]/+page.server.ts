import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { fetchCommit } from "$lib/server/github/pulls";
import type { CommitDetail } from "$lib/types/commit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo, sha } = params;

  const commit: Promise<CommitDetail> = fetchCommit(token, owner, repo, sha)
    .then((raw) => ({
      sha: raw.sha,
      message: (raw.commit?.message ?? "").split("\n")[0],
      author: {
        login: raw.author?.login ?? raw.commit?.author?.name ?? "unknown",
        avatarUrl: raw.author?.avatar_url ?? "",
      },
      date: raw.commit?.author?.date ?? "",
      files: (raw.files ?? []).map((f) => ({
        filename: f.filename ?? "",
        status: f.status ?? "",
        additions: f.additions ?? 0,
        deletions: f.deletions ?? 0,
        changes: f.changes ?? 0,
        patch: f.patch ?? undefined,
      })),
    }))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { commit };
};
