<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { setContext } from "svelte";
  import IssueHeader from "$lib/components/IssueHeader.svelte";
  import { fetchIssue } from "$lib/github/pulls";
  import { shortcutHint, useShortcut } from "$lib/utils/shortcut.svelte";

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
  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  setContext("issue", {
    get value() {
      return issueData;
    },
  });

  async function loadIssue(): Promise<void> {
    const raw = await fetchIssue(owner, repo, number);
    issueData = {
      number: raw?.number as number,
      title: raw?.title as string,
      state: raw?.state as string,
      body: (raw?.body as string) ?? null,
      user: { login: (raw?.user as { login?: string })?.login ?? "" },
      createdAt: raw?.created_at as string,
      updatedAt: raw?.updated_at as string,
      htmlUrl: raw?.html_url as string,
    };
  }

  $effect(() =>
    useShortcut(
      "g",
      () => {
        const btn = document.querySelector<HTMLAnchorElement>(".github-btn");
        btn?.click();
      },
      { shift: true },
    ),
  );
  $effect(() => useShortcut("h", () => goto("/"), { shift: true }));
</script>

<svelte:head>
  <title
    >{issueData ? `#${issueData.number} ${issueData.title}` : "Fast GH"}</title
  >
</svelte:head>

<div class="page">
  {#await loadIssue()}
    <p class="status">Loading issue...</p>
  {:then}
    {#if issueData}
      <div class="top-bar">
        <a class="back-btn" href="/"
          >← Notifications <span class="shortcut-hint"
            >{shortcutHint("H", { shift: true })}</span
          ></a
        >
        <a
          class="github-btn"
          href={issueData.htmlUrl}
          target="_blank"
          rel="noopener"
          >Open on GitHub ↗ <span class="shortcut-hint"
            >{shortcutHint("G", { shift: true })}</span
          ></a
        >
      </div>
      <IssueHeader issue={issueData} {owner} {repo} />
      <div class="tab-content">
        {@render children()}
      </div>
    {/if}
  {:catch error}
    <p class="status error">{error.message}</p>
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
    padding: 24px;
    color: var(--text-secondary);
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
