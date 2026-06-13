<script lang="ts">
  import { enhance } from "$app/forms";
</script>

<svelte:head>
  <title>Settings — Fast GitHub UI</title>
</svelte:head>

<main class="page">
  <h1>Settings</h1>
  <form method="POST" action="?/logout" use:enhance>
    <button type="submit">Sign out</button>
  </form>
</main>

<style>
  main {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1 {
    font-size: 20px;
    margin-bottom: 1.5rem;
  }
  button {
    padding: 6px 16px;
    background: var(--btn-danger-bg);
    color: var(--btn-danger-text);
    border: none;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }
</style>
