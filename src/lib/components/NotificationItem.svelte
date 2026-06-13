<script lang="ts">
  import { enhance } from "$app/forms";
  import type { NotificationItem } from "$lib/types/notification";

  let {
    item,
    selected = false,
    href,
    prState = undefined,
  }: {
    item: NotificationItem;
    selected?: boolean;
    href: string;
    prState?: string;
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

  let prNumber = $derived(parsePRNumber(item.subject.url));
</script>

<a class="item" class:selected class:unread={item.unread} {href}>
  <span class="repo">{item.repository.fullName}</span>
  <span class="title">
    <span class="number">{prNumber}</span>
    <span class="pr-title">{item.subject.title}</span>
  </span>
  <span class="meta">
    <span class="badge">{getTypeBadge(item.subject.type)}</span>
    {#if prState}
      <span
        class="pr-state"
        class:open={prState === "open"}
        class:merged={prState === "merged"}
        class:closed={prState === "closed"}>{prState}</span
      >
    {/if}
    <span class="time">{formatTime(item.updatedAt)}</span>
  </span>
  {#if item.unread}
    <form
      method="POST"
      action="?/markRead"
      use:enhance={() => {
        return async ({ update }) => {
          await update({ invalidateAll: false });
        };
      }}
      class="mark-read-form"
    >
      <input type="hidden" name="threadId" value={item.id} />
      <button
        type="submit"
        class="toggle-btn"
        onclick={(e) => {
          e.stopPropagation();
        }}
      >
        Mark read
      </button>
    </form>
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
  .mark-read-form {
    position: absolute;
    top: 6px;
    right: 8px;
  }
  .toggle-btn {
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
