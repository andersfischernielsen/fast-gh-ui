<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>Fast GH UI</title>
</svelte:head>

{@render children()}
