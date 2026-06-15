<script lang="ts">
  import { goto } from "$app/navigation";
  import { useShortcut, shortcutHint } from "$lib/utils/shortcut.svelte";

  let dialog = $state<HTMLDialogElement | null>(null);
  let urlInput = $state("");
  let error = $state("");

  const GITHUB_HOST_PATTERNS = ["github.com", "www.github.com"];

  type ParseResult =
    | { ok: true; route: string }
    | { ok: false; reason: string };

  function parseGitHubUrl(input: string): ParseResult {
    let url: URL;
    try {
      url = new URL(input.startsWith("http") ? input : `https://${input}`);
    } catch {
      return { ok: false, reason: "That doesn't look like a valid URL" };
    }

    if (!GITHUB_HOST_PATTERNS.includes(url.host)) {
      return {
        ok: false,
        reason: "Only github.com URLs are supported",
      };
    }

    const path = url.pathname.replace(/\/$/, "");
    const match = path.match(
      /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)(?:\/commits\/([a-f0-9]+))?$/,
    );
    if (!match) {
      return {
        ok: false,
        reason:
          "Expected: github.com/owner/repo/issues/123, /pull/123, or /pull/123/commits/abc123",
      };
    }

    const [, owner, repo, type, number, sha] = match;
    if (type === "issues") {
      return { ok: true, route: `/${owner}/${repo}/issues/${number}` };
    }
    if (type === "pull") {
      if (sha) {
        return {
          ok: true,
          route: `/${owner}/${repo}/pull/${number}/commits/${sha}`,
        };
      }
      return { ok: true, route: `/${owner}/${repo}/pull/${number}` };
    }
    return { ok: false, reason: "Unexpected error" };
  }

  $effect(() => useShortcut("g", openDialog));

  function openDialog() {
    urlInput = "";
    error = "";
    dialog?.showModal();
  }

  function closeDialog() {
    dialog?.close();
    urlInput = "";
    error = "";
  }

  function handleOpen() {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      error = "Please enter a GitHub URL";
      return;
    }

    const result = parseGitHubUrl(trimmed);
    if (!result.ok) {
      error = result.reason;
      return;
    }

    closeDialog();
    goto(result.route);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleOpen();
    }
  }
</script>

<button class="open-github-btn" onclick={openDialog}>
  <span>Open from GitHub</span>
  <span class="shortcut-hint">{shortcutHint("G")}</span>
</button>

<dialog bind:this={dialog} class="github-dialog" onclose={closeDialog}>
  <form class="dialog-content" onsubmit={(e) => e.preventDefault()}>
    <h2 class="dialog-title">Open from GitHub</h2>
    <input
      type="text"
      class="dialog-input"
      placeholder="https://github.com/owner/repo/pull/1"
      bind:value={urlInput}
      onkeydown={handleKeydown}
    />
    {#if error}
      <p class="dialog-error">{error}</p>
    {/if}
    <div class="dialog-actions">
      <button class="btn-cancel" type="button" onclick={closeDialog}
        >Cancel</button
      >
      <button class="btn-open" type="button" onclick={handleOpen}>Open</button>
    </div>
  </form>
</dialog>

<style>
  .open-github-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 6px 8px;
    border: none;
    background: none;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    border-radius: 6px;
    font-family: inherit;
    color: inherit;
  }
  .open-github-btn:hover {
    background: var(--bg-tertiary);
  }

  .shortcut-hint {
    font-size: 9px;
    color: var(--text-tertiary);
    padding: 1px 4px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    line-height: 1;
  }

  .github-dialog {
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    padding: 0;
    margin: auto;
    box-shadow: 0 8px 24px var(--shadow-dialog);
    width: 420px;
    max-width: 90vw;
    font-family: inherit;
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  .github-dialog::backdrop {
    background: var(--backdrop);
  }

  .dialog-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dialog-title {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dialog-input {
    padding: 5px 10px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    color: var(--text-primary);
    background: var(--bg-primary);
  }
  .dialog-input:focus {
    outline: none;
    border-color: var(--text-link);
    box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.3);
  }

  .dialog-error {
    margin: 0;
    font-size: 12px;
    color: var(--text-danger);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn-cancel,
  .btn-open {
    padding: 5px 14px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }

  .btn-cancel {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
  }
  .btn-cancel:hover {
    background: var(--bg-tertiary);
  }

  .btn-open {
    background: var(--text-link);
    border: 1px solid var(--text-link);
    color: var(--text-white);
  }
  .btn-open:hover {
    background: var(--text-link-hover);
  }

  @container (max-width: 119px) {
    .open-github-btn {
      font-size: 10px;
    }
    .shortcut-hint {
      display: none;
    }
  }
</style>
