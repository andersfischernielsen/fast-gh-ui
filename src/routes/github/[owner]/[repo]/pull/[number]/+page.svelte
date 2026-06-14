<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived($page.params.number);

  onMount(() => {
    goto(`/github/${owner}/${repo}/pull/${number}/conversation`, {
      replaceState: true,
    });
  });
</script>
