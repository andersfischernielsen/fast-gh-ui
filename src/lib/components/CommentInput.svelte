<script lang="ts">
  let { onsubmit }: { onsubmit: (body: string) => Promise<void> } = $props();

  let body = $state("");
  let submitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    submitting = true;
    try {
      await onsubmit(body);
      body = "";
    } finally {
      submitting = false;
    }
  }
</script>

<form class="input" onsubmit={handleSubmit}>
  <textarea
    bind:value={body}
    placeholder="Write a comment..."
    rows={3}
    disabled={submitting}
  ></textarea>
  <button type="submit" disabled={submitting || !body.trim()}>Comment</button>
</form>

<style>
  .input {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
  textarea {
    padding: 10px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  button {
    align-self: flex-end;
    padding: 6px 16px;
    border: 1px solid var(--btn-primary-border);
    border-radius: 6px;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
