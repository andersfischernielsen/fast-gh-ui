<script lang="ts">
  let {
    issue,
    owner,
    repo,
  }: {
    issue: {
      number: number;
      title: string;
      state: string;
      user: { login: string };
      createdAt: string;
      htmlUrl: string;
    };
    owner: string | undefined;
    repo: string | undefined;
  } = $props();

  function stateColor(state: string): string {
    if (state === "open") return "var(--state-open-text)";
    return "var(--state-merged-text)";
  }

  function stateBg(state: string): string {
    if (state === "open") return "var(--state-open-bg)";
    return "var(--state-merged-bg)";
  }
</script>

<header class="header">
  <div class="title-row">
    <div class="repo-name">{owner}/{repo}</div>
    <h1>
      <span class="number">#{issue.number}</span>
      {issue.title}
    </h1>
  </div>
  <div class="meta-row">
    <span
      class="state"
      style="background:{stateBg(issue.state)};color:{stateColor(issue.state)}"
      >{issue.state}</span
    >
    <span>{issue.user.login}</span>
  </div>
</header>

<style>
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-primary);
  }
  .repo-name {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  .title-row h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }
  .number {
    color: var(--text-secondary);
    font-weight: 400;
  }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .state {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
  }
</style>
