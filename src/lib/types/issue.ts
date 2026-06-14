export interface IssueData {
  number: number;
  title: string;
  state: string;
  body: string | null;
  user: { login: string };
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}
