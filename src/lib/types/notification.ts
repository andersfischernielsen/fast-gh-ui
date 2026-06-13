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

export type { NotificationItem };
