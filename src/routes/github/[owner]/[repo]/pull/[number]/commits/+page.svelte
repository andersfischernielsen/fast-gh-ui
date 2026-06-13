<script lang="ts">
  import Commits from "$lib/components/Commits.svelte";
  let { data } = $props();
</script>

{#await data.commits}
  <p class="status">Loading commits...</p>
{:then commits}
  <Commits {commits} />
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
