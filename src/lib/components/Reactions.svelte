<script lang="ts">
  import { onMount } from "svelte";
  import {
    listCommentReactions,
    listReviewCommentReactions,
    listIssueReactions,
    mapReactions,
    getCurrentUser,
  } from "$lib/github/pulls";
  import type { ReactionData } from "$lib/types/comment";

  let {
    owner,
    repo,
    commentId,
    issueNumber,
    isReview = false,
    onreaction,
  }: {
    owner?: string;
    repo?: string;
    commentId?: number;
    issueNumber?: number;
    isReview?: boolean;
    onreaction?: (
      id: number,
      emoji: string,
      remove: boolean,
      reactionId?: number,
    ) => Promise<void>;
  } = $props();

  let pickerOpen = $state(false);
  let submitting = $state(false);

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

  const availableEmojis = Object.entries(emojiMap);

  async function fetchReactions(): Promise<ReactionData[]> {
    const user = await getCurrentUser();
    let raw: Record<string, unknown>[];
    if (issueNumber !== undefined) {
      raw = (await listIssueReactions(owner, repo, issueNumber)) as Record<string, unknown>[];
    } else if (isReview) {
      raw = (await listReviewCommentReactions(owner, repo, commentId!)) as Record<string, unknown>[];
    } else {
      raw = (await listCommentReactions(owner, repo, commentId!)) as Record<string, unknown>[];
    }
    return mapReactions(raw, user);
  }

  let reactionsPromise: Promise<ReactionData[]> = $state(Promise.resolve([]));
  onMount(() => {
    reactionsPromise = fetchReactions();
  });

  async function handleReaction(
    emoji: string,
    remove: boolean,
    reactionId?: number,
  ) {
    const id = commentId ?? issueNumber;
    if (!onreaction || id === undefined || submitting) return;
    submitting = true;
    try {
      await onreaction(id, emoji, remove, reactionId);
      pickerOpen = false;
      reactionsPromise = fetchReactions();
    } finally {
      submitting = false;
    }
  }

  function togglePicker(e: MouseEvent) {
    e.stopPropagation();
    pickerOpen = !pickerOpen;
  }

  function closePicker() {
    pickerOpen = false;
  }
</script>

<svelte:window onclick={closePicker} />

{#await reactionsPromise}
  <span class="reactions-loading"></span>
{:then reactions}
  <div class="reactions" role="group" aria-label="Reactions">
    {#each reactions as reaction}
      {@const hasReacted = reaction.userReactionId !== undefined}
      <button
        type="button"
        class="reaction"
        class:reacted={hasReacted}
        title={reaction.authors.join(", ")}
        disabled={submitting || !onreaction}
        onclick={(e) => {
          e.stopPropagation();
          if (hasReacted) {
            handleReaction(reaction.emoji, true, reaction.userReactionId);
          } else {
            handleReaction(reaction.emoji, false);
          }
        }}
      >
        <span class="emoji">{emojiMap[reaction.emoji] ?? reaction.emoji}</span>
        <span class="count">{reaction.authors.length}</span>
      </button>
    {/each}
    <div class="picker-wrapper">
      <button
        type="button"
        class="reaction add-reaction"
        aria-label="Add reaction"
        disabled={submitting || !onreaction}
        onclick={(e) => {
          e.stopPropagation();
          togglePicker(e);
        }}
      >
        <span class="count">+</span>
      </button>
      {#if pickerOpen}
        <div class="picker-popover">
          {#each availableEmojis as [key, emoji]}
            <button
              type="button"
              class="picker-emoji"
              disabled={submitting}
              onclick={(e) => {
                e.stopPropagation();
                handleReaction(key, false);
              }}
            >
              {emoji}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/await}

<style>
  .reactions-loading {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-top: 8px;
    border: 2px solid var(--border-primary);
    border-top-color: var(--text-secondary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    position: relative;
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
    cursor: pointer;
    font-family: inherit;
    color: inherit;
  }
  .reaction:hover:not(:disabled) {
    background: var(--bg-primary);
    border-color: var(--text-accent);
  }
  .reaction:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .reaction.reacted {
    background: var(--accent-subtle);
    border-color: var(--text-accent);
  }
  .add-reaction {
    color: var(--text-secondary);
  }
  .emoji {
    line-height: 1;
  }
  .count {
    color: var(--text-secondary);
    font-size: 11px;
  }
  .picker-wrapper {
    position: relative;
  }
  .picker-popover {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10;
    min-width: 180px;
  }
  .picker-emoji {
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
    line-height: 1;
  }
  .picker-emoji:hover:not(:disabled) {
    background: var(--bg-secondary);
    border-color: var(--border-primary);
  }
  .picker-emoji:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
