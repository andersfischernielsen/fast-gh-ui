import { error } from "@sveltejs/kit";
import { githubErrorMessage, getCurrentUser } from "$lib/server/auth";
import { fetchPullRequest, listReviews, listIssueReactions } from "$lib/server/github/pulls";
import type { PullRequest } from "$lib/types/pullRequest";
import type { ReactionData } from "$lib/types/comment";
import type { ReviewData } from "$lib/types/review";
import type { LayoutServerLoad } from "./$types";

export type { ReviewData };

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

function mapPullRequest(
  raw: Awaited<ReturnType<typeof fetchPullRequest>>,
  token: string,
  owner: string,
  repo: string,
  currentUser: string,
): PullRequest {
  const number = raw.number;
  return {
    number,
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
    reactions: listIssueReactions(token, owner, repo, number)
      .then((r) => mapReactions(r, currentUser))
      .catch(() => []),
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

  const currentUser = await getCurrentUser(token);

  const pr: Promise<PullRequest> = fetchPullRequest(token, owner, repo, number)
    .then((raw) => mapPullRequest(raw, token, owner, repo, currentUser))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  const reviews: Promise<ReviewData[]> = listReviews(token, owner, repo, number)
    .then((raw) => raw.map(mapReview))
    .catch(() => []);

  return { pr, reviews, owner, repo, number, currentUser };
};
