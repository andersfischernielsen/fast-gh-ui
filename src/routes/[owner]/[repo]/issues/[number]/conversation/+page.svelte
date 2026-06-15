<script lang="ts">
  import { getContext } from "svelte";
  import Conversation from "$lib/components/Conversation.svelte";

  let issueStore = getContext<{ value: { body: string | null } | null }>("issue");
  let body = $derived(issueStore?.value?.body ?? null);
</script>

<Conversation {body} />
