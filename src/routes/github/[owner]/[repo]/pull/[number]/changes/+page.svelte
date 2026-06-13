<script lang="ts">
  import FilesChanged from "$lib/components/FilesChanged.svelte";
  let { data, form } = $props();
</script>

{#if form?.error}
  <p class="status error">{form.error}</p>
{/if}

{#await Promise.all([data.files, data.inlineComments])}
  <p class="status">Loading files...</p>
{:then [files, inlineComments]}
  <FilesChanged {files} {inlineComments} headSha={data.headSha} />
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
