<script lang="ts">
  import type { PullRequest } from "$lib/stores/pr.svelte";
  import { updatePullRequest, listReviews } from "$lib/github/pulls";
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

  async function loadReviews(): Promise<void> {
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
  }

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
    if (state === "open") return "var(--state-open-text)";
    if (state === "merged") return "var(--state-merged-text)";
    return "var(--state-closed-text)";
  }

  function stateBg(state: string): string {
    if (state === "open") return "var(--state-open-bg)";
    if (state === "merged") return "var(--state-merged-bg)";
    return "var(--state-closed-bg)";
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
      style="background:{stateBg(
        pr.merged ? 'merged' : pr.state,
      )};color:{stateColor(pr.merged ? 'merged' : pr.state)}"
    >
      {pr.merged ? "merged" : pr.state}
    </span>
    <span>{pr.user.login}</span>
    <span class="branch-ref">{pr.head.ref} → {pr.base.ref}</span>
    <span class="review-summary">
      {#await loadReviews()}
        <span class="review-loading">...</span>
      {:then}
        {#if approvals > 0}
          <span class="review-approved">✓ {approvals}</span>
        {/if}
        {#if changesRequested > 0}
          <span class="review-changes">✗ {changesRequested}</span>
        {/if}
      {/await}
    </span>
    <span class="stats"
      ><span class="add">+{pr.additions}</span>
      <span class="del">−{pr.deletions}</span>
      <span class="file-count">({pr.changedFiles} files)</span></span
    >
  </div>
</header>

<style>
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-primary);
    container-type: inline-size;
  }
  .repo-name {
    font-size: 12px;
    color: var(--text-secondary);
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
    flex-shrink: 0;
  }
  .number {
    color: var(--text-secondary);
    font-weight: 400;
  }
  .edit-btn {
    padding: 5px 16px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--btn-secondary-bg);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--btn-secondary-text);
    font-family: inherit;
    white-space: nowrap;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .edit-btn:hover {
    background: var(--btn-secondary-hover);
  }
  .edit-input {
    width: 100%;
    padding: 5px 12px;
    border: 1px solid var(--text-link);
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    outline: none;
    line-height: 1.4;
    box-sizing: border-box;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .edit-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .edit-error {
    font-size: 12px;
    color: var(--text-danger);
  }
  .save-btn {
    padding: 5px 16px;
    border: 1px solid var(--btn-primary-border);
    border-radius: 6px;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .save-btn:hover:not(:disabled) {
    background: var(--btn-primary-hover);
  }
  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .cancel-btn {
    padding: 5px 16px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-text);
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .cancel-btn:hover:not(:disabled) {
    background: var(--btn-secondary-hover);
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
    color: var(--text-secondary);
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
    white-space: nowrap;
  }
  .stats .add {
    color: var(--text-success);
  }
  .stats .del {
    color: var(--text-danger);
  }
  .review-summary {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  .review-loading {
    color: var(--text-secondary);
  }
  .review-approved {
    color: var(--text-success);
  }
  .review-changes {
    color: var(--text-danger);
  }

  .branch-ref {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
    vertical-align: middle;
  }

  @container (max-width: 500px) {
    .branch-ref {
      display: none;
    }
    .file-count {
      display: none;
    }
  }
</style>
