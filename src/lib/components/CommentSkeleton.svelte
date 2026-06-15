<script lang="ts">
  let { count = 2 }: { count?: number } = $props();
</script>

{#each { length: count } as _}
  <article class="comment" aria-hidden="true">
    <div class="comment-header">
      <span class="user-info">
        <span class="avatar skel"></span>
        <span class="name skel"></span>
      </span>
      <span class="date skel"></span>
    </div>
    <div class="comment-body">
      <span class="line skel"></span>
      <span class="line skel"></span>
      <span class="line skel short"></span>
    </div>
  </article>
{/each}

<style>
  .comment {
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    margin-bottom: 4px;
    overflow: hidden;
  }
  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    height: 20px;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .name {
    height: 12px;
    width: 90px;
  }
  .date {
    height: 12px;
    width: 110px;
  }
  .comment-body {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .line {
    display: block;
    height: 12px;
    width: 100%;
  }
  .line.short {
    width: 55%;
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
