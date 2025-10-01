<script>
	let { type = '', message = '' } = $props();
</script>

{#if message}
	<div class="status {type}">{message}</div>
{/if}
