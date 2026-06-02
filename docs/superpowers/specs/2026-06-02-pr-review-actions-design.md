# PR Review Actions — Design Spec

**Date:** 2026-06-02

## Summary

Add right-aligned Approve / Request Changes buttons to `PRHeader.svelte` with support for an optional review comment, matching GitHub's review flow.

## Components

### New: `src/lib/components/PRReviewActions.svelte`

A self-contained Svelte 5 component that renders the review buttons and optional comment textarea.

**Props:**

- `owner: string`
- `repo: string`
- `number: number`

**Internal state:**

- `expanded: boolean` — whether the comment textarea is visible (default `false`)
- `body: string` — comment body text
- `submitting: boolean` — loading state during API call
- `success: string | null` — brief success message after review submitted
- `error: string | null` — API error message

**Template structure:**

```
<div class="review-actions">
  <div class="buttons">
    <button class="approve-btn" onclick={handleReview('APPROVE')}>Approve</button>
    <button class="request-changes-btn" onclick={handleReview('REQUEST_CHANGES')}>Request changes</button>
  </div>
  {#if !expanded}
    <button class="toggle-comment" onclick={() => expanded = true}>Add review comment</button>
  {:else}
    <textarea bind:value={body} placeholder="Leave a comment..." />
  {/if}
  {#if success}
    <span class="success">{success}</span>
  {/if}
  {#if error}
    <span class="error">{error}</span>
  {/if}
</div>
```

**Behavior:**

- On Approve/Request changes click: call `createReview(owner, repo, number, event, body)` with current textarea content (empty string if not expanded)
- While submitting, disable both buttons
- On success: set `success` message, clear `body`, collapse textarea after 2s
- On error: set `error` message

### Placement

In `src/routes/[owner]/[repo]/pull/[number]/+layout.svelte`, add `<PRReviewActions {owner} {repo} {number} />` next to `<PRHeader>`, guarded by `{#if pr.value.state === 'open'}`.

## API

### New function: `createReview` in `src/lib/github/pulls.ts`

```ts
async function createReview(
  owner: string,
  repo: string,
  pullNumber: number,
  event: "APPROVE" | "REQUEST_CHANGES",
  body?: string,
);
```

Calls `octokit.rest.pulls.createReview({ owner, repo, pull_number: pullNumber, event, body })`.

Exported alongside existing functions.

## Styling

- `.review-actions` — right-aligned within the PR header area, flex column, gap
- `.approve-btn` — green (#1f883d) background, white text, GitHub button style
- `.request-changes-btn` — red (#cf222e) background, white text, GitHub button style
- `.toggle-comment` — subtle link-style button, small font
- `textarea` — full-width, min-height 80px, GitHub-styled border/radius
- Buttons disabled state: opacity 0.6, cursor not-allowed
