<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { onMount } from 'svelte';
  import { loadEmojiMap, replaceEmojis } from '$lib/github/emojis';

  let { text = '' }: { text?: string | null } = $props();

  let emojiMap = $state<Record<string, string> | null>(null);

  onMount(() => {
    loadEmojiMap().then(m => emojiMap = m);
  });

  let rendered = $derived(text ?? '');

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
  .markdown :global(p) { margin-bottom: 0.75rem; }
  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) { margin: 1rem 0 0.5rem; font-weight: 600; }
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
  .markdown :global(ol) { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  .markdown :global(li) { margin-bottom: 0.25rem; }
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
  .markdown :global(th) { background: #f6f8fa; font-weight: 600; }
  .markdown :global(img) { max-width: 100%; }
  .markdown :global(a) { color: #0969da; text-decoration: none; }
  .markdown :global(a:hover) { text-decoration: underline; }
  .markdown :global(del) { opacity: 0.6; }
  .markdown :global(hr) {
    border: none;
    border-top: 1px solid #d0d7de;
    margin: 1rem 0;
  }
</style>
