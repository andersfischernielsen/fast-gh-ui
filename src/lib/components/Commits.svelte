<script lang="ts">
  import { page } from "$app/state";
  import type { PRCommitData } from "$lib/types/commit";

  interface PRCommit {
    sha: string;
    author: { login: string; avatarUrl: string };
    message: string;
    date: string;
  }

  let {
    commits,
  }: {
    commits: PRCommitData[];
  } = $props();

  let owner = $derived(page.params.owner);
  let repo = $derived(page.params.repo);
  let number = $derived(Number(page.params.number));

  let items = $derived<PRCommit[]>(
    commits.map((c) => ({
      sha: c.sha,
      author: {
        login: c.author?.login ?? c.commit.author.name ?? "unknown",
        avatarUrl: c.author?.avatarUrl ?? "",
      },
      message: c.commit.message.split("\n")[0],
      date: c.commit.author.date,
    })),
  );

  function shortSha(sha: string): string {
    return sha.substring(0, 7);
  }
</script>

<div class="commits">
  {#each items as commit (commit.sha)}
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
  {#if items.length === 0}
    <p class="status">No commits</p>
  {/if}
</div>

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
</style>
