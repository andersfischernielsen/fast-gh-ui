import { error } from "@sveltejs/kit";
import { githubErrorMessage } from "$lib/server/auth";
import { fetchNotifications, markThreadAsRead } from "$lib/server/github/notifications";
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

  return { notifications };
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
