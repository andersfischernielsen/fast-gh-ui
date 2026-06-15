<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { pr, loading, error, loadPR } from "$lib/stores/pr.svelte";
  import PRHeader from "$lib/components/PRHeader.svelte";
  import PRTabs from "$lib/components/PRTabs.svelte";
  import { useShortcut, shortcutHint } from "$lib/utils/shortcut.svelte";

  let { children } = $props();

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(() => {
    loadPR(owner, repo, number);
  });

  $effect(() =>
    useShortcut("g", () => {
      const btn = document.querySelector<HTMLAnchorElement>(".github-btn");
      btn?.click();
    }),
  );
  $effect(() => useShortcut("h", () => goto("/github"), { shift: true }));
</script>

<svelte:head>
  <title>{pr.value ? `#${pr.value.number} ${pr.value.title}` : 'Fast GH'}</title>
</svelte:head>

<div class="page">
  {#if loading.value}
    <p class="status">Loading PR...</p>
  {:else if error.value}
    <p class="status error">{error.value}</p>
  {:else if pr.value}
    <div class="top-bar">
      <a class="back-btn" href="/github"
        >← Notifications <span class="shortcut-hint"
          >{shortcutHint("H", { shift: true })}</span
        ></a
      >
      <a
        class="github-btn"
        href={pr.value.htmlUrl}
        target="_blank"
        rel="noopener"
        >Open on GitHub ↗<span class="shortcut-hint"
          >{shortcutHint("G", { shift: true })}</span
        ></a
      >
    </div>
    <PRHeader pr={pr.value} {owner} {repo} />
    <PRTabs />
    <div class="tab-content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .top-bar {
    padding: 8px 24px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .back-btn {
    padding: 4px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-primary);
    text-decoration: none;
    background: var(--bg-secondary);
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .back-btn:hover {
    background: var(--bg-tertiary);
  }
  .github-btn {
    padding: 4px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-primary);
    text-decoration: none;
    background: var(--bg-secondary);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .github-btn:hover {
    background: var(--bg-tertiary);
  }
  .shortcut-hint {
    font-size: 9px;
    color: var(--text-tertiary);
    padding: 1px 4px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    line-height: 1;
  }
  .tab-content {
    flex: 1;
    overflow-y: auto;
  }
  .status {
    padding: 24px;
    color: var(--text-secondary);
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
