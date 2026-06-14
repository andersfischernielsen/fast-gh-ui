<script lang="ts">
  import Checks from "$lib/components/Checks.svelte";
  import { pr } from "$lib/stores/pr.svelte";
</script>

<Checks headSha={pr.value?.head.sha ?? ""} />
