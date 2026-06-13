import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { fetchNotifications, markThreadAsRead } from "$lib/server/github/notifications";
import { fetchPullRequest } from "$lib/server/github/pulls";
import type { NotificationItem } from "$lib/types/notification";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  const token = locals.token!;
  const notifications: Promise<NotificationItem[]> = fetchNotifications(token, {
    all: true,
    perPage: 50,
  }).catch((e: unknown) => {
    const msg = githubErrorMessage(e);
    if (msg.includes("403") || msg.includes("Resource not accessible")) {
      throw error(
        500,
        "Token does not have Notifications permission. Ensure the token has Notifications (Read) under Account Permissions — not Repository Permissions.",
      );
    }
    throw error(500, msg);
  });

  const prStates: Promise<Record<string, string>> = notifications.then(async (items) => {
    const prItems = items.filter((n) => n.subject.type === "PullRequest");
    const entries = await Promise.all(
      prItems.map(async (n) => {
        const match = n.subject.url.match(/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)/);
        if (!match) return null;
        const [, owner, repo, num] = match;
        const key = `${owner}/${repo}#${num}`;
        try {
          const pr = await fetchPullRequest(token, owner, repo, parseInt(num));
          const state = pr.state === "closed" && pr.merged ? "merged" : pr.state;
          return [key, state] as [string, string];
        } catch {
          return null;
        }
      }),
    );
    return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null));
  });

  return { notifications, prStates };
};

export const actions: Actions = {
  markRead: async ({ locals, request }) => {
    const token = locals.token!;
    const data = await request.formData();
    const threadId = data.get("threadId");
    if (typeof threadId === "string" && threadId) {
      await markThreadAsRead(token, threadId).catch(() => {});
    }
    return {};
  },
};
