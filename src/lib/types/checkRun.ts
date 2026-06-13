export interface CheckRunData {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
}
