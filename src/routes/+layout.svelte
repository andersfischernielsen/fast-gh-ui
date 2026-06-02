<script lang="ts">
  import '../app.css';
  import { isValid } from '$lib/stores/token.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  $effect(() => {
    if ($page.url.pathname !== '/login' && !isValid()) {
      goto('/login');
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
