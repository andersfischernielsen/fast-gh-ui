export interface ReactionData {
  emoji: string;
  authors: string[];
}

export interface CommentData {
  id: number;
  body: string;
  user: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  reactions: Promise<ReactionData[]>;
}

export interface ReviewCommentData extends CommentData {
  commitId: string;
  path: string;
  line: number;
  originalLine: number | null;
  inReplyToId: number | null;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | undefined;
}

export interface InlineCommentData {
  id: number;
  body: string;
  user: { login: string; avatarUrl: string };
  createdAt: string;
  path: string;
  line: number | null;
  originalLine: number | null;
  inReplyToId: number | null;
  reactions: Promise<ReactionData[]>;
}
