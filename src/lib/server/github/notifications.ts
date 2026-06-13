import type { NotificationItem } from "$lib/types/notification";

export interface FetchParams {
  all?: boolean;
  participating?: boolean;
  since?: string;
  before?: string;
  perPage?: number;
  page?: number;
}

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

async function fetchNotifications(token: string, params: FetchParams = {}) {
  const qs = new URLSearchParams({
    all: String(params.all ?? false),
    per_page: String(params.perPage ?? 50),
    page: String(params.page ?? 1),
  });
  if (params.participating)
    qs.set("participating", String(params.participating));
  if (params.since) qs.set("since", params.since);
  if (params.before) qs.set("before", params.before);

  const response = await fetch(`https://api.github.com/notifications?${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const raw = (await response.json()) as Array<
    Parameters<typeof mapNotification>[0]
  >;
  return raw.map(mapNotification);
}

async function markThreadAsRead(
  token: string,
  threadId: string,
): Promise<void> {
  const response = await fetch(
    `https://api.github.com/notifications/threads/${threadId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

export { fetchNotifications, markThreadAsRead };
