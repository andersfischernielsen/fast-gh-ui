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
    if (state === "open") return "#1a7f37";
    return "#8250df";
  }

  function stateBg(state: string): string {
    if (state === "open") return "#dafbe1";
    return "#fbefff";
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
    border-bottom: 1px solid #d0d7de;
  }
  .repo-name {
    font-size: 12px;
    color: #656d76;
    margin-bottom: 4px;
  }
  .title-row h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }
  .number {
    color: #656d76;
    font-weight: 400;
  }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    color: #656d76;
  }
  .state {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
  }
</style>
