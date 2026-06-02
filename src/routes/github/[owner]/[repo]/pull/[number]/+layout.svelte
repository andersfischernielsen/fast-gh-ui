<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { pr, loading, error, loadPR } from '$lib/stores/pr.svelte';
  import PRHeader from '$lib/components/PRHeader.svelte';
  import PRTabs from '$lib/components/PRTabs.svelte';

  let { children } = $props();

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(() => {
    loadPR(owner, repo, number);
  });
</script>

<div class="page">
  {#if loading.value}
    <p class="status">Loading PR...</p>
  {:else if error.value}
    <p class="status error">{error.value}</p>
  {:else if pr.value}
    <div class="top-bar">
      <a class="back-btn" href="/github">← Notifications</a>
      <a class="github-btn" href={pr.value.htmlUrl} target="_blank" rel="noopener">Open on GitHub ↗</a>
    </div>
    <PRHeader pr={pr.value} {owner} {repo} />
    <PRTabs
      commitsCount={-1}
      filesCount={pr.value.changedFiles}
    />
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
