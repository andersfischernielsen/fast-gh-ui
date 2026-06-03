<script lang="ts">
  import { getContext } from "svelte";
  import IssueConversation from "$lib/components/IssueConversation.svelte";

  let issueStore = getContext<{ value: { body: string | null } | null }>(
    "issue",
  );
  let body = $derived(issueStore?.value?.body ?? null);
</script>

<IssueConversation {body} />
