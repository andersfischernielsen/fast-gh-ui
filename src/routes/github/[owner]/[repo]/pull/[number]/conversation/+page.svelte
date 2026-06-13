<script lang="ts">
  import Conversation from "$lib/components/Conversation.svelte";
  let { data, form } = $props();
</script>

{#if form?.error}
  <p class="status error">{form.error}</p>
{/if}

{#await data.pr}
  <p class="status">Loading PR...</p>
{:then pr}
  {#await Promise.all([data.comments, data.reviewComments])}
    <p class="status">Loading comments...</p>
  {:then [comments, reviewComments]}
    <Conversation body={pr.body} {comments} {reviewComments} />
  {:catch e}
    <p class="status error">{e instanceof Error ? e.message : String(e)}</p>
  {/await}
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
