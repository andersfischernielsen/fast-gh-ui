<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>Fast GH</title>
</svelte:head>

{@render children()}
