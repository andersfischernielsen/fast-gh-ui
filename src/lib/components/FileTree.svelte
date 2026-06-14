<script lang="ts">
  interface PRFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }

  let {
    files,
    selectedFile,
    onselect,
  }: {
    files: PRFile[];
    selectedFile: string | null;
    onselect: (filename: string) => void;
  } = $props();

  function fileIcon(status: string): string {
    if (status === "added") return "+";
    if (status === "removed") return "−";
    return "•";
  }
</script>

<aside class="file-tree">
  <div class="tree-header">
    <span>{files.length} files</span>
  </div>
  <div class="tree-list">
    {#each files as file (file.filename)}
      <button
        class="file-item"
        class:selected={selectedFile === file.filename}
        title={file.filename}
        onclick={() => onselect(file.filename)}
      >
        <span
          class="icon"
          class:added={file.status === "added"}
          class:removed={file.status === "removed"}
          >{fileIcon(file.status)}</span
        >
        <span class="name">{file.filename}</span>
        <span class="counts">
          <span class="add">+{file.additions}</span>
          <span class="del">−{file.deletions}</span>
        </span>
      </button>
    {/each}
  </div>
</aside>

<style>
  .file-tree {
    max-width: 320px;
    min-width: 240px;
    border-right: 1px solid var(--border-primary);
    overflow-y: auto;
    background: var(--bg-secondary);
    container-type: inline-size;
  }
  .tree-header {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-primary);
  }
  .tree-list {
    padding: 4px 0;
  }
  .file-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 12px;
    border: none;
    background: none;
    text-align: left;
    font-size: 12px;
    font-family: monospace;
    cursor: pointer;
    color: var(--text-primary);
  }
  .file-item:hover {
    background: var(--bg-tertiary);
  }
  .file-item.selected {
    background: var(--bg-selected);
  }
  .icon {
    width: 14px;
    text-align: center;
  }
  .icon.added {
    color: var(--text-success);
  }
  .icon.removed {
    color: var(--text-danger);
  }
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .counts {
    display: flex;
    gap: 6px;
    font-size: 11px;
  }
  .add {
    color: var(--text-success);
  }
  .del {
    color: var(--text-danger);
  }

  @container (max-width: 200px) {
    .counts {
      display: none;
    }
    .icon {
      display: none;
    }
  }
</style>
