<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { fetchCommit } from "$lib/github/pulls";
  import DiffViewer from "$lib/components/DiffViewer.svelte";

  interface CommitFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }

  interface CommitInfo {
    sha: string;
    message: string;
    author: { login: string; avatarUrl: string };
    date: string;
  }

  let loading = $state(true);
  let error = $state<string | null>(null);
  let commitInfo = $state<CommitInfo | null>(null);
  let files = $state<CommitFile[]>([]);
  let selectedFile = $state<CommitFile | null>(null);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived($page.params.number);
  let sha = $derived($page.params.sha);

  onMount(async () => {
    try {
      const raw = await fetchCommit(owner, repo, sha);
      const authorLogin =
        (raw.author as { login?: string })?.login ??
        (raw.commit as { author?: { name?: string } })?.author?.name ??
        "unknown";
      commitInfo = {
        sha: raw.sha as string,
        message: ((raw.commit as { message?: string })?.message ?? "").split(
          "\n",
        )[0],
        author: {
          login: authorLogin,
          avatarUrl: (raw.author as { avatar_url?: string })?.avatar_url ?? "",
        },
        date:
          (raw.commit as { author?: { date?: string } })?.author?.date ?? "",
      };
      const rawFiles = (raw.files as Array<Record<string, unknown>>) || [];
      files = rawFiles.map((f) => ({
        filename: f.filename as string,
        status: f.status as string,
        additions: f.additions as number,
        deletions: f.deletions as number,
        changes: f.changes as number,
        patch: f.patch as string | undefined,
      }));
      if (files.length > 0) selectedFile = files[0];
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  });

  function shortSha(s: string): string {
    return s.substring(0, 7);
  }
</script>

{#if loading}
  <p class="status">Loading commit...</p>
{:else if error}
  <p class="status error">{error}</p>
{:else if commitInfo}
  <div class="commit-detail">
    <div class="commit-header">
      <h2>{commitInfo.message}</h2>
      <div class="commit-meta">
        <span class="author">{commitInfo.author.login}</span>
        <span class="sha">{shortSha(commitInfo.sha)}</span>
      </div>
    </div>
    <div class="file-diff-layout">
      <div class="file-list">
        <h3>Files changed ({files.length})</h3>
        {#each files as file (file.filename)}
          <button
            class="file-item"
            class:active={selectedFile?.filename === file.filename}
            onclick={() => (selectedFile = file)}
          >
            <span class="file-name">{file.filename}</span>
            <span class="file-stats">
              {#if file.status === "added"}<span class="added-badge">added</span
                >{/if}
              {#if file.status === "removed"}<span class="removed-badge"
                  >removed</span
                >{/if}
              {#if file.status === "renamed"}<span class="renamed-badge"
                  >renamed</span
                >{/if}
              <span class="adds">+{file.additions}</span>
              <span class="dels">-{file.deletions}</span>
            </span>
          </button>
        {/each}
      </div>
      <div class="diff-view">
        {#if selectedFile?.patch}
          <div class="diff-header">{selectedFile.filename}</div>
          <DiffViewer
            patch={selectedFile.patch}
            currentFile={selectedFile.filename}
          />
        {:else}
          <p class="no-diff">No diff available for {selectedFile?.filename}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .commit-detail {
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .commit-header {
    padding: 12px 16px;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
  }
  .commit-header h2 {
    font-size: 16px;
    margin: 0 0 4px 0;
  }
  .commit-meta {
    display: flex;
    gap: 8px;
    font-size: 13px;
    color: #656d76;
  }
  .author {
    font-weight: 600;
  }
  .sha {
    font-family: monospace;
    font-size: 12px;
    background: #f0f0f0;
    padding: 1px 6px;
    border-radius: 4px;
  }
  .file-diff-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .file-list {
    width: 280px;
    min-width: 280px;
    border-right: 1px solid #d0d7de;
    overflow-y: auto;
    background: #f6f8fa;
  }
  .file-list h3 {
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #656d76;
    text-transform: uppercase;
    margin: 0;
  }
  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
  }
  .file-item:hover {
    background: #eaeef2;
  }
  .file-item.active {
    background: #d0d7de;
  }
  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
  }
  .file-stats {
    display: flex;
    gap: 4px;
    font-size: 11px;
    white-space: nowrap;
  }
  .added-badge {
    color: #1a7f37;
    font-weight: 600;
  }
  .removed-badge {
    color: #cf222e;
    font-weight: 600;
  }
  .renamed-badge {
    color: #0969da;
    font-weight: 600;
  }
  .adds {
    color: #1a7f37;
  }
  .dels {
    color: #cf222e;
  }
  .diff-view {
    flex: 1;
    overflow-y: auto;
  }
  .diff-header {
    padding: 8px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-family: monospace;
    font-size: 13px;
    color: #656d76;
  }
  .status {
    padding: 16px;
    color: #656d76;
    font-size: 14px;
  }
  .status.error {
    color: #cf222e;
  }
  .no-diff {
    padding: 16px;
    color: #656d76;
  }
</style>
