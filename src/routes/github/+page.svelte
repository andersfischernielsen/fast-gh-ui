<script lang="ts">
  import {
    notifications,
    loadNotifications,
  } from "$lib/stores/notifications.svelte";
  import NotificationItem from "$lib/components/NotificationItem.svelte";
  import Sidebar from "$lib/components/Sidebar.svelte";
  import type { NotificationItem as NotificationItemType } from "$lib/stores/notifications.svelte";
  import { useShortcut, shortcutHint } from "$lib/utils/shortcut.svelte";

  let notificationsPromise = $state(loadNotifications());

  let selectedId = $state<string | null>(null);
  let repoFilter = $state<string | null>(null);
  let unreadFilter = $state<"all" | "unread" | "read">("all");

  let filtered = $derived(
    notifications.value.filter((n) => {
      if (repoFilter && n.repository.fullName !== repoFilter) return false;
      if (unreadFilter === "unread" && !n.unread) return false;
      if (unreadFilter === "read" && n.unread) return false;
      return true;
    }),
  );

  $effect(() => useShortcut("r", () => { notificationsPromise = loadNotifications(); }, { shift: true }));

  function prHref(item: NotificationItemType): string {
    const match = item.subject.url.match(
      /repos\/([^/]+)\/([^/]+)\/(?:pull|pulls)\/(\d+)/,
    );
    if (match) {
      return `/github/${match[1]}/${match[2]}/pull/${match[3]}`;
    }
    const issueMatch = item.subject.url.match(
      /repos\/([^/]+)\/([^/]+)\/issues\/(\d+)/,
    );
    if (issueMatch) {
      return `/github/${issueMatch[1]}/${issueMatch[2]}/issues/${issueMatch[3]}`;
    }
    return "#";
  }

  function prStateKey(item: NotificationItemType): string | null {
    const match = item.subject.url.match(
      /repos\/([^/]+)\/([^/]+)\/(?:pull|pulls)\/(\d+)/,
    );
    if (match) {
      return `${match[1]}/${match[2]}#${match[3]}`;
    }
    return null;
  }
</script>

<div class="app-shell">
  <Sidebar onfilterchange={(repo) => (repoFilter = repo)} />
  <div class="list-panel">
    <div class="list-header">
      <div class="header-actions">
        <select
          class="unread-filter"
          value={unreadFilter}
          onchange={(e) =>
            (unreadFilter = (e.target as HTMLSelectElement).value as
              | "all"
              | "unread"
              | "read")}
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <button onclick={() => { notificationsPromise = loadNotifications(); }}
          >Refresh <span class="shortcut-hint"
            >{shortcutHint("R", { shift: true })}</span
          ></button
        >
      </div>
    </div>
    {#await notificationsPromise}
      <p class="status">Loading...</p>
    {:then}
      {#if filtered.length === 0}
        <p class="status">No notifications</p>
      {:else}
        <div class="list">
          {#each filtered as item (item.id)}
            <NotificationItem
              {item}
              selected={selectedId === item.id}
              href={prHref(item)}
              prStateKey={prStateKey(item)}
            />
          {/each}
        </div>
      {/if}
    {:catch error}
      <p class="status error">{error.message}</p>
    {/await}
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .list-panel {
    width: 100%;
    min-width: 300px;
    container-type: inline-size;
    border-right: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-primary);
    height: 50px;
  }

  .header-actions {
    display: flex;
    gap: 6px;
    margin-left: auto;
    align-items: flex-end;
  }
  .unread-filter {
    padding: 3px 6px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    background: var(--bg-secondary);
    font-family: inherit;
    color: var(--text-primary);
    height: 25px;
  }
  .list-header button {
    padding: 4px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-secondary);
    font-size: 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--text-primary);
  }
  .shortcut-hint {
    font-size: 9px;
    color: var(--text-tertiary);
    padding: 1px 4px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    line-height: 1;
  }
  .list {
    flex: 1;
    overflow-y: auto;
  }
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }

  @container (max-width: 360px) {
    .list-header {
      font-size: 11px;
      height: 40px;
    }
    .list-header button {
      font-size: 11px;
    }
    .unread-filter {
      font-size: 11px;
    }
  }
</style>
