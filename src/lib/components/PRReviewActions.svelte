<script lang="ts">
  import { createReview } from '$lib/github/pulls';

  let { owner, repo, number }: { owner: string | undefined; repo: string | undefined; number: number | undefined } = $props();

  let expanded = $state(false);
  let body = $state('');
  let submitting = $state(false);
  let success = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function handleReview(event: 'APPROVE' | 'REQUEST_CHANGES') {
    submitting = true;
    error = null;
    success = null;
    try {
      await createReview(owner, repo, number, event, body.trim() || undefined);
      success = event === 'APPROVE' ? 'Approved!' : 'Changes requested.';
      body = '';
      expanded = false;
      setTimeout(() => { success = null; }, 2000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to submit review.';
    } finally {
      submitting = false;
    }
  }

  function cancel() {
    expanded = false;
    body = '';
    error = null;
  }
</script>

<div class="wrapper">
  <button class="review-btn" onclick={() => expanded = !expanded}>
    Review ▾
  </button>
  {#if success}
    <span class="success">{success}</span>
  {/if}

  {#if expanded}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="overlay" onclick={cancel} onkeydown={(e) => { if (e.key === 'Escape') cancel(); }}></div>
    <div class="pane">
      <div class="pane-header">Review this pull request</div>
      <textarea bind:value={body} placeholder="Leave a comment (optional)..."></textarea>
      {#if error}
        <span class="error-msg">{error}</span>
      {/if}
      <div class="pane-footer">
        <button class="cancel-btn" onclick={cancel}>Cancel</button>
        <button class="approve-btn" onclick={() => handleReview('APPROVE')} disabled={submitting}>
          Approve
        </button>
        <button class="request-changes-btn" onclick={() => handleReview('REQUEST_CHANGES')} disabled={submitting}>
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
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    color: #1f2328;
    font-family: inherit;
  }
  .review-btn:hover {
    background: #eaeef2;
  }
  .success {
    font-size: 13px;
    color: #1a7f37;
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
    background: #fff;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 101;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pane-header {
    font-size: 13px;
    font-weight: 600;
  }
  textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }
  .error-msg {
    font-size: 13px;
    color: #cf222e;
  }
  .pane-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .cancel-btn {
    padding: 5px 16px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
  }
  .cancel-btn:hover {
    background: #eaeef2;
  }
  .approve-btn, .request-changes-btn {
    padding: 5px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    color: #fff;
    font-family: inherit;
  }
  .approve-btn {
    background: #1f883d;
  }
  .approve-btn:hover:not(:disabled) {
    background: #1a7f37;
  }
  .request-changes-btn {
    background: #cf222e;
  }
  .request-changes-btn:hover:not(:disabled) {
    background: #a40e26;
  }
  .approve-btn:disabled, .request-changes-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
