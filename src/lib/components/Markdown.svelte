<script lang="ts">
  import { Marked } from "marked";
  import DOMPurify from "dompurify";
  import { onMount } from "svelte";
  import { loadEmojiMap, replaceEmojis } from "$lib/github/emojis";

  let {
    text = "",
    suggestionLines = [],
  }: { text?: string | null; suggestionLines?: string[] } = $props();

  let emojiMap = $state<Record<string, string> | null>(null);

  onMount(() => {
    loadEmojiMap().then((m) => (emojiMap = m));
  });

  let _suggestionLines: string[] = [];

  const marked = new Marked();
  marked.use({
    renderer: {
      code({ text: code, lang }) {
        if (lang === "suggestion") {
          return renderSuggestion(code, _suggestionLines);
        }
        return false;
      },
    },
  });

  function renderSuggestion(code: string, originalLines: string[]): string {
    const suggLines = code.split("\n");
    if (suggLines[suggLines.length - 1] === "") suggLines.pop();

    if (originalLines.length === 0) {
      const formatted = suggLines
        .map((line) => `<div class="suggestion-line">${escapeHtml(line)}</div>`)
        .join("");
      return `<div class="suggestion-block"><div class="suggestion-header">Suggested change</div>${formatted}</div>`;
    }

    const delHtml = originalLines
      .map((line) => `<div class="suggestion-del">${escapeHtml(line)}</div>`)
      .join("");
    const addHtml = suggLines
      .map((line) => `<div class="suggestion-add">${escapeHtml(line)}</div>`)
      .join("");
    return `<div class="suggestion-block"><div class="suggestion-header">Suggested change</div>${delHtml}${addHtml}</div>`;
  }

  function escapeHtml(str: string): string {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  let rendered = $derived(text ?? "");

  let html = $derived.by(() => {
    _suggestionLines = suggestionLines;
    let content = rendered;
    if (emojiMap) {
      content = replaceEmojis(content, emojiMap);
    }
    return DOMPurify.sanitize(marked.parse(content) as string);
  });
</script>

<div class="markdown">{@html html}</div>

<style>
  .markdown :global(p) {
    margin-bottom: 0.5rem;
  }
  .markdown :global(p:last-child) {
    margin-bottom: 0;
  }
  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin: 1rem 0 0.5rem;
    font-weight: 600;
  }
  .markdown :global(code) {
    background: var(--bg-code);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
  .markdown :global(pre) {
    background: var(--bg-secondary);
    border-radius: 6px;
    overflow-x: auto;
    font-size: 12px;
    margin-bottom: 0.75rem;
  }
  .markdown :global(pre code) {
    background: none;
    padding: 0;
  }
  .markdown :global(ul),
  .markdown :global(ol) {
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .markdown :global(li) {
    margin-bottom: 0.25rem;
  }
  .markdown :global(blockquote) {
    border-left: 4px solid var(--border-primary);
    padding-left: 12px;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
  }
  .markdown :global(table) {
    border-collapse: collapse;
    margin-bottom: 0.75rem;
    font-size: 12px;
  }
  .markdown :global(th),
  .markdown :global(td) {
    padding: 6px 12px;
    border: 1px solid var(--border-primary);
    text-align: left;
  }
  .markdown :global(th) {
    background: var(--bg-secondary);
    font-weight: 600;
  }
  .markdown :global(img) {
    max-width: 100%;
    height: auto;
  }
  .markdown :global(a) {
    color: var(--text-link);
    text-decoration: none;
  }
  .markdown :global(a:hover) {
    text-decoration: underline;
  }
  .markdown :global(del) {
    opacity: 0.6;
  }
  .markdown :global(hr) {
    border: none;
    border-top: 1px solid var(--border-primary);
    margin: 1rem 0;
  }
  .markdown :global(.suggestion-block) {
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    margin-bottom: 0.75rem;
    overflow: hidden;
    font-size: 12px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  }
  .markdown :global(.suggestion-header) {
    padding: 6px 12px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }
  .markdown :global(.suggestion-line) {
    padding: 0 12px;
    line-height: 1.5;
    white-space: pre;
    color: var(--text-success);
  }
  .markdown :global(.suggestion-del) {
    padding: 0 12px 0 6px;
    line-height: 1.5;
    white-space: pre;
    background: var(--diff-remove-bg);
    color: var(--text-danger);
  }
  .markdown :global(.suggestion-del)::before {
    content: "-";
    margin-right: 6px;
    opacity: 0.7;
  }
  .markdown :global(.suggestion-add) {
    padding: 0 12px 0 6px;
    line-height: 1.5;
    white-space: pre;
    background: var(--diff-add-bg);
    color: var(--text-success);
  }
  .markdown :global(.suggestion-add)::before {
    content: "+";
    margin-right: 6px;
    opacity: 0.7;
  }
</style>
