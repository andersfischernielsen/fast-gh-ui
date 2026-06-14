import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { listChecks } from "$lib/server/github/pulls";
import type { CheckRunData } from "$lib/types/checkRun";
import type { PageServerLoad } from "./$types";

export type { CheckRunData };

function mapCheckRun(raw: Record<string, unknown>): CheckRunData {
  return {
    id: raw.id as number,
    name: (raw.name as string) ?? "",
    status: (raw.status as string) ?? "unknown",
    conclusion: (raw.conclusion as string | null) ?? null,
    detailsUrl: (raw.details_url as string | null) ?? null,
  };
}

export const load: PageServerLoad = async ({ parent, params, locals }) => {
  const token = locals.token!;
  const { owner, repo } = params;
  const { headSha: headShaP } = await parent();
  const headSha = await headShaP;

  const checks: Promise<{ check_runs?: CheckRunData[] }> = listChecks(token, owner, repo, headSha)
    .then((raw) => ({
      check_runs: raw?.check_runs?.map(mapCheckRun),
    }))
    .catch((e: unknown) => {
      throw error(500, githubErrorMessage(e));
    });

  return { checks };
};
