import { error } from "@sveltejs/kit";
import { githubErrorMessage, getCurrentUser } from "$lib/server/auth";
import { fetchIssue, listIssueReactions } from "$lib/server/github/pulls";
import type { IssueData } from "$lib/types/issue";
import type { ReactionData } from "$lib/types/comment";
import type { LayoutServerLoad } from "./$types";

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

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

  const currentUser = await getCurrentUser(token);

  const issue: Promise<IssueData> = fetchIssue(token, owner, repo, number)
    .then((raw) => {
      const d = raw!;
      return {
        number: d.number,
        title: d.title,
        state: d.state,
        body: d.body ?? null,
        user: { login: d.user?.login ?? "" },
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        htmlUrl: d.html_url,
        reactions: listIssueReactions(token, owner, repo, number)
          .then((r) => mapReactions(r, currentUser))
          .catch(() => []),
      };
    })
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { issue, owner, repo, number, currentUser };
};
