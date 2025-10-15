<script>
	import DropZone from '$lib/components/DropZone.svelte';
	import StatusMessage from '$lib/components/StatusMessage.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { convertData, downloadExcelFile } from '$lib/utils/excelConverter.js';

	const STORAGE_PREFIX = 'excel-mapping-';

	let status = $state({ message: '', type: '' });
	let progress = $state(0);
	let showProgress = $state(false);
	let savedMappings = $state([]);
	let selectedMappingKey = $state('');

	// 저장된 매핑 목록 불러오기
	function loadSavedMappings() {
		if (typeof localStorage === 'undefined') return;
		const saved = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(STORAGE_PREFIX)) {
				try {
					const data = JSON.parse(localStorage.getItem(key) || '');
					saved.push({ ...data, storageKey: key });
				} catch (e) {
					console.error('Failed to load mapping:', key, e);
				}
			}
		}
		savedMappings = saved.sort((a, b) => b.createdAt - a.createdAt);
	}

	// 초기 로드
	$effect(() => {
		if (typeof window !== 'undefined') {
			loadSavedMappings();
		}
	});

	async function handleFile(file) {
		if (!file) return;

		const fileName = file.name.toLowerCase();
		if (!fileName.endsWith('.xlsx')) {
			setStatus('error', '올바른 엑셀 파일(.xlsx)을 업로드해주세요.');
			return;
		}

		if (!selectedMappingKey) {
			setStatus('error', '매핑을 선택해주세요.');
			return;
		}

		// 선택된 매핑 불러오기
		const selectedMapping = savedMappings.find((m) => m.storageKey === selectedMappingKey);
		if (!selectedMapping) {
			setStatus('error', '선택한 매핑을 찾을 수 없습니다.');
			return;
		}

		setStatus('processing', '파일을 처리 중입니다...');
		updateProgress(30);

		const reader = new FileReader();

		reader.onload = async (e) => {
			try {
				updateProgress(50);
				const XLSX = await import('xlsx');
				const data = new Uint8Array(e.target.result);
				const workbook = XLSX.read(data, { type: 'array' });

				updateProgress(70);

				// 첫 번째 시트만 읽기
				const dataSheet = workbook.Sheets[workbook.SheetNames[0]];

				const sourceData = XLSX.utils.sheet_to_json(dataSheet, {
					header: 1,
					defval: '',
					raw: false
				});

				updateProgress(80);

				// 선택된 매핑 사용
				const convertedData = convertData(sourceData, selectedMapping.mappings);

				updateProgress(90);

				downloadExcelFile(XLSX, convertedData, file.name);

				updateProgress(100);
				setStatus('success', '변환 완료! 파일이 자동으로 다운로드됩니다.');

				setTimeout(() => {
					hideProgress();
					setStatus('', '');
				}, 2000);
			} catch (error) {
				console.error(error);
				setStatus('error', '파일 처리 중 오류가 발생했습니다: ' + error.message);
				hideProgress();
			}
		};

		reader.onerror = () => {
			setStatus('error', '파일을 읽을 수 없습니다.');
			hideProgress();
		};

		reader.readAsArrayBuffer(file);
	}

	function setStatus(type, message) {
		status = { type, message };
	}

	function updateProgress(percent) {
		showProgress = true;
		progress = percent;
	}

	function hideProgress() {
		setTimeout(() => {
			showProgress = false;
			progress = 0;
		}, 500);
	}
</script>

<svelte:head>
	<title>Excel Converter - Custom</title>
</svelte:head>

<div class="converter-container">
	<h1>사용자 정의 변환기</h1>

	{#if savedMappings.length === 0}
		<div class="empty-state">
			<p>저장된 매핑이 없습니다.</p>
			<p class="help-text">
				<a href="/builder">Mapping Builder</a>에서 매핑을 생성하고 저장하세요.
			</p>
		</div>
	{:else}
		<!-- Mapping Selection -->
		<div class="mapping-selector">
			<label for="mapping-select" class="selector-label">변환 매핑 선택</label>
			<select
				id="mapping-select"
				class="mapping-select"
				bind:value={selectedMappingKey}
			>
				<option value="">매핑을 선택하세요</option>
				{#each savedMappings as mapping}
					<option value={mapping.storageKey}>
						{mapping.name} ({mapping.columnCount}개 컬럼)
					</option>
				{/each}
			</select>
		</div>

		<DropZone onFileSelect={handleFile} accept=".xlsx" dragText="엑셀 파일을 드래그하거나 클릭하여 업로드" />

		<ProgressBar {progress} visible={showProgress} />

		<StatusMessage type={status.type} message={status.message} />
	{/if}

	<div class="footer">LESS BUT BETTER</div>
</div>

<style>
	.mapping-selector {
		margin-bottom: 32px;
	}

	.selector-label {
		display: block;
		font-size: 12px;
		color: #666;
		letter-spacing: 0.5px;
		margin-bottom: 12px;
		text-transform: uppercase;
	}

	.mapping-select {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		font-size: 14px;
		color: #333;
		background: white;
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.mapping-select:focus {
		outline: none;
		border-color: #999;
	}

	.mapping-select option {
		padding: 8px;
	}

	.empty-state {
		text-align: center;
		padding: 60px 20px;
		color: #999;
	}

	.empty-state p {
		margin: 0 0 12px;
		font-size: 14px;
	}

	.empty-state .help-text {
		font-size: 13px;
	}

	.empty-state a {
		color: #666;
		text-decoration: underline;
		transition: color 0.2s ease;
	}

	.empty-state a:hover {
		color: #222;
	}
</style>
