import { createGitHubClient } from "$lib/server/auth";

async function fetchPullRequest(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return response.data;
}

async function listPRComments(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listCommentReactions(token: string, owner: string, repo: string, commentId: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.reactions.listForIssueComment, {
    owner,
    repo,
    comment_id: commentId,
    per_page: 100,
  });
  return response;
}

async function listReviewCommentReactions(
  token: string,
  owner: string,
  repo: string,
  commentId: number,
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.reactions.listForPullRequestReviewComment, {
    owner,
    repo,
    comment_id: commentId,
    per_page: 100,
  });
  return response;
}

async function createPRComment(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
  return response.data;
}

async function updatePRComment(
  token: string,
  owner: string,
  repo: string,
  commentId: number,
  body: string,
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
  return response.data;
}

async function deletePRComment(token: string, owner: string, repo: string, commentId: number) {
  const octokit = createGitHubClient(token);
  await octokit.rest.issues.deleteComment({
    owner,
    repo,
    comment_id: commentId,
  });
}

async function listPRCommits(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listPRFiles(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listInlineComments(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function createReview(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES",
  body?: string,
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    event,
    body,
  });
  return response.data;
}

async function fetchCommit(token: string, owner: string, repo: string, sha: string) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
  });
  return response.data;
}

async function createInlineComment(
  token: string,
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
  const octokit = createGitHubClient(token);
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
  token: string,
  owner: string,
  repo: string,
  commentId: number,
  body: string,
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.pulls.updateReviewComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
  return response.data;
}

async function deleteInlineComment(token: string, owner: string, repo: string, commentId: number) {
  const octokit = createGitHubClient(token);
  await octokit.rest.pulls.deleteReviewComment({
    owner,
    repo,
    comment_id: commentId,
  });
}

async function fetchIssue(token: string, owner: string, repo: string, issueNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });
  return response.data;
}

async function mergePullRequest(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return response.data;
}

async function updatePullRequest(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
  data: { title?: string; body?: string },
) {
  const octokit = createGitHubClient(token);
  const response = await octokit.rest.pulls.update({
    owner,
    repo,
    pull_number: pullNumber,
    ...data,
  });
  return response.data;
}

async function listReviews(token: string, owner: string, repo: string, pullNumber: number) {
  const octokit = createGitHubClient(token);
  const response = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listChecks(token: string, owner: string, repo: string, ref: string) {
  const octokit = createGitHubClient(token);
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
  listCommentReactions,
  listReviewCommentReactions,
};
