<script lang="ts">
  import type { PullRequest } from '$lib/stores/pr.svelte';
  import PRReviewActions from './PRReviewActions.svelte';

  let { pr, owner, repo }: { pr: PullRequest; owner: string | undefined; repo: string | undefined } = $props();

  function stateColor(state: string): string {
    if (state === 'open') return '#1a7f37';
    if (state === 'merged') return '#8250df';
    return '#cf222e';
  }

  function stateBg(state: string): string {
    if (state === 'open') return '#dafbe1';
    if (state === 'merged') return '#fbefff';
    return '#ffebe9';
  }
</script>

<header class="header">
  <div class="title-row">
    <div class="title-content">
      <div class="repo-name">{owner}/{repo}</div>
      <h1>
        <span class="number">#{pr.number}</span>
        {pr.title}
      </h1>
    </div>
    {#if pr.state === 'open'}
      <PRReviewActions {owner} {repo} number={pr.number} />
    {/if}
  </div>
  <div class="meta-row">
    <span
      class="state"
      style="background:{stateBg(pr.state)};color:{stateColor(pr.state)}"
    >{pr.state}</span>
    <span>{pr.user.login}</span>
    <span>{pr.head.ref} → {pr.base.ref}</span>
    <span class="stats">+{pr.additions} −{pr.deletions} ({pr.changedFiles} files)</span>
  </div>
</header>

<style>
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid #d0d7de;
  }
  .repo-name {
    font-size: 13px;
    color: #656d76;
    margin-bottom: 4px;
  }
  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .title-content {
    flex: 1;
    min-width: 0;
  }
  .title-content h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }
  .number { color: #656d76; font-weight: 400; }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 13px;
    color: #656d76;
  }
  .state {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .stats { font-family: monospace; }
</style>
