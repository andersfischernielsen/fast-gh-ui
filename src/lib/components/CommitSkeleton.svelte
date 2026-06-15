<script lang="ts">
  let { count = 6 }: { count?: number } = $props();
</script>

{#each { length: count } as _}
  <div class="commit" aria-hidden="true">
    <div class="commit-meta">
      <span class="sha skel"></span>
      <span class="author skel"></span>
    </div>
    <span class="commit-message skel"></span>
  </div>
{/each}

<style>
  .commit {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-secondary);
  }
  .commit-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 2px;
  }
  .sha {
    display: inline-block;
    height: 18px;
    width: 64px;
    border-radius: 4px;
  }
  .author {
    display: inline-block;
    height: 14px;
    width: 90px;
  }
  .commit-message {
    display: block;
    height: 14px;
    width: 70%;
    margin-top: 4px;
  }
  .skel {
    background: var(--bg-secondary);
    border-radius: 4px;
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.9; }
  }
</style>
