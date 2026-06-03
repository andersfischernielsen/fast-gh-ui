<script lang="ts">
  import { goto } from "$app/navigation";
  import { useShortcut, shortcutHint } from "$lib/utils/shortcut.svelte";

  let dialog = $state<HTMLDialogElement | null>(null);
  let urlInput = $state("");
  let error = $state("");

  const GITHUB_HOST_PATTERNS = ["github.com", "www.github.com"];

  function parseGitHubUrl(input: string): string | null {
    let url: URL;
    try {
      url = new URL(input.startsWith("http") ? input : `https://${input}`);
    } catch {
      return null;
    }

    if (!GITHUB_HOST_PATTERNS.includes(url.host)) return null;

    const path = url.pathname.replace(/\/$/, "");
    const match = path.match(
      /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)(?:\/commits\/([a-f0-9]+))?$/,
    );
    if (!match) return null;

    const [, owner, repo, type, number, sha] = match;
    if (type === "issues") {
      return `/github/${owner}/${repo}/issues/${number}`;
    }
    if (type === "pull") {
      if (sha) {
        return `/github/${owner}/${repo}/pull/${number}/commits/${sha}`;
      }
      return `/github/${owner}/${repo}/pull/${number}`;
    }
    return null;
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

    const route = parseGitHubUrl(trimmed);
    if (!route) {
      error =
        "Unsupported GitHub URL. Supported: /issues, /pull, /pull/*/commits/*";
      return;
    }

    closeDialog();
    goto(route);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      handleOpen();
    }
  }
</script>

<button class="open-github-btn" onclick={openDialog}>
  <span>Open from GitHub</span>
  <span class="shortcut-hint">{shortcutHint("G")}</span>
</button>

<dialog bind:this={dialog} class="github-dialog" onclose={closeDialog}>
  <form method="dialog" class="dialog-content">
    <h2 class="dialog-title">Open from GitHub</h2>
    <p class="dialog-description">Paste a GitHub URL to open it in this app</p>
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
    background: #eaeef2;
  }

  .shortcut-hint {
    font-size: 10px;
    color: #8b949e;
    padding: 1px 4px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    line-height: 1.2;
  }

  .github-dialog {
    border: none;
    border-radius: 12px;
    padding: 0;
    margin: auto;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    width: 420px;
    max-width: 90vw;
    font-family: inherit;
  }
  .github-dialog::backdrop {
    background: rgba(0, 0, 0, 0.3);
  }

  .dialog-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dialog-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2328;
  }

  .dialog-description {
    margin: 0;
    font-size: 12px;
    color: #656d76;
  }

  .dialog-input {
    padding: 5px 10px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
  }
  .dialog-input:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.3);
  }

  .dialog-error {
    margin: 0;
    font-size: 12px;
    color: #cf222e;
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
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    color: #1f2328;
  }
  .btn-cancel:hover {
    background: #eaeef2;
  }

  .btn-open {
    background: #0969da;
    border: 1px solid #0969da;
    color: #fff;
  }
  .btn-open:hover {
    background: #0858c2;
  }
</style>
