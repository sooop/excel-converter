<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { onFileSelect, accept = '.xlsx', dragText = '파일을 드래그하거나 클릭하여 업로드' } = $props();

	let dropZone;
	let fileInput;

	function handleDragOver(e) {
		e.preventDefault();
		if (dropZone) dropZone.classList.add('dragover');
	}

	function handleDragLeave() {
		if (dropZone) dropZone.classList.remove('dragover');
	}

	function handleDrop(e) {
		e.preventDefault();
		if (dropZone) dropZone.classList.remove('dragover');
		const files = e.dataTransfer.files;
		if (files.length > 0 && onFileSelect) {
			onFileSelect(files[0]);
		}
	}

	function handleFileChange(e) {
		if (e.target.files.length > 0 && onFileSelect) {
			onFileSelect(e.target.files[0]);
		}
	}

	onMount(() => {
		if (browser && dropZone) {
			dropZone.addEventListener('dragover', handleDragOver);
			dropZone.addEventListener('dragleave', handleDragLeave);
			dropZone.addEventListener('drop', handleDrop);
		}
	});
</script>

<div
	class="drop-zone"
	bind:this={dropZone}
	role="button"
	tabindex="0"
	onclick={() => fileInput?.click()}
	onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
>
	<div class="drop-zone-icon">⬇</div>
	<div class="drop-zone-text">
		{dragText}
		<br />
		<small style="color: #999; font-size: 12px;">({accept} 파일만 지원)</small>
	</div>
</div>

<input type="file" bind:this={fileInput} class="file-input" {accept} onchange={handleFileChange} />
