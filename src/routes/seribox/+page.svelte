<script>
	import DropZone from '$lib/components/DropZone.svelte';
	import StatusMessage from '$lib/components/StatusMessage.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { convertData, downloadExcelFile } from '$lib/utils/excelConverter.js';
	import { smartshipMapping } from '$lib/config/smartshipMapping.js';

	let status = $state({ message: '', type: '' });
	let progress = $state(0);
	let showProgress = $state(false);

	async function handleFile(file) {
		if (!file) return;

		const fileName = file.name.toLowerCase();
		if (!fileName.endsWith('.xlsx')) {
			setStatus('error', '올바른 엑셀 파일(.xlsx)을 업로드해주세요.');
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

				// 내부 맵핑 설정 사용
				const convertedData = convertData(sourceData, smartshipMapping);

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
	<title>Excel Converter - Seribox</title>
</svelte:head>

<div class="converter-container">
	<h1>SeriBox (TW) - EXCEL CONVERTER</h1>

	<DropZone onFileSelect={handleFile} accept=".xlsx" dragText="엑셀 파일을 드래그하거나 클릭하여 업로드" />

	<ProgressBar {progress} visible={showProgress} />

	<StatusMessage type={status.type} message={status.message} />

	<div class="footer">LESS BUT BETTER</div>
</div>
