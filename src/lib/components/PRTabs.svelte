<script lang="ts">
  import { page } from "$app/stores";

  let base = $derived(
    `/github/${$page.params.owner}/${$page.params.repo}/pull/${$page.params.number}`,
  );
  let active = $derived($page.route.id?.split("/").pop() ?? "conversation");
</script>

<nav class="tabs">
  <a
    class="tab"
    class:active={active === "conversation"}
    href="{base}/conversation"
  >
    Conversation
  </a>
  <a class="tab" class:active={active === "commits"} href="{base}/commits">
    Commits
  </a>
  <a class="tab" class:active={active === "checks"} href="{base}/checks">
    Checks
  </a>
  <a class="tab" class:active={active === "changes"} href="{base}/changes">
    <span class="full-label">Files changed</span>
    <span class="short-label">Files</span>
  </a>
</nav>

<style>
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    padding: 0 16px;
    overflow-x: auto;
  }
  .tab {
    padding: 10px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    font-size: 12px;
    cursor: pointer;
    color: var(--text-secondary);
    font-family: inherit;
    text-decoration: none;
    white-space: nowrap;
  }
  .tab:hover {
    color: var(--text-primary);
  }
  .tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--text-accent);
    font-weight: 600;
  }

  .short-label {
    display: none;
  }

  @media (max-width: 480px) {
    .full-label {
      display: none;
    }
    .short-label {
      display: inline;
    }
  }
</style>
