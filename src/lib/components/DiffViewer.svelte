<script lang="ts">
  import Comment from "./Comment.svelte";
  import {
    parsePatch,
    suggestionLinesFromPatch,
    type DiffLine,
  } from "$lib/utils/diff";

  interface InlineCommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    line: number | null;
    startLine?: number | null;
    originalLine: number | null;
    originalStartLine?: number | null;
    side?: "LEFT" | "RIGHT";
    outdated?: boolean;
    replies: Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
    }>;
  }

  let {
    patch,
    inlineComments = [],
    currentFile = "",
    owner = "",
    repo = "",
    onCreateComment,
    onUpdateComment,
    onDeleteComment,
    onReplyComment,
    onreaction,
  }: {
    patch: string;
    inlineComments?: InlineCommentData[];
    currentFile?: string;
    owner?: string;
    repo?: string;
    onCreateComment?: (
      startLine: number,
      endLine: number,
      file: string,
      body: string,
      startSide: "LEFT" | "RIGHT",
      endSide: "LEFT" | "RIGHT",
    ) => Promise<void>;
    onUpdateComment?: (commentId: number, body: string) => Promise<void>;
    onDeleteComment?: (commentId: number) => Promise<void>;
    onReplyComment?: (commentId: number, body: string) => Promise<void>;
    onreaction?: (
      commentId: number,
      emoji: string,
      remove: boolean,
      reactionId?: number,
    ) => Promise<void>;
  } = $props();

  let selecting = $state(false);
  let selectionStart = $state<number | null>(null);
  let selectionEnd = $state<number | null>(null);
  let commentStartLine = $state<number | null>(null);
  let commentEndLine = $state<number | null>(null);
  let commentStartSide = $state<"LEFT" | "RIGHT">("RIGHT");
  let commentEndSide = $state<"LEFT" | "RIGHT">("RIGHT");
  let commentIndex = $state<number | null>(null);
  let commentBody = $state("");
  let submitting = $state(false);
  let containerEl = $state<HTMLElement | null>(null);

  let lineIndex = $derived.by(() => {
    const newLineToIdx = new Map<number, number>();
    const oldLineToIdx = new Map<number, number>();
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.newLine != null) newLineToIdx.set(l.newLine, i);
      if (l.oldLine != null) oldLineToIdx.set(l.oldLine, i);
    }
    return { newLineToIdx, oldLineToIdx };
  });

  let placement = $derived.by(() => {
    const byIndex: InlineCommentData[][] = Array.from(
      { length: lines.length },
      () => [],
    );
    const newHighlights = new Set<number>();
    const oldHighlights = new Set<number>();
    const orphans: InlineCommentData[] = [];
    const { newLineToIdx, oldLineToIdx } = lineIndex;

    for (const c of inlineComments) {
      if (c.outdated) continue;

      const side: "LEFT" | "RIGHT" = c.side ?? "RIGHT";
      const primaryEnd = c.line;
      const primaryStart = c.startLine ?? c.line;
      const primaryMap = side === "RIGHT" ? newLineToIdx : oldLineToIdx;
      const targetSet = side === "RIGHT" ? newHighlights : oldHighlights;

      let idx: number | undefined;
      if (primaryEnd != null) idx = primaryMap.get(primaryEnd);
      if (idx == null && c.originalLine != null) {
        idx =
          newLineToIdx.get(c.originalLine) ??
          oldLineToIdx.get(c.originalLine);
      }

      if (idx != null) {
        byIndex[idx].push(c);
        if (primaryStart != null && primaryEnd != null) {
          for (let n = primaryStart; n <= primaryEnd; n++) targetSet.add(n);
        }
      } else {
        orphans.push(c);
      }
    }
    return {
      byIndex,
      linesWithComments: {
        newLines: newHighlights,
        oldLines: oldHighlights,
      },
      orphans,
    };
  });

  let commentsByIndex = $derived(placement.byIndex);
  let linesWithComments = $derived(placement.linesWithComments);
  let orphanComments = $derived(placement.orphans);

  let lines = $derived(parsePatch(patch));

  function getSuggestionLines(comment: InlineCommentData): string[] {
    const side = comment.side ?? "RIGHT";
    const end = comment.line ?? comment.originalLine;
    const start = comment.startLine ?? comment.originalStartLine ?? end;
    if (end == null || start == null) return [];
    return suggestionLinesFromPatch(lines, side, start, end);
  }

  function isSelected(i: number): boolean {
    if (selectionStart == null || selectionEnd == null) return false;
    const min = Math.min(selectionStart, selectionEnd);
    const max = Math.max(selectionStart, selectionEnd);
    return i >= min && i <= max;
  }

  function canSelect(type: string): boolean {
    return type !== "header";
  }

  function beginSelection(idx: number, e: MouseEvent) {
    e.preventDefault();
    selecting = true;
    selectionStart = idx;
    selectionEnd = idx;
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", endSelection);
  }

  function handleDrag(e: MouseEvent) {
    const rows = containerEl?.querySelectorAll("[data-index]");
    if (!rows) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    for (const row of rows) {
      if (row.contains(target)) {
        const n = parseInt((row as HTMLElement).dataset.index || "", 10);
        const type = (row as HTMLElement).dataset.type || "";
        if (!isNaN(n) && canSelect(type)) {
          selectionEnd = n;
        }
        break;
      }
    }
  }

  function endSelection() {
    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", endSelection);
    if (selectionStart != null && selectionEnd != null) {
      const startIdx = Math.min(selectionStart, selectionEnd);
      const endIdx = Math.max(selectionStart, selectionEnd);
      const sl = lines[startIdx];
      const el = lines[endIdx];
      const startNum = sl?.newLine ?? sl?.oldLine;
      const endNum = el?.newLine ?? el?.oldLine;
      if (startNum != null && endNum != null) {
        commentStartLine = startNum;
        commentStartSide = sl.newLine ? "RIGHT" : "LEFT";
        commentEndLine = endNum;
        commentEndSide = el.newLine ? "RIGHT" : "LEFT";
        commentIndex = endIdx;
      }
    }
    selecting = false;
  }

  function cancelComment() {
    commentStartLine = null;
    commentEndLine = null;
    commentStartSide = "RIGHT";
    commentEndSide = "RIGHT";
    commentIndex = null;
    commentBody = "";
    selectionStart = null;
    selectionEnd = null;
  }

  function insertSuggestion() {
    if (selectionStart == null || selectionEnd == null) {
      commentBody += "```suggestion\n```";
      return;
    }
    const startIdx = Math.min(selectionStart, selectionEnd);
    const endIdx = Math.max(selectionStart, selectionEnd);
    const content = lines
      .slice(startIdx, endIdx + 1)
      .filter((l) => l.newLine != null)
      .map((l) => l.content)
      .join("\n");
    commentBody += "```suggestion\n" + content + "\n```";
  }

  async function submitComment() {
    if (
      !commentBody.trim() ||
      submitting ||
      commentStartLine == null ||
      commentEndLine == null
    )
      return;
    submitting = true;
    try {
      if (onCreateComment)
        await onCreateComment(
          commentStartLine,
          commentEndLine,
          currentFile,
          commentBody,
          commentStartSide,
          commentEndSide,
        );
      cancelComment();
    } finally {
      submitting = false;
    }
  }
</script>

<div class="diff-viewer">
  <div class="diff-lines" bind:this={containerEl}>
    <table class="diff-table">
      <tbody>
        {#each lines as line, i (i)}
          <tr
            class="diff-row"
            class:row-add={line.type === "add"}
            class:row-remove={line.type === "remove"}
            class:row-header={line.type === "header"}
            class:selected={isSelected(i)}
            class:has-comment={(line.newLine != null &&
              linesWithComments.newLines.has(line.newLine)) ||
              (line.oldLine != null &&
                linesWithComments.oldLines.has(line.oldLine))}
            data-index={i}
            data-type={line.type}
          >
            {#if line.type === "header"}
              <td class="ln ln-old"></td>
              <td class="ln ln-new"></td>
              <td class="cell-code">{line.content}</td>
            {:else}
              <td class="ln ln-old">{line.oldLine ?? ""}</td>
              <td class="ln ln-new">{line.newLine ?? ""}</td>
              <td class="cell-code">
                <span class="code"
                  >{(line.type === "add"
                    ? "+"
                    : line.type === "remove"
                      ? "-"
                      : " ") + line.content}</span
                >
                {#if canSelect(line.type) && onCreateComment}
                  <button
                    class="add-btn"
                    onmousedown={(e) => beginSelection(i, e)}>+</button
                  >
                {/if}
              </td>
            {/if}
          </tr>
          {#each commentsByIndex[i] as comment (comment.id)}
            <tr class="comment-wrapper">
              <td colspan="3">
                <div class="comment-inner">
                  <Comment
                    comment={{
                      id: comment.id,
                      body: comment.body,
                      user: comment.user,
                      createdAt: comment.createdAt,
                      isReview: true,
                    }}
                    replies={comment.replies}
                    suggestionLines={getSuggestionLines(comment)}
                    {owner}
                    {repo}
                    onupdate={onUpdateComment}
                    ondelete={onDeleteComment}
                    onreply={onReplyComment}
                    {onreaction}
                  />
                </div>
              </td>
            </tr>
          {/each}
          {#if commentIndex === i}
            <tr class="comment-input-row">
              <td colspan="3">
                <div class="comment-input">
                  <div class="comment-toolbar">
                    <span class="comment-range">
                      {commentStartLine === commentEndLine
                        ? `Comment on line R${commentStartLine}`
                        : `Comment on lines R${commentStartLine} to R${commentEndLine}`}
                    </span>
                    <button
                      class="suggestion-btn"
                      title="Insert suggestion"
                      onclick={insertSuggestion}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path
                          d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81 4 10.561v.689h.752l.75-.211.001-.001 5.686-5.788z"
                        />
                      </svg>
                      Suggestion
                    </button>
                  </div>
                  <textarea
                    bind:value={commentBody}
                    placeholder="Write a comment..."
                    rows={3}
                    disabled={submitting}
                  ></textarea>
                  <div class="comment-actions">
                    <button class="cancel" onclick={cancelComment}
                      >Cancel</button
                    >
                    <button
                      class="submit-btn"
                      onclick={submitComment}
                      disabled={submitting || !commentBody.trim()}
                      >Comment</button
                    >
                  </div>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
  {#if orphanComments.length}
    <section class="extra-comments">
      <header class="extra-header">
        {orphanComments.length} comment{orphanComments.length === 1
          ? ""
          : "s"} on lines no longer in this diff
      </header>
      {#each orphanComments as comment (comment.id)}
        <div class="extra-comment">
          <Comment
            comment={{
              id: comment.id,
              body: comment.body,
              user: comment.user,
              createdAt: comment.createdAt,
              isReview: true,
            }}
            replies={comment.replies}
            suggestionLines={getSuggestionLines(comment)}
            {owner}
            {repo}
            onupdate={onUpdateComment}
            ondelete={onDeleteComment}
            onreply={onReplyComment}
            {onreaction}
          />
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .diff-viewer {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 12px;
  }
  .diff-lines {
    overflow-x: auto;
    overflow-y: auto;
  }
  .diff-table {
    border-collapse: collapse;
    table-layout: auto;
    width: 100%;
  }
  .diff-row {
    line-height: 20px;
    height: 20px;
    font-size: 11px;
  }
  .diff-row.row-header {
    background: var(--diff-header-bg);
    color: var(--diff-header-text);
    font-size: 11px;
  }
  .diff-row.row-add {
    background: var(--diff-add-bg);
  }
  .diff-row.row-remove {
    background: var(--diff-remove-bg);
  }
  .diff-row.row-add.selected {
    background: var(--diff-add-selected-bg);
  }
  .diff-row.row-remove.selected {
    background: var(--diff-remove-selected-bg);
  }
  .diff-row.row-add.has-comment {
    background: var(--diff-add-comment-bg);
  }
  .diff-row.row-remove.has-comment {
    background: var(--diff-remove-comment-bg);
  }
  .diff-row:not(.row-add):not(.row-remove):not(.row-header).selected {
    background: var(--bg-selected);
  }
  .ln {
    width: 48px;
    text-align: right;
    padding: 0 8px;
    color: var(--text-secondary);
    user-select: none;
    border-right: 1px solid var(--border-primary);
    vertical-align: top;
  }
  .cell-code {
    padding: 0;
    position: relative;
  }
  .code {
    white-space: pre;
    padding-right: 8px;
    display: block;
  }
  .add-btn {
    opacity: 0;
    position: absolute;
    left: 6px;
    top: 1px;
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
    z-index: 1;
  }
  .diff-row:hover .add-btn,
  .diff-row.selected .add-btn {
    opacity: 1;
  }
  .add-btn:hover {
    background: var(--bg-selected);
  }

  .comment-input-row td {
    padding: 0;
  }
  .comment-input {
    padding: 8px 8px 8px 104px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-primary);
    border-bottom: 1px solid var(--border-primary);
  }
  .comment-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .comment-range {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .suggestion-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
  }
  .suggestion-btn:hover {
    background: var(--bg-selected);
  }
  .comment-input textarea {
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
  .comment-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }
  .comment-actions button {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .comment-actions .cancel {
    border: 1px solid var(--border-primary);
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  .comment-actions .submit-btn {
    border: 1px solid var(--btn-primary-bg);
    background: var(--btn-primary-bg);
    color: var(--text-white);
  }
  .comment-actions .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .comment-wrapper td {
    padding: 0;
    border-top: 1px solid var(--border-primary);
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    max-width: 80vw;
  }
  .extra-comments {
    border-top: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    padding: 8px 12px;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .extra-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    padding-bottom: 6px;
  }
  .extra-toggle {
    background: none;
    border: none;
    padding: 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
  }
  .extra-toggle:hover {
    color: var(--text-primary);
  }
  .extra-comment {
    padding-top: 6px;
  }
</style>
