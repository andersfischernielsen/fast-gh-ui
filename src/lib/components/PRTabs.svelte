<script lang="ts">
  import { page } from '$app/stores';

  let { commitsCount = -1, filesCount = 0 }: { commitsCount?: number; filesCount?: number } = $props();

  let base = $derived(`/${$page.params.owner}/${$page.params.repo}/pull/${$page.params.number}`);
  let active = $derived($page.route.id?.split('/').pop() ?? 'conversation');
</script>

<nav class="tabs">
  <a class="tab" class:active={active === 'conversation'} href="{base}/conversation">
    Conversation
  </a>
  <a class="tab" class:active={active === 'commits'} href="{base}/commits">
    Commits{commitsCount >= 0 ? ` (${commitsCount})` : ''}
  </a>
  <a class="tab" class:active={active === 'checks'} href="{base}/checks">
    Checks
  </a>
  <a class="tab" class:active={active === 'changes'} href="{base}/changes">
    Files changed ({filesCount})
  </a>
</nav>

<style>
  .tabs {
    display: flex;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
    padding: 0 16px;
  }
  .tab {
    padding: 10px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    font-size: 14px;
    cursor: pointer;
    color: #656d76;
    font-family: inherit;
    text-decoration: none;
  }
  .tab:hover { color: #1f2328; }
  .tab.active {
    color: #1f2328;
    border-bottom-color: #fd8c73;
    font-weight: 500;
  }
</style>
