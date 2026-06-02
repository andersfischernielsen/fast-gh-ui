<script lang="ts">
  import { getToken, clearToken, setToken } from '$lib/stores/token.svelte';
  import { goto } from '$app/navigation';

  let currentToken = $state(getToken() ?? '');
  let showToken = $state(false);

  function handleLogout() {
    clearToken();
    goto('/github/login');
  }
</script>

<svelte:head>
  <title>Settings — GitHub Frontend</title>
</svelte:head>

<div class="settings">
  <h1>Settings</h1>
  <div class="section">
    <h2>GitHub Token</h2>
    <div class="token-display">
      <input type={showToken ? 'text' : 'password'} bind:value={currentToken} />
      <button onclick={() => showToken = !showToken}>{showToken ? 'Hide' : 'Show'}</button>
    </div>
    <button class="save-btn" onclick={() => { if (currentToken) setToken(currentToken); }}>Save Token</button>
  </div>
  <div class="section">
    <h2>Account</h2>
    <button class="logout-btn" onclick={handleLogout}>Logout</button>
  </div>
  <button class="back-btn" onclick={() => history.back()}>Back</button>
</div>

<style>
  .settings { max-width: 600px; margin: 0 auto; padding: 2rem; }
  h1 { font-size: 20px; margin-bottom: 1.5rem; }
  h2 { font-size: 16px; margin-bottom: 0.75rem; }
  .section { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #d0d7de; }
  .token-display { display: flex; gap: 8px; margin-bottom: 8px; }
  .token-display input {
    flex: 1; padding: 6px 10px;
    border: 1px solid #d0d7de; border-radius: 6px;
    font-size: 14px;
  }
  .token-display button {
    padding: 6px 12px; border: 1px solid #d0d7de;
    border-radius: 6px; background: #f6f8fa; cursor: pointer; font-size: 13px;
  }
  .save-btn {
    padding: 6px 16px; background: #1f883d; color: #fff;
    border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
  }
  .save-btn:hover { background: #1a7f37; }
  .logout-btn {
    padding: 6px 16px; background: #cf222e; color: #fff;
    border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
  }
  .back-btn {
    padding: 6px 16px; border: 1px solid #d0d7de;
    border-radius: 6px; background: #f6f8fa; cursor: pointer; font-size: 14px;
  }
</style>
