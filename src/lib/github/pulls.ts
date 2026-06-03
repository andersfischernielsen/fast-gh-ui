import { createClient } from "./client";

async function fetchPullRequest(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  return response.data;
}

async function listPRComments(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number,
  page?: number,
) {
  if (!owner || !repo) return [];

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

async function createPRComment(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number,
  body: string,
) {
  if (!owner || !repo) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
  return response.data;
}

async function updatePRComment(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number | undefined,
  body: string,
) {
  if (!owner || !repo || !commentId) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
  return response.data;
}

async function deletePRComment(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
) {
  if (!owner || !repo) return;

  const octokit = createClient();
  await octokit.rest.issues.deleteComment({
    owner,
    repo,
    comment_id: commentId,
  });
}

async function listPRCommits(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number,
  page?: number,
) {
  if (!owner || !repo) return [];

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

async function listPRFiles(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  page?: number,
) {
  if (!owner || !repo || !pullNumber) return [];

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

async function listInlineComments(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  page?: number,
) {
  if (!owner || !repo || !pullNumber) return [];

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
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  event: "APPROVE" | "REQUEST_CHANGES",
  body?: string,
) {
  if (!owner || !repo || !pullNumber) return undefined;

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
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  body: string,
  commitId: string,
  path: string,
  line: number,
  startLine?: number,
  inReplyTo?: number,
) {
  if (!owner || !repo || !pullNumber) return undefined;

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

async function updateInlineComment(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number | undefined,
  body: string,
) {
  if (!owner || !repo || !commentId) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.pulls.updateReviewComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
  return response.data;
}

async function deleteInlineComment(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
) {
  if (!owner || !repo) return;

  const octokit = createClient();
  await octokit.rest.pulls.deleteReviewComment({
    owner,
    repo,
    comment_id: commentId,
  });
}

async function fetchIssue(
  owner: string | undefined,
  repo: string | undefined,
  issueNumber: number | undefined,
) {
  if (!owner || !repo || !issueNumber) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
  return response.data;
}

async function mergePullRequest(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
) {
  if (!owner || !repo || !pullNumber) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return response.data;
}

async function updatePullRequest(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  data: { title?: string; body?: string },
) {
  if (!owner || !repo || !pullNumber) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.pulls.update({
    owner,
    repo,
    pull_number: pullNumber,
    ...data,
  });
  return response.data;
}

async function listReviews(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
) {
  if (!owner || !repo || !pullNumber) return [];

  const octokit = createClient();
  const response = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response.data;
}

async function listChecks(owner: string | undefined, repo: string | undefined, ref: string) {
  if (!owner || !repo) return undefined;

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
  mergePullRequest,
  updatePullRequest,
  createReview,
  listPRComments,
  createPRComment,
  updatePRComment,
  deletePRComment,
  listPRCommits,
  listPRFiles,
  listInlineComments,
  createInlineComment,
  updateInlineComment,
  deleteInlineComment,
  listChecks,
  listReviews,
  fetchCommit,
};
