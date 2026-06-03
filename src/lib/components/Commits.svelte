<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { listPRCommits } from "$lib/github/pulls";

  interface PRCommit {
    sha: string;
    author: { login: string; avatarUrl: string };
    message: string;
    date: string;
  }

  let commits = $state<PRCommit[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(async () => {
    try {
      const raw = await listPRCommits(owner, repo, number);
      commits = raw.map((c: Record<string, unknown>) => ({
        sha: c.sha as string,
        author: {
          login:
            (c.author as { login?: string })?.login ??
            (c.commit as { author?: { name?: string } })?.author?.name ??
            "unknown",
          avatarUrl: (c.author as { avatar_url?: string })?.avatar_url ?? "",
        },
        message: ((c.commit as { message?: string })?.message ?? "").split(
          "\n",
        )[0],
        date: (c.commit as { author?: { date?: string } })?.author?.date ?? "",
      }));
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  function shortSha(sha: string): string {
    return sha.substring(0, 7);
  }
</script>

{#if loading}
  <p class="status">Loading commits...</p>
{:else if error}
  <p class="status error">{error}</p>
{:else}
  <div class="commits">
    {#each commits as commit (commit.sha)}
      <a
        class="commit"
        href="/github/{owner}/{repo}/pull/{number}/commits/{commit.sha}"
      >
        <div class="commit-meta">
          <span class="sha">{shortSha(commit.sha)}</span>
          <span class="author">{commit.author.login}</span>
        </div>
        <div class="commit-message">{commit.message}</div>
      </a>
    {/each}
    {#if commits.length === 0}
      <p class="status">No commits</p>
    {/if}
  </div>
{/if}

<style>
  .commit {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-bottom: 1px solid var(--border-secondary);
    background: none;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    text-decoration: none;
    color: inherit;
  }
  .commit:hover {
    background: var(--bg-secondary);
  }
  .commit-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 2px;
  }
  .sha {
    font-family: monospace;
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--bg-code);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .author {
    font-size: 12px;
    color: var(--text-secondary);
  }
  .commit-message {
    font-size: 12px;
  }
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
