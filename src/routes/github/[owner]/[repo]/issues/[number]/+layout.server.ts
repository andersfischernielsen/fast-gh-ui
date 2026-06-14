import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { fetchIssue } from "$lib/server/github/pulls";
import type { IssueData } from "$lib/types/issue";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const number = Number(params.number);

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
      };
    })
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { issue, owner, repo, number };
};
