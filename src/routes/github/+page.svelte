<script lang="ts">
  import { onMount } from 'svelte';
  import { notifications, loading, error, loadNotifications } from '$lib/stores/notifications.svelte';
  import NotificationItem from '$lib/components/NotificationItem.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import type { NotificationItem as NotificationItemType } from '$lib/stores/notifications.svelte';

  let selectedId = $state<string | null>(null);
  let repoFilter = $state<string | null>(null);
  let unreadFilter = $state<'all' | 'unread' | 'read'>('all');

  let filtered = $derived(
    notifications.value.filter(n => {
      if (repoFilter && n.repository.fullName !== repoFilter) return false;
      if (unreadFilter === 'unread' && !n.unread) return false;
      if (unreadFilter === 'read' && n.unread) return false;
      return true;
    })
  );

  onMount(() => {
    loadNotifications();
  });

  function prHref(item: NotificationItemType): string {
    const match = item.subject.url.match(/repos\/([^/]+)\/([^/]+)\/(?:pull|pulls)\/(\d+)/);
    if (match) {
      return `/github/${match[1]}/${match[2]}/pull/${match[3]}`;
    }
    const issueMatch = item.subject.url.match(/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
    if (issueMatch) {
      return `/github/${issueMatch[1]}/${issueMatch[2]}/issues/${issueMatch[3]}`;
    }
    return '#';
  }

  function prStateKey(item: NotificationItemType): string | null {
    const match = item.subject.url.match(/repos\/([^/]+)\/([^/]+)\/(?:pull|pulls)\/(\d+)/);
    if (match) {
      return `${match[1]}/${match[2]}#${match[3]}`;
    }
    return null;
  }
</script>

<div class="app-shell">
  <Sidebar onfilterchange={(repo) => repoFilter = repo} />
  <div class="list-panel">
    <div class="list-header">
      <h2>Notifications</h2>
      <div class="header-actions">
        <select class="unread-filter" value={unreadFilter} onchange={(e) => unreadFilter = (e.target as HTMLSelectElement).value as 'all' | 'unread' | 'read'}>
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <button onclick={() => loadNotifications()} disabled={loading.value}>Refresh</button>
      </div>
    </div>
    {#if loading.value}
      <p class="status">Loading...</p>
    {:else if error.value}
      <p class="status error">{error.value}</p>
    {:else if filtered.length === 0}
      <p class="status">No notifications</p>
    {:else}
      <div class="list">
        {#each filtered as item (item.id)}
          <NotificationItem {item} selected={selectedId === item.id} href={prHref(item)} prStateKey={prStateKey(item)} />
        {/each}
      </div>
    {/if}
  </div>
  <div class="detail-panel">
    <p class="placeholder">Select a notification to view details</p>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .list-panel {
    width: 380px;
    min-width: 300px;
    border-right: 1px solid #d0d7de;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #d0d7de;
  }
  .list-header h2 { font-size: 16px; }
  .header-actions {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .unread-filter {
    padding: 3px 6px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 12px;
    background: #f6f8fa;
    font-family: inherit;
  }
  .list-header button {
    padding: 4px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    font-size: 12px;
    cursor: pointer;
  }
  .list {
    flex: 1;
    overflow-y: auto;
  }
  .status { padding: 16px; color: #656d76; font-size: 14px; }
  .status.error { color: #cf222e; }
  .detail-panel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .placeholder { color: #656d76; font-size: 14px; }
</style>
