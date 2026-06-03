<script lang="ts">
  import { Marked } from "marked";
  import DOMPurify from "dompurify";
  import { onMount } from "svelte";
  import { loadEmojiMap, replaceEmojis } from "$lib/github/emojis";

  let { text = "" }: { text?: string | null } = $props();

  let emojiMap = $state<Record<string, string> | null>(null);

  onMount(() => {
    loadEmojiMap().then((m) => (emojiMap = m));
  });

  const marked = new Marked();
  marked.use({
    renderer: {
      code({ text: code, lang }) {
        if (lang === "suggestion") {
          const lines = code.split("\n");
          const last = lines.length - 1;
          const formatted = lines
            .map((line, i) => {
              if (i === last && line === "") return "";
              return `<div class="suggestion-line">${escapeHtml(line)}</div>`;
            })
            .join("");
          return `<div class="suggestion-block"><div class="suggestion-header">Suggested change</div>${formatted}</div>`;
        }
        return false;
      },
    },
  });

  function escapeHtml(str: string): string {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  let rendered = $derived(text ?? "");

  let html = $derived.by(() => {
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
    margin-bottom: 0.75rem;
  }
  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin: 1rem 0 0.5rem;
    font-weight: 600;
  }
  .markdown :global(code) {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
  .markdown :global(pre) {
    background: #f6f8fa;
    padding: 12px 16px;
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
    border-left: 4px solid #d0d7de;
    padding-left: 12px;
    color: #656d76;
    margin-bottom: 0.75rem;
  }
  .markdown :global(table) {
    border-collapse: collapse;
    margin-bottom: 0.75rem;
    font-size: 13px;
  }
  .markdown :global(th),
  .markdown :global(td) {
    padding: 6px 12px;
    border: 1px solid #d0d7de;
    text-align: left;
  }
  .markdown :global(th) {
    background: #f6f8fa;
    font-weight: 600;
  }
  .markdown :global(img) {
    max-width: 100%;
  }
  .markdown :global(a) {
    color: #0969da;
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
    border-top: 1px solid #d0d7de;
    margin: 1rem 0;
  }
  .markdown :global(.suggestion-block) {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    margin-bottom: 0.75rem;
    overflow: hidden;
    font-size: 12px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  }
  .markdown :global(.suggestion-header) {
    padding: 6px 12px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-size: 12px;
    font-weight: 600;
    color: #656d76;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .markdown :global(.suggestion-line) {
    padding: 0 12px;
    line-height: 1.5;
    white-space: pre;
    color: #1a7f37;
  }
</style>
