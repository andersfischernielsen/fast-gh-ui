import { getToken } from "$lib/stores/token.svelte";

export interface FetchParams {
  all?: boolean;
  participating?: boolean;
  since?: string;
  before?: string;
  perPage?: number;
  page?: number;
}

async function fetchNotifications(params: FetchParams = {}) {
  const qs = new URLSearchParams({
    all: String(params.all ?? false),
    per_page: String(params.perPage ?? 50),
    page: String(params.page ?? 1),
  });
  if (params.participating) qs.set("participating", String(params.participating));
  if (params.since) qs.set("since", params.since);
  if (params.before) qs.set("before", params.before);

  const response = await fetch(`https://api.github.com/notifications?${qs}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function markThreadAsRead(threadId: string): Promise<void> {
  const response = await fetch(`https://api.github.com/notifications/threads/${threadId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

export { fetchNotifications, markThreadAsRead };
