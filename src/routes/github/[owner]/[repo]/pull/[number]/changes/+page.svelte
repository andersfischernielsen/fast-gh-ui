<script lang="ts">
  import FilesChanged from '$lib/components/FilesChanged.svelte';
  import { pr } from '$lib/stores/pr.svelte';
</script>

<FilesChanged headSha={pr.value?.head.sha ?? ''} />