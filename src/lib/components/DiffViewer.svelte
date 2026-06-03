<script lang="ts">
  import InlineComment from "./InlineComment.svelte";

  interface InlineCommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    line: number | null;
    originalLine: number | null;
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
    headSha = "",
    onCreateComment,
    onUpdateComment,
    onDeleteComment,
    onReplyComment,
  }: {
    patch: string;
    inlineComments?: InlineCommentData[];
    currentFile?: string;
    headSha?: string;
    onCreateComment?: (
      startLine: number,
      endLine: number,
      file: string,
      body: string,
    ) => Promise<void>;
    onUpdateComment?: (commentId: number, body: string) => Promise<void>;
    onDeleteComment?: (commentId: number) => Promise<void>;
    onReplyComment?: (commentId: number, body: string) => Promise<void>;
  } = $props();

  let viewMode = $state<"unified" | "split">("unified");

  let selecting = $state(false);
  let selectionStart = $state<number | null>(null);
  let selectionEnd = $state<number | null>(null);
  let commentStartLine = $state<number | null>(null);
  let commentEndLine = $state<number | null>(null);
  let commentIndex = $state<number | null>(null);
  let commentBody = $state("");
  let submitting = $state(false);
  let containerEl = $state<HTMLElement | null>(null);

  interface DiffLine {
    type: "add" | "remove" | "context" | "header";
    oldLine: number | null;
    newLine: number | null;
    content: string;
  }

  let linesWithComments = $derived.by(() => {
    const s = new Set<number>();
    for (const c of inlineComments) {
      if (c.originalLine != null) s.add(c.originalLine);
    }
    return s;
  });

  let commentsByIndex = $derived.by(() => {
    const result: InlineCommentData[][] = Array.from(
      { length: lines.length },
      () => [],
    );
    const seen = new Set<number>();
    const pairIdx: Record<
      number,
      { remove: number | null; add: number | null }
    > = {};
    for (let i = 0; i < lines.length; i++) {
      const num = lines[i].newLine ?? lines[i].oldLine;
      if (num == null) continue;
      pairIdx[num] ??= { remove: null, add: null };
      if (lines[i].type === "remove") pairIdx[num].remove = i;
      if (lines[i].type === "add") pairIdx[num].add = i;
    }
    for (let i = 0; i < lines.length; i++) {
      for (const c of inlineComments) {
        if (seen.has(c.id)) continue;
        const l = lines[i];
        if (c.originalLine !== l.newLine && c.originalLine !== l.oldLine)
          continue;
        seen.add(c.id);
        const num = l.newLine ?? l.oldLine;
        const pair = num != null ? pairIdx[num] : null;
        const idx =
          pair && l.type === "remove" && pair.add != null ? pair.add : i;
        result[idx].push(c);
      }
    }
    return result;
  });

  let lines = $derived(parsePatch(patch));

  function parsePatch(patch: string): DiffLine[] {
    const result: DiffLine[] = [];
    let oldLine = 0,
      newLine = 0;
    const rawLines = patch.split("\n");
    for (const line of rawLines) {
      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLine = Number(match[1]) - 1;
          newLine = Number(match[2]) - 1;
        }
        result.push({
          type: "header",
          oldLine: null,
          newLine: null,
          content: line,
        });
      } else if (line.startsWith("+")) {
        newLine++;
        result.push({
          type: "add",
          oldLine: null,
          newLine,
          content: line.substring(1),
        });
      } else if (line.startsWith("-")) {
        oldLine++;
        result.push({
          type: "remove",
          oldLine,
          newLine: null,
          content: line.substring(1),
        });
      } else {
        oldLine++;
        newLine++;
        result.push({
          type: "context",
          oldLine,
          newLine,
          content: line.startsWith(" ") ? line.substring(1) : line,
        });
      }
    }
    return result;
  }

  function isSelected(line: DiffLine): boolean {
    const num = line.newLine ?? line.oldLine;
    if (num == null || selectionStart == null || selectionEnd == null)
      return false;
    const min = Math.min(selectionStart, selectionEnd);
    const max = Math.max(selectionStart, selectionEnd);
    return num >= min && num <= max;
  }

  function canSelect(type: string): boolean {
    return type !== "header";
  }

  function beginSelection(lineNum: number, e: MouseEvent) {
    e.preventDefault();
    selecting = true;
    selectionStart = lineNum;
    selectionEnd = lineNum;
    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", endSelection);
  }

  function handleDrag(e: MouseEvent) {
    const rows = containerEl?.querySelectorAll("[data-line]");
    if (!rows) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    for (const row of rows) {
      if (row.contains(target)) {
        const n = parseInt((row as HTMLElement).dataset.line || "", 10);
        const type = (row as HTMLElement).dataset.type || "";
        if (n && canSelect(type)) {
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
      const s = Math.min(selectionStart, selectionEnd);
      const e = Math.max(selectionStart, selectionEnd);
      let idx = -1;
      let removeIdx = -1;
      let addIdx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        const l = lines[i];
        const n = l.newLine ?? l.oldLine;
        if (n === e && l.type !== "header") {
          if (l.type === "remove") {
            removeIdx = i;
            if (addIdx < 0) idx = i;
          } else if (l.type === "add") {
            addIdx = i;
            idx = i;
            break;
          } else {
            idx = i;
            break;
          }
        }
      }
      if (idx < 0 && removeIdx >= 0) idx = removeIdx;
      if (idx >= 0) {
        commentStartLine = s;
        commentEndLine = e;
        commentIndex = idx;
      }
    }
    selecting = false;
  }

  function cancelComment() {
    commentStartLine = null;
    commentEndLine = null;
    commentIndex = null;
    commentBody = "";
    selectionStart = null;
    selectionEnd = null;
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
        );
      cancelComment();
    } finally {
      submitting = false;
    }
  }
</script>

<div class="diff-viewer">
  <div class="toolbar">
    <button
      class:active={viewMode === "unified"}
      onclick={() => (viewMode = "unified")}>Unified</button
    >
    <button
      class:active={viewMode === "split"}
      onclick={() => (viewMode = "split")}>Split</button
    >
  </div>
  <div class="diff-lines" bind:this={containerEl}>
    {#if viewMode === "unified"}
      {#each lines as line, i (i)}
        <div
          class="diff-row"
          class:row-add={line.type === "add"}
          class:row-remove={line.type === "remove"}
          class:row-header={line.type === "header"}
          class:selected={isSelected(line)}
          class:has-comment={(line.newLine != null &&
            linesWithComments.has(line.newLine)) ||
            (line.oldLine != null && linesWithComments.has(line.oldLine))}
          data-line={line.newLine ?? line.oldLine ?? ""}
          data-type={line.type}
        >
          {#if line.type === "header"}
            <span class="ln ln-old"></span>
            <span class="ln ln-new"></span>
            <span class="code">{line.content}</span>
          {:else}
            <span class="ln ln-old">{line.oldLine ?? ""}</span>
            <span class="ln ln-new">{line.newLine ?? ""}</span>
            <span class="code-line">
              <span class="code"
                >{(line.type === "add"
                  ? "+"
                  : line.type === "remove"
                    ? "-"
                    : " ") + line.content}</span
              >
            </span>
          {/if}
          {#if canSelect(line.type) && line.newLine && onCreateComment}
            <button
              class="add-btn"
              onmousedown={(e) => beginSelection(line.newLine!, e)}>+</button
            >
          {/if}
          {#if canSelect(line.type) && !line.newLine && line.oldLine && onCreateComment}
            <button
              class="add-btn"
              onmousedown={(e) => beginSelection(line.oldLine!, e)}>+</button
            >
          {/if}
        </div>
        {#each commentsByIndex[i] as comment (comment.id)}
          <InlineComment
            thread={{
              id: comment.id,
              body: comment.body,
              user: comment.user,
              createdAt: comment.createdAt,
              replies: comment.replies,
            }}
            onupdate={onUpdateComment}
            ondelete={onDeleteComment}
            onreply={onReplyComment}
          />
        {/each}
        {#if commentIndex === i}
          <div class="comment-input">
            <span class="comment-range">
              {commentStartLine === commentEndLine
                ? `Comment on line R${commentStartLine}`
                : `Comment on lines R${commentStartLine} to R${commentEndLine}`}
            </span>
            <textarea
              bind:value={commentBody}
              placeholder="Write a comment..."
              rows={3}
              disabled={submitting}
            ></textarea>
            <div class="comment-actions">
              <button class="cancel" onclick={cancelComment}>Cancel</button>
              <button
                class="submit-btn"
                onclick={submitComment}
                disabled={submitting || !commentBody.trim()}>Comment</button
              >
            </div>
          </div>
        {/if}
      {/each}
    {:else}
      {#each lines as line, i (i)}
        <div
          class="diff-row split-row"
          class:row-add={line.type === "add"}
          class:row-remove={line.type === "remove"}
          class:row-header={line.type === "header"}
          class:selected={isSelected(line)}
          class:has-comment={(line.newLine != null &&
            linesWithComments.has(line.newLine)) ||
            (line.oldLine != null && linesWithComments.has(line.oldLine))}
          data-line={line.newLine ?? line.oldLine ?? ""}
          data-type={line.type}
        >
          {#if line.type === "header"}
            <div class="split-col">
              <span class="ln ln-old"></span>
              <span class="code">{line.content}</span>
            </div>
            <div class="split-col">
              <span class="ln ln-new"></span>
              <span class="code">{line.content}</span>
            </div>
          {:else}
            <div class="split-col">
              <span class="ln ln-old">{line.oldLine ?? ""}</span>
              <span class="code"
                >{line.type !== "add"
                  ? (line.type === "remove" ? "-" : " ") + line.content
                  : ""}</span
              >
            </div>
            <div class="split-col">
              <span class="ln ln-new">{line.newLine ?? ""}</span>
              <span class="code"
                >{line.type !== "remove"
                  ? (line.type === "add" ? "+" : " ") + line.content
                  : ""}</span
              >
            </div>
          {/if}
          {#if canSelect(line.type) && line.newLine && onCreateComment}
            <button
              class="add-btn split-add"
              onmousedown={(e) => beginSelection(line.newLine!, e)}>+</button
            >
          {/if}
          {#if canSelect(line.type) && !line.newLine && line.oldLine && onCreateComment}
            <button
              class="add-btn split-add"
              onmousedown={(e) => beginSelection(line.oldLine!, e)}>+</button
            >
          {/if}
        </div>
        {#each commentsByIndex[i] as comment (comment.id)}
          <InlineComment
            thread={{
              id: comment.id,
              body: comment.body,
              user: comment.user,
              createdAt: comment.createdAt,
              replies: comment.replies,
            }}
            onupdate={onUpdateComment}
            ondelete={onDeleteComment}
            onreply={onReplyComment}
          />
        {/each}
        {#if commentIndex === i}
          <div class="comment-input">
            <span class="comment-range">
              {commentStartLine === commentEndLine
                ? `Comment on line R${commentStartLine}`
                : `Comment on lines R${commentStartLine} to R${commentEndLine}`}
            </span>
            <textarea
              bind:value={commentBody}
              placeholder="Write a comment..."
              rows={3}
              disabled={submitting}
            ></textarea>
            <div class="comment-actions">
              <button class="cancel" onclick={cancelComment}>Cancel</button>
              <button
                class="submit-btn"
                onclick={submitComment}
                disabled={submitting || !commentBody.trim()}>Comment</button
              >
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style>
  .diff-viewer {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 12px;
  }
  .toolbar {
    display: flex;
    gap: 4px;
    padding: 4px 12px;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
  }
  .toolbar button {
    padding: 2px 10px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    background: #fff;
    font-size: 11px;
    cursor: pointer;
  }
  .toolbar button.active {
    background: #d0d7de;
  }
  .diff-lines {
    overflow-x: auto;
    overflow-y: auto;
  }
  .diff-row {
    display: flex;
    line-height: 20px;
    min-height: 20px;
    position: relative;
  }
  .diff-row.row-header {
    background: #f1f8ff;
    color: #0550ae;
    font-size: 11px;
  }
  .diff-row.row-add {
    background: #dafbe1;
  }
  .diff-row.row-remove {
    background: #ffebe9;
  }
  .diff-row.row-add.selected {
    background: #a7d5ff;
  }
  .diff-row.row-remove.selected {
    background: #fdb8c0;
  }
  .diff-row.row-add.has-comment {
    background: #b8dec4;
  }
  .diff-row.row-remove.has-comment {
    background: #f5cfd3;
  }
  .diff-row:not(.row-add):not(.row-remove):not(.row-header).selected {
    background: #ddf4ff;
  }
  .ln {
    width: 48px;
    min-width: 48px;
    text-align: right;
    padding: 0 8px;
    color: #656d76;
    user-select: none;
    border-right: 1px solid #d0d7de;
    margin-right: 8px;
  }
  .ln.ln-new {
    border-left: 1px solid #d0d7de;
  }
  .code {
    white-space: pre;
    overflow: hidden;
    padding-right: 8px;
  }
  .code-line {
    display: flex;
    align-items: center;
    flex: 1;
  }
  .split-row {
    gap: 0;
  }
  .split-col {
    flex: 1;
    display: flex;
    min-width: 0;
    border-right: 1px solid #d0d7de;
  }
  .split-col:last-child {
    border-right: none;
  }
  .row-header .split-col {
    border-bottom: 1px solid #d0d7de;
  }
  .add-btn {
    opacity: 0;
    position: absolute;
    left: 6px;
    top: 1px;
    width: 18px;
    height: 18px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    background: #fff;
    font-size: 11px;
    font-weight: 600;
    color: #0969da;
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
    background: #ddf4ff;
  }
  .split-add {
    left: auto;
    right: 6px;
  }
  .comment-input {
    padding: 8px 8px 8px 104px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #f6f8fa;
    border-top: 1px solid #d0d7de;
    border-bottom: 1px solid #d0d7de;
  }
  .comment-range {
    font-size: 12px;
    font-weight: 600;
    color: #1f2328;
  }
  .comment-input textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
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
    border: 1px solid #d0d7de;
    background: #fff;
  }
  .comment-actions .submit-btn {
    border: 1px solid #1f883d;
    background: #1f883d;
    color: #fff;
  }
  .comment-actions .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
