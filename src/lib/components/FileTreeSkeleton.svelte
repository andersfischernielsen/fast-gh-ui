<script lang="ts">
  let { count = 10 }: { count?: number } = $props();
</script>

<aside class="file-tree" aria-hidden="true">
  <div class="tree-header">
    <span class="header-skel skel"></span>
  </div>
  <div class="tree-list">
    {#each { length: count } as _}
      <div class="file-item">
        <span class="icon skel"></span>
        <span class="name skel"></span>
        <span class="counts">
          <span class="add skel"></span>
          <span class="del skel"></span>
        </span>
      </div>
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
    border-bottom: 1px solid var(--border-primary);
  }
  .header-skel {
    display: inline-block;
    height: 14px;
    width: 60px;
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
  }
  .icon {
    width: 14px;
    height: 12px;
  }
  .name {
    flex: 1;
    height: 12px;
    min-width: 0;
  }
  .counts {
    display: flex;
    gap: 6px;
  }
  .add,
  .del {
    display: inline-block;
    height: 11px;
    width: 22px;
  }
  .skel {
    background: var(--bg-tertiary);
    border-radius: 4px;
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }
</style>
