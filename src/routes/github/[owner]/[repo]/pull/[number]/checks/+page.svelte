<script lang="ts">
  import Checks from "$lib/components/Checks.svelte";
  let { data } = $props();
</script>

{#await data.checks}
  <p class="status">Loading checks...</p>
{:then checks}
  <Checks {checks} />
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
