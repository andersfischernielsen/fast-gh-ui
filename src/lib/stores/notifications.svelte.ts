import { fetchNotifications, markThreadAsRead } from "$lib/github/notifications";

interface NotificationItem {
  id: string;
  unread: boolean;
  reason: string;
  updatedAt: string;
  lastReadAt: string | null;
  subject: {
    title: string;
    url: string;
    type: string;
    latestCommentUrl: string | null;
  };
  repository: {
    id: number;
    name: string;
    fullName: string;
    owner: string;
    htmlUrl: string;
  };
}

const notifications = $state({ value: [] as NotificationItem[] });
let prStates = $state<Record<string, string>>({});

function mapNotification(raw: {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string;
    type: string;
    latest_comment_url: string | null;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    html_url: string;
  };
}): NotificationItem {
  return {
    id: raw.id,
    unread: raw.unread,
    reason: raw.reason,
    updatedAt: raw.updated_at,
    lastReadAt: raw.last_read_at,
    subject: {
      title: raw.subject.title,
      url: raw.subject.url,
      type: raw.subject.type,
      latestCommentUrl: raw.subject.latest_comment_url,
    },
    repository: {
      id: raw.repository.id,
      name: raw.repository.name,
      fullName: raw.repository.full_name,
      owner: raw.repository.owner.login,
      htmlUrl: raw.repository.html_url,
    },
  };
}

async function loadNotifications(): Promise<NotificationItem[]> {
  try {
    const raw = await fetchNotifications({ all: true, perPage: 50 });
    const items = raw.map(mapNotification);
    notifications.value = items;
    return items;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load notifications";
    if (msg.includes("403") || msg.includes("Resource not accessible")) {
      throw new Error(
        "Token does not have Notifications permission. Ensure the token has Notifications (Read) under Account Permissions — not Repository Permissions.",
      );
    }
    throw e;
  }
}

function setPRState(key: string, state: string, merged: boolean) {
  prStates[key] = state === "closed" && merged ? "merged" : state;
}

async function markAsRead(threadId: string): Promise<void> {
  try {
    await markThreadAsRead(threadId);
    notifications.value = notifications.value.map((n) =>
      n.id === threadId ? { ...n, unread: false } : n,
    );
  } catch (e) {
    console.error("Failed to mark as read:", e);
  }
}

export { notifications, prStates, loadNotifications, setPRState, markAsRead };
export type { NotificationItem };
