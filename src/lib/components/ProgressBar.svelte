<script>
	let { progress = 0, visible = false } = $props();
</script>

{#if visible}
	<div class="progress">
		<div class="progress-bar" style="width: {progress}%"></div>
	</div>
{/if}
