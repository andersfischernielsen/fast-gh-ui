<script lang="ts">
  import DiffViewer from "$lib/components/DiffViewer.svelte";
  let { data } = $props();

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
    <div class="file-diff-layout">
      <div class="file-list">
        <h3>{commit.files.length} files</h3>
        {#each commit.files as file (file.filename)}
          <div class="file-item">
            <span class="file-name">{file.filename}</span>
            <span class="file-stats">
              {#if file.status === "added"}<span class="added-badge">added</span>{/if}
              {#if file.status === "removed"}<span class="removed-badge">removed</span>{/if}
              {#if file.status === "renamed"}<span class="renamed-badge">renamed</span>{/if}
              <span class="adds">+{file.additions}</span>
              <span class="dels">-{file.deletions}</span>
            </span>
          </div>
        {/each}
      </div>
      <div class="diff-view">
        {#if commit.files[0]?.patch}
          <div class="diff-header">{commit.files[0].filename}</div>
          <DiffViewer patch={commit.files[0].patch} currentFile={commit.files[0].filename} />
        {:else}
          <p class="no-diff">No diff available for {commit.files[0]?.filename}</p>
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
    border-bottom: 1px solid var(--border-primary);
    font-size: 12px;
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
  .added-badge { color: var(--text-success); font-weight: 600; }
  .removed-badge { color: var(--text-danger); font-weight: 600; }
  .renamed-badge { color: var(--text-link); font-weight: 600; }
  .adds { color: var(--text-success); }
  .dels { color: var(--text-danger); }
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
  .status.error { color: var(--text-danger); }
  .no-diff {
    padding: 16px;
    color: var(--text-secondary);
  }
</style>
