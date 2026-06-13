<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";

  let { form }: { form?: ActionData } = $props();
  let input = $state("");
  let loading = $state(false);
</script>

<svelte:head>
  <title>Login — GitHub Frontend</title>
</svelte:head>

<main class="page">
  <h1>Fast GitHub UI</h1>
  <p>Enter a GitHub personal access token to get started.</p>

  <form
    method="POST"
    use:enhance={() => {
      loading = true;
      return async ({ update }) => {
        loading = false;
        await update();
      };
    }}
  >
    <label for="token">Personal Access Token</label>
    <input
      id="token"
      name="token"
      type="password"
      bind:value={input}
      placeholder="github_pat_..."
      disabled={loading}
    />
    {#if form?.error}
      <p class="error-message">{form.error}</p>
    {/if}
    <button type="submit" disabled={loading}>
      {loading ? "Verifying..." : "Sign In"}
    </button>
  </form>

  <section class="help">
    <h3>Token requirements</h3>
    <div class="help-content">
      <p>
        This app requires a <strong>classic</strong> token (<code>ghp_...</code
        >). Fine-grained tokens do not support the Notifications API.
      </p>
      <p>
        Create one at{" "}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener"
        >
          GitHub Settings → Tokens (classic)
        </a>{" "}
        with these scopes:
      </p>
      <table class="perm-table">
        <thead>
          <tr><th>Scope</th><th>Used for</th></tr>
        </thead>
        <tbody>
          <tr
            ><td><code>repo</code></td><td
              >View PRs, diffs, comments, checks; post comments and reviews</td
            ></tr
          >
          <tr
            ><td><code>notifications</code></td><td
              >Fetch notification inbox, mark threads as read</td
            ></tr
          >
        </tbody>
      </table>
    </div>
  </section>

  <section class="help">
    <h3>Privacy &amp; storage</h3>
    <div class="help-content">
      <p>
        Your token is sent to this app over HTTPS and stored as an
        <strong>HttpOnly cookie</strong>. It is used only by the server to call
        GitHub's API on your behalf, and is never logged or exposed to the browser.
      </p>
      <p>
        You can revoke your token at any time in <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener">GitHub Settings</a
        >, or sign out below to clear the cookie from your browser.
      </p>
    </div>
  </section>
</main>

<style>
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  label {
    font-size: 0.875rem;
    font-weight: 600;
  }
  input {
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 0.875rem;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  button {
    padding: 0.625rem 1rem;
    background: var(--btn-primary-bg);
    color: var(--btn-primary-text);
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .error-message {
    color: var(--text-danger);
    font-size: 0.8125rem;
    margin: 0;
  }

  .help {
    width: 100%;
    margin-top: 1.5rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    overflow: hidden;
  }
  .help h3 {
    padding: 8px 14px;
    background: var(--bg-secondary);
    font-size: 12px;
    font-weight: 600;
    border-bottom: 1px solid var(--border-primary);
  }
  .help-content {
    padding: 14px;
    font-size: 12px;
    color: var(--text-primary);
  }
  .help-content p {
    margin-bottom: 10px;
  }
  .help-content p:last-child {
    margin-bottom: 0;
  }
  .help-content code {
    background: var(--bg-code);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
  }
  .help-content a {
    color: var(--text-link);
    text-decoration: none;
  }

  .perm-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 12px;
  }
  .perm-table th {
    text-align: left;
    padding: 4px 8px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .perm-table td {
    padding: 4px 8px;
    border-top: 1px solid var(--border-secondary);
  }
</style>
