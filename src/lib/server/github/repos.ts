import { createGitHubClient } from "$lib/server/auth";

async function fetchRepo(token: string, owner: string, repo: string) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.repos.get({ owner, repo });
  return response.data;
}

export { fetchRepo };
