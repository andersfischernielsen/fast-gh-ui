<script lang="ts">
  import type { ReactionData } from "$lib/types/comment";

  let { reactions }: { reactions: ReactionData[] } = $props();

  const emojiMap: Record<string, string> = {
    "+1": "👍",
    "-1": "👎",
    laugh: "😄",
    confused: "😕",
    heart: "❤️",
    hooray: "🎉",
    eyes: "👀",
    rocket: "🚀",
  };
</script>

<div class="reactions">
  {#each reactions as reaction}
    <div class="reaction" title={reaction.authors.join(", ")}>
      <span class="emoji">{emojiMap[reaction.emoji] ?? reaction.emoji}</span>
      <span class="count">{reaction.authors.length}</span>
    </div>
  {/each}
</div>

<style>
  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .reaction {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    background: var(--bg-secondary);
    font-size: 12px;
    cursor: default;
  }
  .emoji {
    line-height: 1;
  }
  .count {
    color: var(--text-secondary);
    font-size: 11px;
  }
</style>
