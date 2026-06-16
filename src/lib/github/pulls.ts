import { createClient } from "./client";
import { getToken } from "$lib/stores/token.svelte";
import type { ReactionData } from "$lib/types/comment";

let _currentUser: string | null = null;

async function getCurrentUser(): Promise<string> {
  if (_currentUser) return _currentUser;
  const octokit = createClient();
  const response = await octokit.rest.users.getAuthenticated();
  _currentUser = response.data.login;
  return _currentUser;
}

function mapReactions(raw: Record<string, unknown>[], currentUser: string): ReactionData[] {
  const grouped = new Map<string, { authors: string[]; userReactionId?: number }>();
  for (const r of raw) {
    const emoji = (r.content as string) ?? "";
    const author = (r.user as { login?: string } | undefined)?.login ?? "";
    const reactionId = r.id as number;
    if (!emoji) continue;
    const entry = grouped.get(emoji) ?? { authors: [] };
    entry.authors.push(author);
    if (author === currentUser) {
      entry.userReactionId = reactionId;
    }
    grouped.set(emoji, entry);
  }
  return Array.from(grouped.entries()).map(([emoji, { authors, userReactionId }]) => ({
    emoji,
    authors,
    userReactionId,
  }));
}

async function fetchPullRequest(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return response.data;
}

async function listPRComments(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number,
) {
  if (!owner || !repo) return [];

  const octokit = createClient();
  const response = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });
  return response;
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
) {
  if (!owner || !repo) return [];

  const octokit = createClient();
  const response = await octokit.paginate(octokit.rest.pulls.listCommits, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listPRFiles(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
) {
  if (!owner || !repo || !pullNumber) return [];

  const octokit = createClient();
  const response = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listInlineComments(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  page: number = 1,
  perPage: number = 100,
) {
  if (!owner || !repo || !pullNumber) return [];

  const octokit = createClient();
  const response = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: perPage,
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
  const response = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
  });
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
  side: "LEFT" | "RIGHT" = "RIGHT",
  startLine?: number,
  startSide?: "LEFT" | "RIGHT",
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
    side,
    ...(startLine ? { start_line: startLine, start_side: startSide ?? side } : {}),
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
  const response = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });
  return response.data;
}

type MergeMethod = "merge" | "squash" | "rebase";

async function mergePullRequest(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number | undefined,
  mergeMethod?: MergeMethod,
) {
  if (!owner || !repo || !pullNumber) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.pulls.merge({
    owner,
    repo,
    pull_number: pullNumber,
    merge_method: mergeMethod,
  });
  return response.data;
}

async function fetchRepoMergeMethods(owner: string | undefined, repo: string | undefined) {
  if (!owner || !repo) return undefined;

  const octokit = createClient();
  const response = await octokit.rest.repos.get({ owner, repo });
  return {
    merge: response.data.allow_merge_commit ?? true,
    squash: response.data.allow_squash_merge ?? true,
    rebase: response.data.allow_rebase_merge ?? true,
  };
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
  const response = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response;
}

async function listIssueReactions(
  owner: string | undefined,
  repo: string | undefined,
  issueNumber: number,
) {
  if (!owner || !repo) return [];
  const token = getToken();
  if (!token) return [];
  const all: Record<string, unknown>[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/reactions?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) break;
    const data = (await res.json()) as Record<string, unknown>[];
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function listCommentReactions(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
) {
  if (!owner || !repo) return [];
  const token = getToken();
  if (!token) return [];
  const all: Record<string, unknown>[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}/reactions?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) break;
    const data = (await res.json()) as Record<string, unknown>[];
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function listReviewCommentReactions(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
) {
  if (!owner || !repo) return [];
  const token = getToken();
  if (!token) return [];
  const all: Record<string, unknown>[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/comments/${commentId}/reactions?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) break;
    const data = (await res.json()) as Record<string, unknown>[];
    all.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return all;
}

async function createIssueReaction(
  owner: string | undefined,
  repo: string | undefined,
  issueNumber: number,
  content: string,
) {
  if (!owner || !repo) return;
  const octokit = createClient();
  await octokit.rest.reactions.createForIssue({
    owner,
    repo,
    issue_number: issueNumber,
    content: content as any,
  });
}

async function deleteIssueReaction(
  owner: string | undefined,
  repo: string | undefined,
  issueNumber: number,
  reactionId: number,
) {
  if (!owner || !repo) return;
  const octokit = createClient();
  await octokit.request(
    "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}",
    {
      owner,
      repo,
      issue_number: issueNumber,
      reaction_id: reactionId,
    },
  );
}

async function createIssueCommentReaction(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
  content: string,
) {
  if (!owner || !repo) return;
  const octokit = createClient();
  await octokit.rest.reactions.createForIssueComment({
    owner,
    repo,
    comment_id: commentId,
    content: content as any,
  });
}

async function deleteIssueCommentReaction(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
  reactionId: number,
) {
  if (!owner || !repo) return;
  const octokit = createClient();
  await octokit.request(
    "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}",
    {
      owner,
      repo,
      comment_id: commentId,
      reaction_id: reactionId,
    },
  );
}

async function createReviewCommentReaction(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
  content: string,
) {
  if (!owner || !repo) return;
  const octokit = createClient();
  await octokit.rest.reactions.createForPullRequestReviewComment({
    owner,
    repo,
    comment_id: commentId,
    content: content as any,
  });
}

async function deleteReviewCommentReaction(
  owner: string | undefined,
  repo: string | undefined,
  commentId: number,
  reactionId: number,
) {
  if (!owner || !repo) return;
  const octokit = createClient();
  await octokit.request(
    "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}",
    {
      owner,
      repo,
      comment_id: commentId,
      reaction_id: reactionId,
    },
  );
}

async function listPRTimeline(
  owner: string | undefined,
  repo: string | undefined,
  pullNumber: number,
  page: number,
  perPage: number = 20,
) {
  if (!owner || !repo) return [];
  const octokit = createClient();
  const response = await octokit.rest.issues.listEventsForTimeline({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: perPage,
    page,
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
  listPRTimeline,
  fetchIssue,
  mergePullRequest,
  fetchRepoMergeMethods,
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
  getCurrentUser,
  mapReactions,
  listIssueReactions,
  listCommentReactions,
  listReviewCommentReactions,
  createIssueReaction,
  deleteIssueReaction,
  createIssueCommentReaction,
  deleteIssueCommentReaction,
  createReviewCommentReaction,
  deleteReviewCommentReaction,
};
