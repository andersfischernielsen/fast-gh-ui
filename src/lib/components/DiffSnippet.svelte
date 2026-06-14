<script lang="ts">
  import { parsePatch } from "$lib/utils/diff";

  let {
    patch,
    highlightSide = "RIGHT",
    highlightStart = null,
    highlightEnd = null,
    contextLines = 3,
  }: {
    patch: string;
    highlightSide?: "LEFT" | "RIGHT";
    highlightStart?: number | null;
    highlightEnd?: number | null;
    contextLines?: number;
  } = $props();

  let lines = $derived.by(() => {
    const all = parsePatch(patch).filter((l) => l.type !== "header");
    if (highlightStart == null || highlightEnd == null) return all;
    const pick = (l: (typeof all)[number]) =>
      highlightSide === "RIGHT" ? l.newLine : l.oldLine;
    let first = -1;
    let last = -1;
    for (let i = 0; i < all.length; i++) {
      const n = pick(all[i]);
      if (n != null && n >= highlightStart && n <= highlightEnd) {
        if (first === -1) first = i;
        last = i;
      }
    }
    if (first === -1) return all;
    return all.slice(
      Math.max(0, first - contextLines),
      Math.min(all.length, last + contextLines + 1),
    );
  });

  function isHighlighted(
    newLine: number | null,
    oldLine: number | null,
  ): boolean {
    if (highlightStart == null || highlightEnd == null) return false;
    const n = highlightSide === "RIGHT" ? newLine : oldLine;
    return n != null && n >= highlightStart && n <= highlightEnd;
  }
</script>

<div class="snippet">
  <table class="snippet-table">
    <tbody>
      {#each lines as line, i (i)}
        <tr
          class="snippet-row"
          class:row-add={line.type === "add"}
          class:row-remove={line.type === "remove"}
          class:row-highlight={isHighlighted(line.newLine, line.oldLine)}
        >
          <td class="ln">{line.oldLine ?? ""}</td>
          <td class="ln">{line.newLine ?? ""}</td>
          <td class="cell-code">
            <span class="code"
              >{(line.type === "add"
                ? "+"
                : line.type === "remove"
                  ? "-"
                  : " ") + line.content}</span
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .snippet {
    font-family: "SF Mono", Menlo, Monaco, monospace;
    font-size: 11px;
    overflow-x: auto;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--bg-primary);
  }
  .snippet-table {
    border-collapse: collapse;
    table-layout: auto;
    width: 100%;
  }
  .snippet-row {
    line-height: 18px;
    height: 18px;
  }
  .snippet-row.row-add {
    background: var(--diff-add-bg);
  }
  .snippet-row.row-remove {
    background: var(--diff-remove-bg);
  }
  .snippet-row.row-highlight.row-add {
    background: var(--diff-add-comment-bg);
  }
  .snippet-row.row-highlight.row-remove {
    background: var(--diff-remove-comment-bg);
  }
  .snippet-row.row-highlight:not(.row-add):not(.row-remove) {
    background: var(--bg-selected);
  }
  .ln {
    width: 38px;
    text-align: right;
    padding: 0 6px;
    color: var(--text-secondary);
    user-select: none;
    border-right: 1px solid var(--border-primary);
    vertical-align: top;
  }
  .cell-code {
    padding: 0 6px;
  }
  .code {
    white-space: pre;
    display: block;
  }
</style>
