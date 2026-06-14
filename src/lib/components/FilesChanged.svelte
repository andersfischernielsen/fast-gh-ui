<script lang="ts">
  import { page } from "$app/stores";
  import FileTree from "./FileTree.svelte";
  import DiffViewer from "./DiffViewer.svelte";
  import Comment from "./Comment.svelte";
  import {
    listPRFiles,
    listInlineComments,
    createInlineComment,
    updateInlineComment,
    deleteInlineComment,
    createReviewCommentReaction,
    deleteReviewCommentReaction,
  } from "$lib/github/pulls";

  let { headSha: sha = "" }: { headSha?: string } = $props();

  let files = $state<PRFile[]>([]);
  let selectedFile = $state<string | null>(null);
  let showFileComment = $state(false);
  let fileCommentBody = $state("");
  let fileSubmitting = $state(false);
  let showTree = $state(false);
  let inlineComments = $state<
    Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
      path: string;
      line: number | null;
      startLine: number | null;
      originalLine: number | null;
      originalStartLine: number | null;
      side: "LEFT" | "RIGHT";
      outdated: boolean;
      replies: Array<{
        id: number;
        body: string;
        user: { login: string; avatarUrl: string };
        createdAt: string;
      }>;
    }>
  >([]);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  type InlineComment = (typeof inlineComments)[number];

  // Non-reactive map used to thread replies incrementally across pages
  let commentMap = new Map<number, InlineComment>();

  function processCommentBatch(rawBatch: Record<string, unknown>[]): void {
    for (const c of rawBatch) {
      const id = c.id as number;
      const body = (c.body as string) ?? "";
      const user = {
        login: (c.user as { login?: string })?.login ?? "",
        avatarUrl: (c.user as { avatar_url?: string })?.avatar_url ?? "",
      };
      const createdAt = c.created_at as string;
      const inReplyToId = c.in_reply_to_id as number | undefined;

      if (inReplyToId) {
        commentMap.get(inReplyToId)?.replies.push({ id, body, user, createdAt });
      } else {
        const line = c.line as number | null;
        const side = (c.side as "LEFT" | "RIGHT" | undefined) ?? "RIGHT";
        commentMap.set(id, {
          id, body, user, createdAt,
          path: c.path as string,
          line,
          startLine: c.start_line as number | null,
          originalLine: c.original_line as number | null,
          originalStartLine: c.original_start_line as number | null,
          side,
          outdated: line === null,
          replies: [],
        });
      }
    }
    inlineComments = [...commentMap.values()];
  }

  async function loadAllComments(): Promise<void> {
    commentMap = new Map();
    let page = 1;
    while (true) {
      const batch = await listInlineComments(owner, repo, number, page, 100);
      if (!batch.length) break;
      processCommentBatch(batch as Record<string, unknown>[]);
      if (batch.length < 100) break;
      page++;
    }
  }

  async function loadFiles(): Promise<void> {
    const raw = await listPRFiles(owner, repo, number);
    files = raw.map((f: Record<string, unknown>) => ({
      filename: f.filename as string,
      status: f.status as string,
      additions: f.additions as number,
      deletions: f.deletions as number,
      changes: f.changes as number,
      patch: f.patch as string | undefined,
    }));
    if (files.length > 0) selectedFile = files[0].filename;
    loadAllComments().catch(() => {});
  }

  let currentFile = $derived(
    files.find((f) => f.filename === selectedFile) ?? null,
  );

  let outdatedComments = $derived(
    inlineComments.filter(
      (c) => c.path === selectedFile && c.outdated,
    ),
  );
  let showOutdated = $state(false);

  async function onCreateComment(
    startLine: number,
    endLine: number,
    file: string,
    body: string,
    startSide: "LEFT" | "RIGHT",
    endSide: "LEFT" | "RIGHT",
  ) {
    const isSingleLine = startLine === endLine && startSide === endSide;
    const comment = await createInlineComment(
      owner,
      repo,
      number,
      body,
      sha,
      file,
      endLine,
      endSide,
      isSingleLine ? undefined : startLine,
      isSingleLine ? undefined : startSide,
    );
    inlineComments = [
      ...inlineComments,
      {
        id: comment.id,
        body: (comment.body as string) ?? "",
        user: {
          login: (comment.user as { login?: string })?.login ?? "",
          avatarUrl:
            (comment.user as { avatar_url?: string })?.avatar_url ?? "",
        },
        createdAt: comment.created_at as string,
        path: comment.path as string,
        line: comment.line as number | null,
        startLine: comment.start_line as number | null,
        originalLine: comment.original_line as number | null,
        originalStartLine: comment.original_start_line as number | null,
        side:
          ((comment.side as "LEFT" | "RIGHT" | undefined) ?? "RIGHT"),
        outdated: false,
        replies: [],
      },
    ];
  }
  async function onUpdateComment(commentId: number, body: string) {
    await updateInlineComment(owner, repo, commentId, body);
    inlineComments = inlineComments.map((c) => {
      if (c.id === commentId) return { ...c, body };
      c.replies = c.replies.map((r) =>
        r.id === commentId ? { ...r, body } : r,
      );
      return c;
    });
  }

  async function onDeleteComment(commentId: number) {
    await deleteInlineComment(owner, repo, commentId);
    inlineComments = inlineComments
      .map((c) => {
        c.replies = c.replies.filter((r) => r.id !== commentId);
        return c;
      })
      .filter((c) => c.id !== commentId);
  }

  async function onReplyComment(commentId: number, body: string) {
    const parent = inlineComments.find((c) => c.id === commentId);
    const path = parent?.path ?? "";
    const line = parent?.originalLine ?? parent?.line ?? 1;
    const comment = await createInlineComment(
      owner,
      repo,
      number,
      body,
      sha,
      path,
      line,
      "RIGHT",
      undefined,
      undefined,
      commentId,
    );
    inlineComments = inlineComments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [
            ...c.replies,
            {
              id: comment.id,
              body: (comment.body as string) ?? "",
              user: {
                login: (comment.user as { login?: string })?.login ?? "",
                avatarUrl:
                  (comment.user as { avatar_url?: string })?.avatar_url ?? "",
              },
              createdAt: comment.created_at as string,
            },
          ],
        };
      }
      return c;
    });
  }

  async function onreaction(
    commentId: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    if (remove && reactionId) {
      await deleteReviewCommentReaction(
        owner,
        repo,
        commentId,
        reactionId,
      );
    } else {
      await createReviewCommentReaction(owner, repo, commentId, emoji);
    }
  }
</script>

{#await loadFiles()}
  <p class="status">Loading files...</p>
{:then}
  <div class="files-changed-container">
    <button class="tree-trigger" onclick={() => (showTree = !showTree)}>
      <span>Files</span>
      <span class="tree-arrow">{showTree ? "▾" : "▸"}</span>
    </button>
    <div class="files-changed">
      <div class="tree-wrapper" class:tree-open={showTree}>
        <FileTree
          {files}
          {selectedFile}
          onselect={(f: string) => {
            selectedFile = f;
            showTree = false;
          }}
        />
      </div>
      <div class="diff-panel">
        {#if currentFile}
          {#if outdatedComments.length}
            <button
              class="outdated-toggle"
              onclick={() => (showOutdated = !showOutdated)}
            >
              <span
                >{outdatedComments.length} outdated comment{outdatedComments.length ===
                1
                  ? ""
                  : "s"}</span
              >
              <span class="outdated-arrow">{showOutdated ? "▾" : "▸"}</span>
            </button>
            {#if showOutdated}
              <div class="outdated-list">
                {#each outdatedComments as comment (comment.id)}
                  <div class="outdated-comment">
                    <Comment
                      comment={{
                        id: comment.id,
                        body: comment.body,
                        user: comment.user,
                        createdAt: comment.createdAt,
                        isReview: true,
                      }}
                      replies={comment.replies}
                      {owner}
                      {repo}
                      onupdate={onUpdateComment}
                      ondelete={onDeleteComment}
                      onreply={onReplyComment}
                      {onreaction}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
          <div class="diff-header">
            <span class="diff-filename">
              <span>{currentFile.filename}</span>
              <button
                class="file-comment-btn"
                onclick={() => (showFileComment = !showFileComment)}
                title="Comment on this file">+</button
              >
            </span>
            <span class="diff-stats">
              <span class="add">+{currentFile.additions}</span>
              <span class="del">−{currentFile.deletions}</span>
            </span>
          </div>
          {#if showFileComment}
            <div class="file-comment-input">
              <textarea
                bind:value={fileCommentBody}
                placeholder="Write a comment on this file..."
                rows={2}
                disabled={fileSubmitting}
              ></textarea>
              <div class="file-comment-actions">
                <button
                  class="cancel"
                  onclick={() => {
                    showFileComment = false;
                    fileCommentBody = "";
                  }}>Cancel</button
                >
                <button
                  class="submit"
                  onclick={async () => {
                    if (
                      !fileCommentBody.trim() ||
                      fileSubmitting ||
                      !currentFile
                    )
                      return;
                    fileSubmitting = true;
                    try {
                      await createInlineComment(
                        owner,
                        repo,
                        number,
                        fileCommentBody,
                        sha,
                        currentFile.filename,
                        1,
                      );
                      inlineComments = [
                        ...inlineComments,
                        {
                          id: Date.now(),
                          body: fileCommentBody,
                          user: { login: "", avatarUrl: "" },
                          createdAt: new Date().toISOString(),
                          path: currentFile.filename,
                          line: 1,
                          startLine: null,
                          originalLine: 1,
                          originalStartLine: null,
                          side: "RIGHT",
                          outdated: false,
                          replies: [],
                        },
                      ];
                      fileCommentBody = "";
                      showFileComment = false;
                    } finally {
                      fileSubmitting = false;
                    }
                  }}
                  disabled={fileSubmitting || !fileCommentBody.trim()}
                  >Comment</button
                >
              </div>
            </div>
          {/if}
          <div class="diff-body">
            {#if currentFile.patch}
              <DiffViewer
                patch={currentFile.patch}
                inlineComments={inlineComments.filter(
                  (c) => c.path === currentFile.filename,
                )}
                currentFile={currentFile.filename}
                {owner}
                {repo}
                {onCreateComment}
                {onUpdateComment}
                {onDeleteComment}
                {onReplyComment}
                {onreaction}
              />
            {:else}
              <p class="status">No diff available (binary file or too large)</p>
            {/if}
          </div>
        {:else}
          <p class="status">Select a file</p>
        {/if}
      </div>
    </div>
  </div>
{:catch error}
  <p class="status error">{error.message}</p>
{/await}

<style>
  .status {
    padding: 24px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
  .files-changed-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .tree-trigger {
    display: none;
  }
  .files-changed {
    display: flex;
    flex: 1;
    height: 100%;
    overflow: hidden;
  }
  .tree-wrapper {
    display: contents;
  }
  @media (max-width: 768px) {
    .files-changed {
      flex-direction: column;
    }
    .tree-wrapper {
      display: block;
      width: 100%;
      flex-shrink: 0;
    }
    .tree-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 12px;
      border: none;
      border-bottom: 1px solid var(--border-primary);
      background: var(--bg-secondary);
      font-size: 12px;
      cursor: pointer;
      color: var(--text-primary);
      font-family: inherit;
      text-align: left;
      width: 100%;
      flex-shrink: 0;
    }
    .tree-trigger:hover {
      background: var(--bg-tertiary);
    }
    .tree-arrow {
      color: var(--text-secondary);
    }
    .tree-wrapper:not(.tree-open) > :global(.file-tree) {
      display: none;
    }
    .tree-wrapper.tree-open > :global(.file-tree) {
      max-width: 100%;
      min-width: 0;
      width: 100%;
      max-height: 40vh;
      border-right: none;
      border-bottom: 1px solid var(--border-primary);
    }
  }
  .diff-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .diff-header {
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-primary);
    font-size: 12px;
    font-family: monospace;
    display: flex;
    justify-content: space-between;
  }
  .outdated-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 12px 12px;
    border: none;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    font-size: 12px;
    font-family: inherit;
    color: var(--text-primary);
    text-align: left;
    cursor: pointer;
    flex-shrink: 0;
  }
  .outdated-toggle:hover {
    background: var(--bg-tertiary);
  }
  .outdated-arrow {
    color: var(--text-secondary);
  }
  .outdated-list {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    padding: 8px 16px;
    max-height: 40vh;
    overflow-y: auto;
    flex-shrink: 0;
  }
  .outdated-comment {
    padding-top: 6px;
  }
  .outdated-comment:first-child {
    padding-top: 0;
  }
  .diff-stats {
    font-size: 12px;
  }
  .diff-stats .add {
    color: var(--text-success);
  }
  .diff-stats .del {
    color: var(--text-danger);
  }
  .diff-filename {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .file-comment-btn {
    width: 18px;
    height: 18px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    font-size: 11px;
    font-weight: 600;
    color: var(--text-link);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
  }
  .file-comment-btn:hover {
    background: var(--bg-selected);
  }
  .file-comment-input {
    padding: 8px 16px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .file-comment-input textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .file-comment-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .file-comment-actions button {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .file-comment-actions .cancel {
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  .file-comment-actions .submit {
    border: 1px solid var(--btn-primary-bg);
    background: var(--btn-primary-bg);
    color: var(--text-white);
  }
  .file-comment-actions .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .diff-body {
    flex: 1;
    overflow-y: auto;
  }
</style>
