<script lang="ts">
  import { pr } from "$lib/stores/pr.svelte";
  import Conversation from "$lib/components/Conversation.svelte";
</script>

{#if pr.value}
  <Conversation body={pr.value.body} editable />
{/if}
