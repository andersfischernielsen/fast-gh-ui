<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import FileTree from "./FileTree.svelte";
  import DiffViewer from "./DiffViewer.svelte";
  import {
    listPRFiles,
    listInlineComments,
    createInlineComment,
    updateInlineComment,
    deleteInlineComment,
  } from "$lib/github/pulls";

  interface PRFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }

  let { headSha: sha = "" }: { headSha?: string } = $props();

  let files = $state<PRFile[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedFile = $state<string | null>(null);
  let showFileComment = $state(false);
  let fileCommentBody = $state("");
  let fileSubmitting = $state(false);
  let inlineComments = $state<
    Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
      path: string;
      line: number | null;
      originalLine: number | null;
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

  onMount(async () => {
    try {
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

      const rawComments = await listInlineComments(owner, repo, number);
      const allComments = rawComments.map((c: Record<string, unknown>) => ({
        id: c.id as number,
        body: (c.body as string) ?? "",
        user: {
          login: (c.user as { login?: string })?.login ?? "",
          avatarUrl: (c.user as { avatar_url?: string })?.avatar_url ?? "",
        },
        createdAt: c.created_at as string,
        path: c.path as string,
        line: c.line as number | null,
        originalLine: c.original_line as number | null,
        inReplyToId: c.in_reply_to_id as number | undefined,
        replies: [] as Array<{
          id: number;
          body: string;
          user: { login: string; avatarUrl: string };
          createdAt: string;
        }>,
      }));

      const replyMap = new Map<number, (typeof allComments)[number]>();
      const rootComments: typeof allComments = [];
      for (const c of allComments) {
        replyMap.set(c.id, c);
        if (!c.inReplyToId) {
          rootComments.push(c);
        }
      }
      for (const c of allComments) {
        if (c.inReplyToId) {
          const parent = replyMap.get(c.inReplyToId);
          if (parent) {
            parent.replies.push({
              id: c.id,
              body: c.body,
              user: c.user,
              createdAt: c.createdAt,
            });
          } else {
            rootComments.push(c);
          }
        }
      }
      inlineComments = rootComments.map(({ inReplyToId: _, ...rest }) => rest);
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  let currentFile = $derived(
    files.find((f) => f.filename === selectedFile) ?? null,
  );

  async function onCreateComment(
    startLine: number,
    endLine: number,
    file: string,
    body: string,
  ) {
    const start = startLine === endLine ? undefined : startLine;
    const comment = await createInlineComment(
      owner,
      repo,
      number,
      body,
      sha,
      file,
      endLine,
      start,
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
        originalLine: comment.original_line as number | null,
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
</script>

{#if loading}
  <p class="status">Loading files...</p>
{:else if error}
  <p class="status error">{error}</p>
{:else}
  <div class="files-changed">
    <FileTree
      {files}
      {selectedFile}
      onselect={(f: string) => (selectedFile = f)}
    />
    <div class="diff-panel">
      {#if currentFile}
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
                  if (!fileCommentBody.trim() || fileSubmitting || !currentFile)
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
                        line: null,
                        originalLine: 1,
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
              headSha={sha}
              {onCreateComment}
              {onUpdateComment}
              {onDeleteComment}
              {onReplyComment}
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
{/if}

<style>
  .status {
    padding: 24px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
  .files-changed {
    display: flex;
    height: 100%;
    overflow: hidden;
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
