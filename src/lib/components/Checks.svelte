<script lang="ts">
  import type { CheckRunData } from "$lib/types/checkRun";

  let {
    checks,
  }: {
    checks?: { check_runs?: CheckRunData[] };
  } = $props();

  let checkRuns = $derived<CheckRunData[]>(checks?.check_runs ?? []);

  function conclusionIcon(conclusion: string | null): string {
    if (conclusion === "success") return "✓";
    if (conclusion === "failure") return "✗";
    if (conclusion === "neutral") return "—";
    if (conclusion === "cancelled") return "⊘";
    if (conclusion === "skipped") return "⊘";
    return "";
  }

  function conclusionColor(conclusion: string | null): string {
    if (conclusion === "success") return "var(--text-success)";
    if (conclusion === "failure") return "var(--text-danger)";
    if (conclusion === "cancelled" || conclusion === "skipped")
      return "var(--text-secondary)";
    return "var(--text-warning)";
  }
</script>

<div class="checks-panel">
  {#if checkRuns.length === 0}
    <p class="status">No checks configured</p>
  {:else}
    {#each checkRuns as check (check.id)}
      <div class="check">
        <span class="icon" style="color:{conclusionColor(check.conclusion)}"
          >{conclusionIcon(check.conclusion)}</span
        >
        <div class="check-info">
          <span class="check-name">{check.name}</span>
          <span class="check-status"
            >{check.status}
            {check.conclusion ? "· " + check.conclusion : ""}</span
          >
        </div>
        {#if check.detailsUrl}
          <a
            class="details-link"
            href={check.detailsUrl}
            target="_blank"
            rel="noopener">Details ↗</a
          >
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border-secondary);
  }
  .check:hover {
    background: var(--bg-secondary);
  }
  .icon {
    width: 20px;
    font-size: 16px;
    font-weight: 600;
  }
  .check-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .check-name {
    font-size: 12px;
    font-weight: 600;
  }
  .check-status {
    font-size: 12px;
    color: var(--text-secondary);
  }
  .details-link {
    padding: 4px 12px;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-primary);
    text-decoration: none;
    background: var(--bg-secondary);
  }
  .details-link:hover {
    background: var(--bg-tertiary);
  }
  .status {
    padding: 16px;
    color: var(--text-secondary);
    font-size: 12px;
  }
</style>
