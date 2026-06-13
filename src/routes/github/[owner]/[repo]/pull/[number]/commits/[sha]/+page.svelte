<script lang="ts">
  import DiffViewer from "$lib/components/DiffViewer.svelte";
  import type { CommitFile } from "$lib/types/commit";

  let { data } = $props();

  let selectedFile = $state<CommitFile | null>(null);
  let showFiles = $state(false);

  $effect(() => {
    data.commit.then((commit) => {
      if (!selectedFile && commit.files.length > 0) {
        selectedFile = commit.files[0];
      }
    });
  });

  function shortSha(s: string): string {
    return s.substring(0, 7);
  }
</script>

{#await data.commit}
  <p class="status">Loading commit...</p>
{:then commit}
  <div class="commit-detail">
    <div class="commit-header">
      <h2>{commit.message}</h2>
      <div class="commit-meta">
        <span class="author">{commit.author.login}</span>
        <span class="sha">{shortSha(commit.sha)}</span>
      </div>
    </div>
    <button class="files-trigger" onclick={() => (showFiles = !showFiles)}>
      Files {showFiles ? "▾" : "▸"}
    </button>
    <div class="file-diff-layout">
      <div class="files-wrapper" class:files-open={showFiles}>
        {#if showFiles}
          <div
            class="files-overlay"
            role="button"
            tabindex="0"
            onclick={() => (showFiles = false)}
            onkeydown={(e) => e.key === "Enter" && (showFiles = false)}
          ></div>
        {/if}
        <div class="file-list">
          <h3>{commit.files.length} files</h3>
          {#each commit.files as file (file.filename)}
            <button
              class="file-item"
              class:active={selectedFile?.filename === file.filename}
              onclick={() => {
                selectedFile = file;
                showFiles = false;
              }}
            >
              <span class="file-name">{file.filename}</span>
              <span class="file-stats">
                {#if file.status === "added"}<span class="added-badge">added</span>{/if}
                {#if file.status === "removed"}<span class="removed-badge">removed</span>{/if}
                {#if file.status === "renamed"}<span class="renamed-badge">renamed</span>{/if}
                <span class="adds">+{file.additions}</span>
                <span class="dels">-{file.deletions}</span>
              </span>
            </button>
          {/each}
        </div>
      </div>
      <div class="diff-view">
        {#if selectedFile?.patch}
          <div class="diff-header">{selectedFile.filename}</div>
          <DiffViewer
            patch={selectedFile.patch}
            currentFile={selectedFile.filename}
          />
        {:else}
          <p class="no-diff">
            No diff available for {selectedFile?.filename}
          </p>
        {/if}
      </div>
    </div>
  </div>
{:catch e}
  <p class="status error">{e instanceof Error ? e.message : String(e)}</p>
{/await}

<style>
  .commit-detail {
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .commit-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
  }
  .commit-header h2 {
    font-size: 16px;
    margin: 0 0 4px 0;
  }
  .commit-meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .author {
    font-weight: 600;
  }
  .sha {
    font-family: monospace;
    font-size: 12px;
    background: var(--bg-code);
    padding: 1px 6px;
    border-radius: 4px;
  }
  .file-diff-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .files-trigger {
    display: none;
  }
  .files-wrapper {
    display: contents;
  }
  .files-overlay {
    display: none;
  }
  @media (max-width: 768px) {
    .files-trigger {
      display: block;
      padding: 12px 12px;
      border: none;
      border-bottom: 1px solid var(--border-primary);
      background: var(--bg-secondary);
      font-size: 12px;
      cursor: pointer;
      color: var(--text-primary);
      font-family: inherit;
      text-align: left;
      width: 100%;
      flex-shrink: 0;
    }
    .files-trigger:hover {
      background: var(--bg-tertiary);
    }
    .file-diff-layout {
      position: relative;
    }
    .files-wrapper {
      display: block;
      position: relative;
    }
    .files-wrapper:not(.files-open) > .file-list {
      display: none;
    }
    .files-wrapper.files-open > .file-list {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      z-index: 20;
      box-shadow: 4px 0 8px var(--shadow-dialog);
    }
    .files-overlay {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 19;
    }
  }
  .file-list {
    width: 280px;
    min-width: 280px;
    border-right: 1px solid var(--border-primary);
    overflow-y: auto;
    background: var(--bg-secondary);
  }
  .file-list h3 {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
    border-bottom: 1px solid var(--border-primary);
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
    font-size: 12px;
    color: var(--text-primary);
  }
  .file-item:hover {
    background: var(--bg-tertiary);
  }
  .file-item.active {
    background: var(--border-primary);
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
    color: var(--text-success);
    font-weight: 600;
  }
  .removed-badge {
    color: var(--text-danger);
    font-weight: 600;
  }
  .renamed-badge {
    color: var(--text-link);
    font-weight: 600;
  }
  .adds {
    color: var(--text-success);
  }
  .dels {
    color: var(--text-danger);
  }
  .diff-view {
    flex: 1;
    overflow-y: auto;
  }
  .diff-header {
    padding: 8px 16px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    font-family: monospace;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
  .status.error {
    color: var(--text-danger);
  }
  .no-diff {
    padding: 16px;
    color: var(--text-secondary);
  }
</style>
