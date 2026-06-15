<script lang="ts">
  let {
    owner,
    repo,
    number,
    title = null,
  }: {
    owner: string | undefined;
    repo: string | undefined;
    number: number;
    title?: string | null;
  } = $props();
</script>

<header class="header">
  <div class="repo-name">{owner}/{repo}</div>
  <div class="title-row">
    <div class="title-content">
      <h1>
        <span class="number">#{number}</span>
        {#if title}
          {title}
        {:else}
          <span class="title-skel skel"></span>
        {/if}
      </h1>
    </div>
    <div class="title-actions">
      <span class="btn-skel skel"></span>
    </div>
  </div>
  <div class="meta-row">
    <span class="state-skel skel"></span>
    <span class="user-skel skel"></span>
    <span class="branch-skel skel"></span>
    <span class="review-skel skel"></span>
    <span class="stats-skel skel"></span>
  </div>
</header>

<style>
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-primary);
    container-type: inline-size;
  }
  .repo-name {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 30px;
  }
  .title-content {
    flex: 1;
    min-width: 0;
  }
  .title-content h1 {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .number {
    color: var(--text-secondary);
    font-weight: 400;
  }
  .title-skel {
    display: inline-block;
    height: 18px;
    width: 320px;
    max-width: 60%;
    vertical-align: middle;
  }
  .title-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
    flex-shrink: 0;
  }
  .btn-skel {
    display: inline-block;
    height: 26px;
    width: 64px;
    border-radius: 6px;
  }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .state-skel {
    height: 18px;
    width: 56px;
    border-radius: 12px;
  }
  .user-skel {
    height: 14px;
    width: 90px;
  }
  .branch-skel {
    height: 14px;
    width: 140px;
  }
  .review-skel {
    margin-left: auto;
    height: 14px;
    width: 50px;
  }
  .stats-skel {
    height: 14px;
    width: 110px;
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

  @container (max-width: 500px) {
    .branch-skel {
      display: none;
    }
  }
</style>
