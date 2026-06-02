import { createClient } from "./client";

async function fetchPullRequest(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  return response.data;
}

async function listPRComments(owner: string, repo: string, pullNumber: number, page?: number) {
  const octokit = createClient();
  const response = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
    page,
  });
  return response.data;
}

async function createPRComment(owner: string, repo: string, pullNumber: number, body: string) {
  const octokit = createClient();
  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
  return response.data;
}

async function listPRCommits(owner: string, repo: string, pullNumber: number, page?: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
    page,
  });
  return response.data;
}

async function listPRFiles(owner: string, repo: string, pullNumber: number, page?: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
    page,
  });
  return response.data;
}

async function listInlineComments(owner: string, repo: string, pullNumber: number, page?: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
    page,
  });
  return response.data;
}

async function createReview(
  owner: string,
  repo: string,
  pullNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES",
  body?: string,
) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event,
    body,
  });
  return response.data;
}

async function fetchCommit(owner: string, repo: string, sha: string) {
  const octokit = createClient();
  const response = await octokit.rest.repos.getCommit({ owner, repo, ref: sha });
  return response.data;
}

async function createInlineComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
  commitId: string,
  path: string,
  line: number,
  startLine?: number,
  inReplyTo?: number,
) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.createReviewComment({
    owner,
    repo,
    pull_number: pullNumber,
    body,
    commit_id: commitId,
    path,
    line,
    ...(startLine ? { start_line: startLine, side: "RIGHT" } : {}),
    ...(inReplyTo ? { in_reply_to: inReplyTo } : {}),
  });
  return response.data;
}

async function updateInlineComment(owner: string, repo: string, commentId: number, body: string) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.updateReviewComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
  return response.data;
}

async function deleteInlineComment(owner: string, repo: string, commentId: number) {
  const octokit = createClient();
  await octokit.rest.pulls.deleteReviewComment({
    owner,
    repo,
    comment_id: commentId,
  });
}

async function fetchIssue(owner: string, repo: string, issueNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
  return response.data;
}

async function listChecks(owner: string, repo: string, ref: string) {
  const octokit = createClient();
  const response = await octokit.rest.checks.listForRef({
    owner,
    repo,
    ref,
    per_page: 100,
  });
  return response.data;
}

export {
  fetchPullRequest,
  fetchIssue,
  createReview,
  listPRComments,
  createPRComment,
  listPRCommits,
  listPRFiles,
  listInlineComments,
  createInlineComment,
  updateInlineComment,
  deleteInlineComment,
  listChecks,
  fetchCommit,
};
