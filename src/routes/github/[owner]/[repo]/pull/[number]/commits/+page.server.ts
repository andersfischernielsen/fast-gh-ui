import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { listPRCommits } from "$lib/server/github/pulls";
import type { PRCommitData } from "$lib/types/commit";
import type { PageServerLoad } from "./$types";

export type { PRCommitData };

function mapCommit(raw: Record<string, unknown>): PRCommitData {
  return {
    sha: raw.sha as string,
    author: raw.author
      ? {
          login: (raw.author as { login?: string })?.login ?? "",
          avatarUrl: (raw.author as { avatar_url?: string })?.avatar_url ?? "",
        }
      : null,
    commit: {
      message: (raw.commit as { message?: string })?.message ?? "",
      author: {
        name:
          (raw.commit as { author?: { name?: string } })?.author?.name ?? "",
        date:
          (raw.commit as { author?: { date?: string } })?.author?.date ?? "",
      },
    },
  };
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

  const commits: Promise<PRCommitData[]> = listPRCommits(
    token,
    owner,
    repo,
    number,
  )
    .then((raw) => raw.map(mapCommit))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { commits };
};
