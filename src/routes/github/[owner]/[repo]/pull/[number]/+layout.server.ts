import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { fetchPullRequest, listReviews } from "$lib/server/github/pulls";
import type { PullRequest } from "$lib/types/pullRequest";
import type { ReviewData } from "$lib/types/review";
import type { LayoutServerLoad } from "./$types";

export type { ReviewData };

function mapPullRequest(raw: Awaited<ReturnType<typeof fetchPullRequest>>): PullRequest {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state,
    body: raw.body,
    htmlUrl: raw.html_url,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    user: {
      login: raw.user?.login ?? "",
      avatarUrl: raw.user?.avatar_url ?? "",
    },
    head: { ref: raw.head.ref, sha: raw.head.sha },
    base: { ref: raw.base.ref, sha: raw.base.sha },
    merged: raw.merged ?? false,
    draft: raw.draft ?? false,
    additions: raw.additions ?? 0,
    deletions: raw.deletions ?? 0,
    changedFiles: raw.changed_files ?? 0,
  };
}

function mapReview(raw: Record<string, unknown>): ReviewData {
  return {
    id: raw.id as number,
    user: { login: (raw.user as { login?: string })?.login ?? "" },
    state: (raw.state as string) ?? "",
  };
}

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

  const pr: Promise<PullRequest> = fetchPullRequest(token, owner, repo, number)
    .then(mapPullRequest)
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  const reviews: Promise<ReviewData[]> = listReviews(token, owner, repo, number)
    .then((raw) => raw.map(mapReview))
    .catch(() => []);

  return { pr, reviews, owner, repo, number };
};
