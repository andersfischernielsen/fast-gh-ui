<script lang="ts">
  let { count = 3 }: { count?: number } = $props();
</script>

{#each { length: count } as _}
  <div class="item" aria-hidden="true">
    <span class="repo skel"></span>
    <span class="title skel"></span>
    <span class="meta">
      <span class="badge skel"></span>
      <span class="time skel"></span>
    </span>
  </div>
{/each}

<style>
  .item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 16px 10px 28px;
    border-bottom: 1px solid var(--border-secondary);
    position: relative;
  }
  .skel {
    display: inline-block;
    background: var(--bg-secondary);
    border-radius: 4px;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .repo {
    height: 14px;
    width: 35%;
  }
  .title {
    height: 16px;
    width: 80%;
    margin-top: 2px;
  }
  .meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }
  .badge {
    height: 14px;
    width: 40px;
    border-radius: 10px;
  }
  .time {
    height: 14px;
    width: 24px;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }
</style>
