import { Octokit } from "@octokit/rest";
import { getToken } from "#lib/stores/token.svelte.js";

function createClient(): Octokit {
  const token = getToken();
  if (!token) throw new Error("No token available");
  return new Octokit({ auth: token });
}

export { createClient };
