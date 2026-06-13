<script lang="ts">
  import { page } from "$app/state";
</script>

<div class="error-page">
  <h1>{page.status}</h1>
  <p>{page.error?.message ?? "Something went wrong"}</p>
  <a href="/github">Back to home</a>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 16px;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  h1 {
    font-size: 48px;
    font-weight: 600;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
  }

  a {
    color: var(--text-link);
    text-decoration: none;
    font-size: 14px;
  }

  a:hover {
    text-decoration: underline;
  }
</style>
