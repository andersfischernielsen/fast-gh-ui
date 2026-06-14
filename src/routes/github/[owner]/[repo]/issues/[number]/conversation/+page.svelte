<script lang="ts">
  import IssueConversation from "$lib/components/IssueConversation.svelte";
  let { data, form } = $props();
</script>

{#if form?.error}
  <p class="status error">{form.error}</p>
{/if}

{#await data.comments}
  <p class="status">Loading comments...</p>
{:then comments}
  <IssueConversation {comments} />
  {:catch e}
    <p class="status error">{e instanceof Error ? e.message : String(e)}</p>
  {/await}

<style>
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
</style>
