<script lang="ts">
  import { applyAction, deserialize } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";

  let { canMerge = false }: { canMerge?: boolean } = $props();

  let expanded = $state(false);
  let reviewBody = $state("");
  let submitting = $state(false);
  let merging = $state(false);

  let actionBase = $derived(
    `/github/${page.params.owner}/${page.params.repo}/pull/${page.params.number}`,
  );

  function cancel() {
    expanded = false;
    reviewBody = "";
  }

  async function submitAction(
    actionName: string,
    data: Record<string, string>,
  ) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) fd.set(k, v);
    const res = await fetch(`${actionBase}?/${actionName}`, {
      method: "POST",
      body: fd,
    });
    const result = deserialize(await res.text());
    applyAction(result);
    if (result.type === "success") await invalidateAll();
  }

  async function submitReview(event: "APPROVE" | "REQUEST_CHANGES") {
    submitting = true;
    try {
      await submitAction("createReview", { event, body: reviewBody });
      expanded = false;
      reviewBody = "";
    } finally {
      submitting = false;
    }
  }

  async function merge() {
    merging = true;
    try {
      await submitAction("merge", {});
    } finally {
      merging = false;
    }
  }
</script>

<div class="wrapper">
  {#if canMerge}
    <button class="merge-btn" onclick={merge} disabled={merging}>
      {merging ? "Merging..." : "Merge"}
    </button>
  {/if}

  <button class="review-btn" onclick={() => (expanded = !expanded)}>
    Review ▾
  </button>

  {#if expanded}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="overlay"
      onclick={cancel}
      onkeydown={(e) => e.key === "Escape" && cancel()}
    ></div>
    <div class="pane">
      <div class="pane-header">Review this pull request</div>
      <textarea
        name="body"
        bind:value={reviewBody}
        placeholder="Leave a comment (optional)..."
        disabled={submitting}
      ></textarea>
      <div class="pane-footer">
        <button type="button" class="cancel-btn" onclick={cancel}>Cancel</button
        >
        <button
          type="button"
          class="approve-btn"
          onclick={() => submitReview("APPROVE")}
          disabled={submitting}
        >
          Approve
        </button>
        <button
          type="button"
          class="request-changes-btn"
          onclick={() => submitReview("REQUEST_CHANGES")}
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
  .merge-btn:hover:not(:disabled) {
    background: var(--btn-merge-hover);
  }
  .merge-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
