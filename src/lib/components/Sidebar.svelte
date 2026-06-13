<script lang="ts">
  import type { NotificationItem } from "$lib/types/notification";
  import { enhance } from "$app/forms";
  import OpenFromGitHub from "./OpenFromGitHub.svelte";

  let {
    onfilterchange,
    notifications,
  }: {
    onfilterchange?: (repo: string | null) => void;
    notifications: NotificationItem[];
  } = $props();

  let repos = $derived(
    [...new Set(notifications.map((n) => n.repository.fullName))].sort(),
  );
  let selectedRepo = $state<string | null>(null);
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
    <a class="nav-btn" href="/github/settings">Settings</a>
    <form method="POST" action="/github/settings?/logout" use:enhance>
      <button type="submit" class="logout-btn">Logout</button>
    </form>
  </div>
</aside>

<style>
  .sidebar {
    width: 300px;
    container-type: inline-size;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 12px 16px;
    font-weight: 600;
    font-size: 16px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-primary);
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
    color: var(--text-primary);
  }
  .repo-item:hover {
    background: var(--bg-tertiary);
  }
  .repo-item.active {
    background: var(--border-primary);
  }
  .sidebar-footer {
    border-top: 1px solid var(--border-primary);
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sidebar-github-link {
    border-top: 1px solid var(--border-primary);
    padding: 8px 12px;
  }
  .sidebar-footer :is(a, button) {
    display: block;
    padding: 6px 8px;
    border: none;
    background: none;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    border-radius: 6px;
    font-family: inherit;
    color: var(--text-primary);
    text-decoration: none;
  }
  .sidebar-footer :is(a, button):hover {
    background: var(--bg-tertiary);
  }
  .logout-btn {
    color: var(--text-danger);
  }

  @container (max-width: 119px) {
    .sidebar-header {
      font-size: 13px;
      padding: 8px 10px;
      height: 40px;
    }
    .repo-item {
      font-size: 10px;
      padding: 4px 6px;
    }
    .sidebar-footer button {
      font-size: 10px;
    }
    .sidebar-github-link {
      padding: 4px 8px;
    }
  }
</style>
