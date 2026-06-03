<script lang="ts">
  import type { PullRequest } from "$lib/stores/pr.svelte";
  import { updatePullRequest, listReviews } from "$lib/github/pulls";
  import { onMount } from "svelte";
  import PRReviewActions from "./PRReviewActions.svelte";

  let {
    pr,
    owner,
    repo,
  }: { pr: PullRequest; owner: string | undefined; repo: string | undefined } =
    $props();

  let editing = $state(false);
  let editTitle = $state("");
  let saving = $state(false);
  let editError = $state<string | null>(null);

  let approvals = $state(0);
  let changesRequested = $state(0);
  let reviewsLoading = $state(false);

  onMount(async () => {
    reviewsLoading = true;
    try {
      const reviews = await listReviews(owner, repo, pr.number);
      const latestByUser = new Map<string, string>();
      for (const r of reviews) {
        const user = (r.user as { login: string })?.login ?? "";
        const state = r.state as string;
        if (state === "APPROVED" || state === "CHANGES_REQUESTED") {
          latestByUser.set(user, state);
        }
      }
      approvals = [...latestByUser.values()].filter(
        (s) => s === "APPROVED",
      ).length;
      changesRequested = [...latestByUser.values()].filter(
        (s) => s === "CHANGES_REQUESTED",
      ).length;
    } catch {
      approvals = 0;
      changesRequested = 0;
    } finally {
      reviewsLoading = false;
    }
  });

  function startEditing() {
    editTitle = pr.title;
    editing = true;
    editError = null;
  }

  function cancelEditing() {
    editing = false;
    editError = null;
  }

  async function saveTitle() {
    saving = true;
    editError = null;
    try {
      const result = await updatePullRequest(owner, repo, pr.number, {
        title: editTitle.trim() || pr.title,
      });
      if (result) {
        pr.title = result.title;
      }
      editing = false;
    } catch (e) {
      editError = e instanceof Error ? e.message : "Failed to update title.";
    } finally {
      saving = false;
    }
  }

  function stateColor(state: string): string {
    if (state === "open") return "#1a7f37";
    if (state === "merged") return "#8250df";
    return "#cf222e";
  }

  function stateBg(state: string): string {
    if (state === "open") return "#dafbe1";
    if (state === "merged") return "#fbefff";
    return "#ffebe9";
  }
</script>

<header class="header">
  <div class="repo-name">{owner}/{repo}</div>
  <div class="title-row">
    <div class="title-content">
      {#if editing}
        <input
          class="edit-input"
          bind:value={editTitle}
          disabled={saving}
          onkeydown={(e) => {
            if (e.key === "Escape") cancelEditing();
            if (e.key === "Enter") saveTitle();
          }}
        />
      {:else}
        <h1>
          <span class="number">#{pr.number}</span>
          {pr.title}
        </h1>
      {/if}
    </div>
    <div class="title-actions">
      {#if editing}
        <div class="edit-actions">
          <span class="edit-error">{editError || ""}</span>
          <button class="save-btn" onclick={saveTitle} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button class="cancel-btn" onclick={cancelEditing} disabled={saving}>
            Cancel
          </button>
        </div>
      {:else}
        <button class="edit-btn" onclick={startEditing}>Edit</button>
      {/if}
      {#if pr.state === "open"}
        <PRReviewActions {owner} {repo} number={pr.number} />
      {/if}
    </div>
  </div>
  <div class="meta-row">
    <span
      class="state"
      style="background:{stateBg(pr.state)};color:{stateColor(pr.state)}"
      >{pr.state}</span
    >
    <span>{pr.user.login}</span>
    <span>{pr.head.ref} → {pr.base.ref}</span>
    <span class="stats"
      ><span class="add">+{pr.additions}</span>
      <span class="del">−{pr.deletions}</span>
      ({pr.changedFiles} files)</span
    >
    <span class="review-summary">
      {#if reviewsLoading}
        <span class="review-loading">...</span>
      {:else}
        {#if approvals > 0}
          <span class="review-approved">✓ {approvals}</span>
        {/if}
        {#if changesRequested > 0}
          <span class="review-changes">✗ {changesRequested}</span>
        {/if}
      {/if}
    </span>
  </div>
</header>

<style>
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid #d0d7de;
  }
  .repo-name {
    font-size: 12px;
    color: #656d76;
    margin-bottom: 4px;
  }
  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 30px;
  }
  .title-content {
    flex: 1;
    min-width: 0;
  }
  .title-content h1 {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    margin: 0;
  }
  .title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
    flex-shrink: 0;
  }
  .number {
    color: #656d76;
    font-weight: 400;
  }
  .edit-btn {
    padding: 5px 16px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    color: #1f2328;
    font-family: inherit;
    white-space: nowrap;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .edit-btn:hover {
    background: #eaeef2;
  }
  .edit-input {
    width: 100%;
    padding: 5px 12px;
    border: 1px solid #0969da;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    outline: none;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .edit-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .edit-error {
    font-size: 12px;
    color: #cf222e;
  }
  .save-btn {
    padding: 5px 16px;
    border: 1px solid #1f883d;
    border-radius: 6px;
    background: #1f883d;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .save-btn:hover:not(:disabled) {
    background: #1a7f37;
  }
  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .cancel-btn {
    padding: 5px 16px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .cancel-btn:hover:not(:disabled) {
    background: #eaeef2;
  }
  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    color: #656d76;
  }
  .state {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .stats {
    font-family: monospace;
  }
  .stats .add {
    color: #1a7f37;
  }
  .stats .del {
    color: #cf222e;
  }
  .review-summary {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .review-loading {
    color: #656d76;
  }
  .review-approved {
    color: #1a7f37;
  }
  .review-changes {
    color: #cf222e;
  }
</style>
