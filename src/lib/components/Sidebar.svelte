<script lang="ts">
  import { notifications } from "$lib/stores/notifications.svelte";
  import { clearToken } from "$lib/stores/token.svelte";
  import { goto } from "$app/navigation";
  import OpenFromGitHub from "./OpenFromGitHub.svelte";

  let {
    onfilterchange,
  }: {
    onfilterchange?: (repo: string | null) => void;
  } = $props();

  let repos = $derived(
    [...new Set(notifications.value.map((n) => n.repository.fullName))].sort(),
  );
  let selectedRepo = $state<string | null>(null);

  function logout() {
    clearToken();
    goto("/github/login");
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header"></div>
  <nav class="repo-list">
    {#each repos as repo}
      <button
        class="repo-item"
        class:active={selectedRepo === repo}
        onclick={() => {
          const next = selectedRepo === repo ? null : repo;
          selectedRepo = next;
          onfilterchange?.(next);
        }}
      >
        {repo}
      </button>
    {/each}
  </nav>
  <div class="sidebar-github-link">
    <OpenFromGitHub />
  </div>
  <div class="sidebar-footer">
    <button class="nav-btn" onclick={() => goto("/github/settings")}
      >Settings</button
    >
    <button class="logout-btn" onclick={logout}>Logout</button>
  </div>
</aside>

<style>
  .sidebar {
    width: 300px;
    min-width: 120px;
    background: #f6f8fa;
    border-right: 1px solid #d0d7de;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 12px 16px;
    font-weight: 600;
    font-size: 16px;
    color: #656d76;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #d0d7de;
    height: 50px;
  }

  .repo-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
    padding-top: 12px;
  }

  .repo-item {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: none;
    background: none;
    text-align: left;
    font-size: 12px;
    cursor: pointer;
    border-radius: 6px;
    font-family: inherit;
  }
  .repo-item:hover {
    background: #eaeef2;
  }
  .repo-item.active {
    background: #d0d7de;
  }
  .sidebar-footer {
    border-top: 1px solid #d0d7de;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sidebar-github-link {
    border-top: 1px solid #d0d7de;
    padding: 8px 12px;
  }
  .sidebar-footer button {
    padding: 6px 8px;
    border: none;
    background: none;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    border-radius: 6px;
    font-family: inherit;
  }
  .sidebar-footer button:hover {
    background: #eaeef2;
  }
  .logout-btn {
    color: #cf222e;
  }
</style>
