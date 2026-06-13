<script lang="ts">
  import { goto } from "$app/navigation";
  import PRHeader from "$lib/components/PRHeader.svelte";
  import PRTabs from "$lib/components/PRTabs.svelte";
  import { useShortcut, shortcutHint } from "$lib/utils/shortcut.svelte";

  let { children, data } = $props();

  let pageTitle = $state("");
  $effect(() => {
    pageTitle = `#${data.number} — Loading...`;
    data.pr.then((pr) => {
      pageTitle = `${pr.title} #${pr.number}`;
    });
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
  <title>{pageTitle}</title>
</svelte:head>

<div class="page">
  {#await Promise.all([data.pr, data.reviews])}
    <p class="status">Loading PR...</p>
  {:then [pr, reviews]}
    <div class="top-bar">
      <a class="back-btn" href="/github"
        >← Notifications <span class="shortcut-hint"
          >{shortcutHint("H", { shift: true })}</span
        ></a
      >
      <a class="github-btn" href={pr.htmlUrl} target="_blank" rel="noopener"
        >Open on GitHub ↗<span class="shortcut-hint"
          >{shortcutHint("G", { shift: true })}</span
        ></a
      >
    </div>
    <PRHeader {pr} owner={data.owner} repo={data.repo} {reviews} />
    <PRTabs />
    <div class="tab-content">
      {@render children()}
    </div>
  {:catch e}
    <p class="status error">{e instanceof Error ? e.message : String(e)}</p>
  {/await}
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
    padding: 16px;
    color: var(--text-secondary);
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
