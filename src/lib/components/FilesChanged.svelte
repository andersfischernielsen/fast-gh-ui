<script lang="ts">
  import { untrack } from "svelte";
  import { applyAction, deserialize } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import FileTree from "./FileTree.svelte";
  import DiffViewer from "./DiffViewer.svelte";
  import type { PRFile, InlineCommentData, ReactionData } from "$lib/types/comment";

  interface ThreadedInlineComment extends InlineCommentData {
    replies: Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
      reactions: Promise<ReactionData[]>;
    }>;
  }

  let {
    files,
    inlineComments,
    headSha,
  }: {
    files: PRFile[];
    inlineComments: InlineCommentData[];
    headSha: string;
  } = $props();

  let selectedFile = $state<string | null>(null);
  let showFileComment = $state(false);
  let fileCommentBody = $state("");
  let fileSubmitting = $state(false);
  let showTree = $state(false);

  let commentsData = $derived.by(() => {
    const all: ThreadedInlineComment[] = inlineComments.map((c) => ({
      ...c,
      replies: [],
    }));

    const byId = new Map<number, ThreadedInlineComment>();
    const roots: ThreadedInlineComment[] = [];
    for (const c of all) {
      byId.set(c.id, c);
      if (!c.inReplyToId) roots.push(c);
    }
    for (const c of all) {
      if (c.inReplyToId) {
        const parent = byId.get(c.inReplyToId);
        if (parent) {
          parent.replies.push({
            id: c.id,
            body: c.body,
            user: c.user,
            createdAt: c.createdAt,
            reactions: c.reactions,
          });
        } else {
          roots.push(c);
        }
      }
    }

    return { roots, byId };
  });

  let inlineCommentsForDiff = $derived(commentsData.roots);

  let currentFile = $derived(
    files.find((f) => f.filename === selectedFile) ?? null,
  );

  $effect(() => {
    const first = files[0]?.filename ?? null;
    if (first !== null) {
      untrack(() => {
        if (selectedFile === null) selectedFile = first;
      });
    }
  });

  async function submitAction(
    actionName: string,
    data: Record<string, string>,
  ) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) fd.set(k, v);
    const res = await fetch(`?/${actionName}`, { method: "POST", body: fd });
    const result = deserialize(await res.text());
    applyAction(result);
    if (result.type === "success") await invalidateAll();
  }

  async function onCreateComment(
    startLine: number,
    endLine: number,
    file: string,
    body: string,
  ) {
    const data: Record<string, string> = {
      body,
      path: file,
      line: String(endLine),
      commitId: headSha,
    };
    if (startLine !== endLine) data.startLine = String(startLine);
    await submitAction("createInlineComment", data);
  }

  async function onReplyComment(commentId: number, body: string) {
    const parent = commentsData.byId.get(commentId);
    const path = parent?.path ?? "";
    const line = parent?.originalLine ?? parent?.line ?? 1;
    await submitAction("createInlineComment", {
      body,
      path,
      line: String(line),
      commitId: headSha,
      inReplyTo: String(commentId),
    });
  }

  async function onUpdateComment(commentId: number, body: string) {
    await submitAction("updateInlineComment", {
      commentId: String(commentId),
      body,
    });
  }

  async function onDeleteComment(commentId: number) {
    await submitAction("deleteInlineComment", { commentId: String(commentId) });
  }

  async function onreaction(
    commentId: number,
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    await submitAction("react", {
      commentId: String(commentId),
      emoji,
      remove: String(remove),
      reactionId: reactionId ? String(reactionId) : "",
    });
  }
</script>

{#if files.length === 0}
  <p class="status">No files changed</p>
{:else}
  <div class="files-changed-container">
    <button class="tree-trigger" onclick={() => (showTree = !showTree)}>
      Files {showTree ? "▾" : "▸"}
    </button>
    <div class="files-changed">
      <div class="tree-wrapper" class:tree-open={showTree}>
        {#if showTree}
          <div
            class="tree-overlay"
            role="button"
            tabindex="0"
            onclick={() => (showTree = false)}
            onkeydown={(e) => e.key === "Enter" && (showTree = false)}
          ></div>
        {/if}
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
            <form
              class="file-comment-input"
              onsubmit={async (e) => {
                e.preventDefault();
                if (!fileCommentBody.trim()) return;
                fileSubmitting = true;
                try {
                  await submitAction("createInlineComment", {
                    body: fileCommentBody,
                    path: currentFile.filename,
                    line: "1",
                    commitId: headSha,
                  });
                  fileCommentBody = "";
                  showFileComment = false;
                } finally {
                  fileSubmitting = false;
                }
              }}
            >
              <textarea
                name="body"
                bind:value={fileCommentBody}
                placeholder="Write a comment on this file..."
                rows={2}
                disabled={fileSubmitting}
              ></textarea>
              <div class="file-comment-actions">
                <button
                  type="button"
                  class="cancel"
                  onclick={() => {
                    showFileComment = false;
                    fileCommentBody = "";
                  }}>Cancel</button
                >
                <button
                  type="submit"
                  class="submit"
                  disabled={fileSubmitting || !fileCommentBody.trim()}
                  >Comment</button
                >
              </div>
            </form>
          {/if}
          <div class="diff-body">
            {#if currentFile.patch}
              <DiffViewer
                patch={currentFile.patch}
                inlineComments={inlineCommentsForDiff.filter(
                  (c) => c.path === currentFile.filename,
                )}
                currentFile={currentFile.filename}
                {headSha}
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
{/if}

<style>
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
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
  .tree-overlay {
    display: none;
  }
  @media (max-width: 768px) {
    .tree-wrapper {
      display: block;
      position: relative;
    }
    .tree-trigger {
      display: block;
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
    .tree-wrapper:not(.tree-open) > :global(.file-tree) {
      display: none;
    }
    .tree-wrapper.tree-open > :global(.file-tree) {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      z-index: 20;
      box-shadow: 4px 0 8px var(--shadow-dialog);
    }
    .tree-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 19;
    }
    .tree-wrapper {
      position: relative;
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
