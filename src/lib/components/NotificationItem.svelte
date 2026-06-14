<script lang="ts">
  import { onMount } from "svelte";
  import type { NotificationItem } from "$lib/stores/notifications.svelte";
  import { markAsRead } from "$lib/stores/notifications.svelte";
  import { fetchPullRequest } from "$lib/github/pulls";

  let {
    item,
    selected = false,
    href,
    prStateKey = null,
  }: {
    item: NotificationItem;
    selected?: boolean;
    href: string;
    prStateKey?: string | null;
  } = $props();

  function getTypeBadge(type: string): string {
    switch (type) {
      case "PullRequest":
        return "PR";
      case "Issue":
        return "Issue";
      case "Discussion":
        return "Discuss";
      case "Release":
        return "Release";
      default:
        return type.slice(0, 8);
    }
  }

  function parsePRNumber(url: string): string {
    const match = url.match(/\/(\d+)$/);
    return match ? `#${match[1]}` : "";
  }

  function formatTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  async function fetchMergeStatus(): Promise<string | null> {
    if (!prStateKey) return null;
    const match = prStateKey.match(/^(.+)\/(.+)#(\d+)$/);
    if (!match) return null;
    try {
      const pr = await fetchPullRequest(match[1], match[2], parseInt(match[3]));
      return pr.state === "closed" && pr.merged ? "merged" : pr.state;
    } catch {
      return null;
    }
  }

  function handleClick() {
    if (item.unread) markAsRead(item.id);
  }

  let prNumber = $derived(parsePRNumber(item.subject.url));
  let mergeStatusPromise: Promise<string | null> = $state(Promise.resolve(null));
  onMount(() => {
    mergeStatusPromise = fetchMergeStatus();
  });
</script>

<a
  class="item"
  class:selected
  class:unread={item.unread}
  {href}
  onclick={handleClick}
>
  <span class="repo">{item.repository.fullName}</span>
  <span class="title">
    <span class="number">{prNumber}</span>
    <span class="pr-title">{item.subject.title}</span>
  </span>
  <span class="meta">
    <span class="badge">{getTypeBadge(item.subject.type)}</span>
    {#await mergeStatusPromise then state}
      {#if state}
        <span
          class="pr-state"
          class:open={state === "open"}
          class:merged={state === "merged"}
          class:closed={state === "closed"}>{state}</span
        >
      {/if}
    {/await}
    <span class="time">{formatTime(item.updatedAt)}</span>
  </span>
  {#if item.unread}
    <button
      class="toggle-btn"
      onclick={(e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        markAsRead(item.id);
      }}
    >
      Mark read
    </button>
  {/if}
</a>

<style>
  .item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 16px 10px 28px;
    border: none;
    border-bottom: 1px solid var(--border-secondary);
    background: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    position: relative;
    text-decoration: none;
    color: inherit;
  }
  .item:hover {
    background: var(--bg-secondary);
  }
  .item.selected {
    background: var(--bg-list-hover);
  }
  .item.unread {
    font-weight: 600;
  }
  .item.unread::before {
    content: "";
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-success);
  }
  .repo {
    font-size: 12px;
    color: var(--text-secondary);
  }
  .title {
    font-size: 12px;
    line-height: 1.4;
  }
  .title .pr-title {
    font-weight: 600;
  }
  .number {
    color: var(--text-secondary);
    font-weight: 400;
  }
  .meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 2px;
  }
  .badge {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--bg-selected);
    color: var(--text-link);
  }
  .pr-state {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .pr-state.open {
    background: var(--state-open-bg);
    color: var(--text-success);
  }
  .pr-state.merged {
    background: var(--state-merged-bg);
    color: var(--state-merged-text);
  }
  .pr-state.closed {
    background: var(--state-closed-bg);
    color: var(--text-danger);
  }
  .time {
    font-size: 12px;
    color: var(--text-secondary);
  }
  .toggle-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    padding: 2px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-secondary);
    font-size: 11px;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .item:hover .toggle-btn {
    opacity: 1;
  }
  .toggle-btn:hover {
    background: var(--bg-tertiary);
  }
</style>
