export interface PullRequest {
  number: number;
  title: string;
  state: string;
  body: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  user: { login: string; avatarUrl: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  merged: boolean;
  draft: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
}
