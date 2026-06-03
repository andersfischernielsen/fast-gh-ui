import { fetchPullRequest } from "$lib/github/pulls";
import { setPRState } from "$lib/stores/notifications.svelte";

interface PullRequest {
  number: number;
  title: string;
  state: string;
  body: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  user: { login: string; avatarUrl: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  merged: boolean;
  draft: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
}

const pr = $state<{ value: PullRequest | null }>({ value: null });
const loading = $state({ value: false });
const error = $state({ value: null as string | null });
let loadedId = $state<string | null>(null);

async function loadPR(
  owner: string | undefined,
  repo: string | undefined,
  number: number | undefined,
): Promise<void> {
  const id = `${owner}/${repo}#${number}`;
  if (loadedId === id) return;
  loading.value = true;
  error.value = null;
  try {
    const raw = await fetchPullRequest(owner, repo, number);
    pr.value = {
      number: raw.number,
      title: raw.title,
      state: raw.state,
      body: raw.body,
      htmlUrl: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      user: { login: raw.user?.login ?? "", avatarUrl: raw.user?.avatar_url ?? "" },
      head: { ref: raw.head.ref, sha: raw.head.sha },
      base: { ref: raw.base.ref, sha: raw.base.sha },
      merged: raw.merged ?? false,
      draft: raw.draft ?? false,
      additions: raw.additions ?? 0,
      deletions: raw.deletions ?? 0,
      changedFiles: raw.changed_files ?? 0,
    };
    loadedId = id;
    setPRState(`${owner}/${repo}#${number}`, raw.state, raw.merged ?? false);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Failed to load PR";
  } finally {
    loading.value = false;
  }
}

export { pr, loading, error, loadPR };
export type { PullRequest };
