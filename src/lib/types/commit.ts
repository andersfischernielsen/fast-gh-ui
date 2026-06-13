export interface PRCommitData {
  sha: string;
  author: { login: string; avatarUrl: string } | null;
  commit: { message: string; author: { name: string; date: string } };
}

export interface CommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CommitDetail {
  sha: string;
  message: string;
  author: { login: string; avatarUrl: string };
  date: string;
  files: CommitFile[];
}
