<script lang="ts">
  import {
    createReview,
    fetchRepoMergeMethods,
    mergePullRequest,
  } from "$lib/github/pulls";

  type MergeMethod = "merge" | "squash" | "rebase";

  let {
    owner,
    repo,
    number,
  }: {
    owner: string | undefined;
    repo: string | undefined;
    number: number | undefined;
  } = $props();

  const METHOD_LABEL: Record<MergeMethod, string> = {
    merge: "Create a merge commit",
    squash: "Squash and merge",
    rebase: "Rebase and merge",
  };
  const METHOD_BUTTON: Record<MergeMethod, string> = {
    merge: "Merge pull request",
    squash: "Squash and merge",
    rebase: "Rebase and merge",
  };

  let expanded = $state(false);
  let body = $state("");
  let submitting = $state(false);
  let success = $state<string | null>(null);
  let error = $state<string | null>(null);
  let mergeSuccess = $state<string | null>(null);
  let mergeError = $state<string | null>(null);
  let merging = $state(false);
  let allowed = $state<MergeMethod[]>(["merge", "squash", "rebase"]);
  let selectedMethod = $state<MergeMethod>("merge");
  let methodMenuOpen = $state(false);

  $effect(() => {
    if (!owner || !repo) return;
    fetchRepoMergeMethods(owner, repo)
      .then((m) => {
        if (!m) return;
        const list: MergeMethod[] = [];
        if (m.merge) list.push("merge");
        if (m.squash) list.push("squash");
        if (m.rebase) list.push("rebase");
        allowed = list;
        if (list.length && !list.includes(selectedMethod)) {
          selectedMethod = list[0];
        }
      })
      .catch(() => {});
  });

  async function handleReview(event: "APPROVE" | "REQUEST_CHANGES") {
    submitting = true;
    error = null;
    success = null;
    try {
      await createReview(owner, repo, number, event, body.trim() || undefined);
      success = event === "APPROVE" ? "Approved!" : "Changes requested.";
      body = "";
      expanded = false;
      setTimeout(() => {
        success = null;
      }, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to submit review.";
    } finally {
      submitting = false;
    }
  }

  function cancel() {
    expanded = false;
    body = "";
    error = null;
  }

  async function handleMerge() {
    merging = true;
    mergeError = null;
    mergeSuccess = null;
    methodMenuOpen = false;
    try {
      await mergePullRequest(owner, repo, number, selectedMethod);
      mergeSuccess = "Merged!";
      setTimeout(() => {
        mergeSuccess = null;
      }, 2000);
    } catch (e) {
      mergeError = e instanceof Error ? e.message : "Failed to merge.";
    } finally {
      merging = false;
    }
  }

  function pickMethod(m: MergeMethod) {
    selectedMethod = m;
    methodMenuOpen = false;
  }
</script>

<div class="wrapper">
  {#if allowed.length > 0}
    <div class="merge-split">
      <button
        class="merge-btn"
        onclick={handleMerge}
        disabled={merging}
        title={METHOD_LABEL[selectedMethod]}
      >
        {merging ? "Merging..." : METHOD_BUTTON[selectedMethod]}
      </button>
      {#if allowed.length > 1}
        <button
          class="merge-caret"
          onclick={() => (methodMenuOpen = !methodMenuOpen)}
          disabled={merging}
          aria-label="Choose merge method"
        >
          ▾
        </button>
      {/if}
      {#if methodMenuOpen}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="overlay"
          onclick={() => (methodMenuOpen = false)}
          onkeydown={(e) => {
            if (e.key === "Escape") methodMenuOpen = false;
          }}
        ></div>
        <div class="method-menu">
          {#each allowed as m (m)}
            <button
              class="method-item"
              class:selected={m === selectedMethod}
              onclick={() => pickMethod(m)}
            >
              {METHOD_LABEL[m]}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  {#if mergeError}
    <span class="error-msg">{mergeError}</span>
  {/if}
  {#if mergeSuccess}
    <span class="success">{mergeSuccess}</span>
  {/if}
  <button class="review-btn" onclick={() => (expanded = !expanded)}>
    Review ▾
  </button>
  {#if success}
    <span class="success">{success}</span>
  {/if}

  {#if expanded}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="overlay"
      onclick={cancel}
      onkeydown={(e) => {
        if (e.key === "Escape") cancel();
      }}
    ></div>
    <div class="pane">
      <div class="pane-header">Review this pull request</div>
      <textarea bind:value={body} placeholder="Leave a comment (optional)..."
      ></textarea>
      {#if error}
        <span class="error-msg">{error}</span>
      {/if}
      <div class="pane-footer">
        <button class="cancel-btn" onclick={cancel}>Cancel</button>
        <button
          class="approve-btn"
          onclick={() => handleReview("APPROVE")}
          disabled={submitting}
        >
          Approve
        </button>
        <button
          class="request-changes-btn"
          onclick={() => handleReview("REQUEST_CHANGES")}
          disabled={submitting}
        >
          Request changes
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .wrapper {
    position: relative;
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .review-btn {
    padding: 5px 16px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--btn-secondary-bg);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--btn-secondary-text);
    font-family: inherit;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .review-btn:hover {
    background: var(--btn-secondary-hover);
  }
  .merge-split {
    position: relative;
    display: inline-flex;
    align-items: stretch;
  }
  .merge-btn {
    padding: 5px 16px;
    border: 1px solid var(--state-merged-text);
    border-radius: 6px;
    background: var(--state-merged-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-white);
    font-family: inherit;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .merge-split .merge-btn {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
  }
  .merge-btn:hover:not(:disabled) {
    background: var(--btn-merge-hover);
  }
  .merge-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .merge-caret {
    padding: 5px 8px;
    border: 1px solid var(--state-merged-text);
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: 6px;
    border-bottom-right-radius: 6px;
    background: var(--state-merged-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-white);
    font-family: inherit;
    line-height: 1.4;
    box-sizing: border-box;
  }
  .merge-caret:hover:not(:disabled) {
    background: var(--btn-merge-hover);
  }
  .merge-caret:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .method-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    min-width: 220px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    box-shadow: 0 8px 24px var(--shadow-dialog);
    z-index: 101;
    padding: 4px;
    display: flex;
    flex-direction: column;
  }
  .method-item {
    text-align: left;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    color: var(--text-primary);
  }
  .method-item:hover {
    background: var(--btn-secondary-hover);
  }
  .method-item.selected {
    font-weight: 600;
  }
  .success {
    font-size: 12px;
    color: var(--text-success);
  }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
  }
  .pane {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    width: 360px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    box-shadow: 0 8px 24px var(--shadow-dialog);
    z-index: 101;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pane-header {
    font-size: 12px;
    font-weight: 600;
  }
  textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .error-msg {
    font-size: 12px;
    color: var(--text-danger);
  }
  .pane-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .cancel-btn {
    padding: 5px 16px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    background: var(--btn-secondary-bg);
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }
  .cancel-btn:hover {
    background: var(--btn-secondary-hover);
  }
  .approve-btn,
  .request-changes-btn {
    padding: 5px 16px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-white);
    font-family: inherit;
  }
  .approve-btn {
    background: var(--btn-primary-bg);
  }
  .approve-btn:hover:not(:disabled) {
    background: var(--btn-primary-hover);
  }
  .request-changes-btn {
    background: var(--btn-danger-bg);
  }
  .request-changes-btn:hover:not(:disabled) {
    background: var(--btn-danger-hover);
  }
  .approve-btn:disabled,
  .request-changes-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
