import { createClient } from "./client";

async function fetchRepo(owner: string, repo: string) {
  const octokit = createClient();
  const response = await octokit.rest.repos.get({ owner, repo });
  return response.data;
}

export { fetchRepo };
