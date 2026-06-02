import { Octokit } from "@octokit/rest";
import { getToken } from "$lib/stores/token.svelte";

let _client: Octokit | null = null;

function createClient(): Octokit {
  if (_client) return _client;
  const token = getToken();
  if (!token) throw new Error("No token available");
  _client = new Octokit({ auth: token });
  return _client;
}

function resetClient(): void {
  _client = null;
}

export { createClient, resetClient };
