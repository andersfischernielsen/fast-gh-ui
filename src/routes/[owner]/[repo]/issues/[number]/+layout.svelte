<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { setContext } from 'svelte';
  import IssueHeader from '$lib/components/IssueHeader.svelte';
  import { fetchIssue } from '$lib/github/pulls';

  interface IssueData {
    number: number;
    title: string;
    state: string;
    body: string | null;
    user: { login: string };
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
  }

  let { children } = $props();

  let issueData = $state<IssueData | null>(null);
  let issueLoading = $state(true);
  let issueError = $state<string | null>(null);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  setContext('issue', { get value() { return issueData; } });

  onMount(async () => {
    try {
      const raw = await fetchIssue(owner, repo, number);
      issueData = {
        number: raw.number as number,
        title: raw.title as string,
        state: raw.state as string,
        body: (raw.body as string) ?? null,
        user: { login: (raw.user as { login?: string })?.login ?? '' },
        createdAt: raw.created_at as string,
        updatedAt: raw.updated_at as string,
        htmlUrl: raw.html_url as string,
      };
    } catch (e) {
      issueError = String(e);
    } finally {
      issueLoading = false;
    }
  });
</script>

<div class="page">
  {#if issueLoading}
    <p class="status">Loading issue...</p>
  {:else if issueError}
    <p class="status error">{issueError}</p>
  {:else if issueData}
    <div class="top-bar">
      <a class="back-btn" href="/">← Notifications</a>
      <a class="github-btn" href={issueData.htmlUrl} target="_blank" rel="noopener">Open on GitHub ↗</a>
    </div>
    <IssueHeader issue={issueData} {owner} {repo} />
    <div class="tab-content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  .top-bar {
    padding: 8px 24px;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .back-btn {
    padding: 4px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 12px;
    color: #1f2328;
    text-decoration: none;
    background: #f6f8fa;
    cursor: pointer;
    font-family: inherit;
  }
  .back-btn:hover { background: #eaeef2; }
  .github-btn {
    padding: 4px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 12px;
    color: #1f2328;
    text-decoration: none;
    background: #f6f8fa;
  }
  .github-btn:hover { background: #eaeef2; }
  .tab-content { flex: 1; overflow-y: auto; }
  .status { padding: 24px; color: #656d76; }
  .status.error { color: #cf222e; }
</style>
