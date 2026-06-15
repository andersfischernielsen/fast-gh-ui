<script lang="ts">
  let { count = 4 }: { count?: number } = $props();
</script>

{#each { length: count } as _}
  <div class="check" aria-hidden="true">
    <span class="icon skel"></span>
    <div class="check-info">
      <span class="check-name skel"></span>
      <span class="check-status skel"></span>
    </div>
    <span class="details-link skel"></span>
  </div>
{/each}

<style>
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-secondary);
  }
  .icon {
    width: 20px;
    height: 16px;
  }
  .check-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .check-name {
    height: 14px;
    width: 45%;
  }
  .check-status {
    height: 12px;
    width: 25%;
  }
  .details-link {
    display: inline-block;
    height: 24px;
    width: 70px;
    border-radius: 6px;
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
