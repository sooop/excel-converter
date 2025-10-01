<script>
	import * as XLSX from 'xlsx';
	import { smartshipMapping } from '$lib/config/smartshipMapping.js';

	let sampleFile = null;
	let sampleHeaders = [];
	let mappings = [];
	let availableMappings = [];
	let usedSourceColumns = new Set();
	let draggedIndex = null;

	// Active target columns by default
	const activeColumns = new Set([
		'O02', 'O03', 'O04', 'O05', 'O06', 'O07', 'O08', 'O09', 'O10', 'O11',
		'O12', 'O18', 'O22', 'O25', 'O30', 'O34', 'O35', 'O39'
	]);

	// Initialize mappings from smartshipMapping
	$: if (mappings.length === 0 && availableMappings.length === 0) {
		const all = smartshipMapping.map((m, idx) => {
			// Extract column code (e.g., "O02" from "출발 국가(O02)")
			const match = m.targetColumn.match(/\(([^)]+)\)/);
			const columnCode = match ? match[1] : '';

			return {
				id: idx,
				enabled: activeColumns.has(columnCode),
				targetColumn: m.targetColumn,
				sourceColumn: '',
				sourceColumnIndex: '',
				fixedValue: '',
				transform: ''
			};
		});

		mappings = all.filter((m) => m.enabled);
		availableMappings = all.filter((m) => !m.enabled);
	}

	// Handle sample file upload
	async function handleFileUpload(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		sampleFile = file;
		const arrayBuffer = await file.arrayBuffer();
		const workbook = XLSX.read(arrayBuffer);
		const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
		const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

		if (data.length > 0) {
			sampleHeaders = data[0].map((h, idx) => ({
				name: h || `Column ${idx + 1}`,
				index: XLSX.utils.encode_col(idx)
			}));
		}
	}

	// Add mapping from available list
	function addMappingFromAvailable(mapping) {
		mapping.enabled = true;
		mappings = [...mappings, mapping];
		availableMappings = availableMappings.filter((m) => m.id !== mapping.id);
	}

	// Add new custom mapping row
	function addCustomMapping() {
		const newId = Math.max(...mappings.map((m) => m.id), ...availableMappings.map((m) => m.id)) + 1;
		mappings = [
			...mappings,
			{
				id: newId,
				enabled: true,
				targetColumn: '',
				sourceColumn: '',
				sourceColumnIndex: '',
				fixedValue: '',
				transform: ''
			}
		];
	}

	// Remove mapping row
	function removeMapping(mapping) {
		mappings = mappings.filter((m) => m.id !== mapping.id);
		// If it was from smartshipMapping, add back to available
		if (smartshipMapping.some((sm) => sm.targetColumn === mapping.targetColumn)) {
			mapping.enabled = false;
			mapping.sourceColumn = '';
			mapping.sourceColumnIndex = '';
			mapping.fixedValue = '';
			mapping.transform = '';
			availableMappings = [...availableMappings, mapping];
		}
	}

	// Drag and drop handlers
	function handleDragStart(index) {
		draggedIndex = index;
	}

	function handleDragOver(e, index) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		const newMappings = [...mappings];
		const draggedItem = newMappings[draggedIndex];
		newMappings.splice(draggedIndex, 1);
		newMappings.splice(index, 0, draggedItem);
		mappings = newMappings;
		draggedIndex = index;
	}

	function handleDragEnd() {
		draggedIndex = null;
	}

	// Update used source columns
	$: {
		usedSourceColumns = new Set(
			mappings.filter((m) => m.enabled && m.sourceColumn).map((m) => m.sourceColumn)
		);
	}

	// Handle source column selection
	function handleSourceColumnChange(mapping, value) {
		mapping.sourceColumn = value;
		if (value) {
			// Find the column index from sampleHeaders
			const header = sampleHeaders.find((h) => h.name === value);
			if (header) {
				mapping.sourceColumnIndex = header.index;
			}
		} else {
			mapping.sourceColumnIndex = '';
		}
		mappings = mappings; // Trigger reactivity
	}

	// Generate module code
	$: generatedCode = (() => {
		const mappingCode = mappings
			.map((m) => {
				let obj = `\t{\n\t\ttargetColumn: '${m.targetColumn}'`;
				obj += `,\n\t\tsourceColumn: '${m.sourceColumn}'`;
				obj += `,\n\t\tsourceColumnIndex: '${m.sourceColumnIndex}'`;
				obj += `,\n\t\tfixedValue: '${m.fixedValue}'`;
				if (m.transform && m.transform.trim()) {
					obj += `,\n\t\ttransform: ${m.transform}`;
				}
				obj += '\n\t}';
				return obj;
			})
			.join(',\n');

		return `export const customMapping = [\n${mappingCode}\n];\n`;
	})();

	// Download generated code
	function downloadCode() {
		const blob = new Blob([generatedCode], { type: 'text/javascript' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'customMapping.js';
		a.click();
		URL.revokeObjectURL(url);
	}

	// Copy code to clipboard
	async function copyCode() {
		await navigator.clipboard.writeText(generatedCode);
		alert('코드가 클립보드에 복사되었습니다!');
	}

	// Transform editor state
	let editingTransform = null;
	let transformCode = '';
	let transformError = '';

	function openTransformEditor(mapping) {
		editingTransform = mapping;
		transformCode = mapping.transform || '';
		transformError = '';
	}

	function closeTransformEditor() {
		editingTransform = null;
		transformCode = '';
		transformError = '';
	}

	function validateTransform() {
		try {
			// Basic syntax validation
			new Function('value', 'row', 'headers', 'context', `return (${transformCode})`);
			transformError = '';
			return true;
		} catch (e) {
			transformError = e.message;
			return false;
		}
	}

	function saveTransform() {
		if (validateTransform()) {
			if (editingTransform) {
				editingTransform.transform = transformCode;
				mappings = mappings; // Trigger reactivity
			}
			closeTransformEditor();
		}
	}

	// Handle tab key in transform editor
	function handleTransformKeydown(e) {
		if (e.key === 'Tab') {
			e.preventDefault();
			const start = e.target.selectionStart;
			const end = e.target.selectionEnd;
			transformCode = transformCode.substring(0, start) + '\t' + transformCode.substring(end);
			// Set cursor position after tab
			requestAnimationFrame(() => {
				e.target.selectionStart = e.target.selectionEnd = start + 1;
			});
		}
	}
</script>

<svelte:head>
	<title>Mapping Builder - Excel Converter</title>
</svelte:head>

<div class="home-container">
	<div class="home-header">
		<h1>MAPPING BUILDER</h1>
		<p>엑셀 변환 매핑 설정을 쉽게 생성하세요</p>
	</div>

	<!-- Sample File Upload -->
	<div class="builder-section">
		<h2 class="section-title">1. 샘플 파일 업로드</h2>
		<div class="drop-zone" on:click={() => document.getElementById('file-input')?.click()}>
			<div class="drop-zone-icon">📄</div>
			<div class="drop-zone-text">
				{#if sampleFile}
					{sampleFile.name}
				{:else}
					클릭하여 샘플 파일을 선택하세요
				{/if}
			</div>
		</div>
		<input
			id="file-input"
			class="file-input"
			type="file"
			accept=".xlsx,.xls"
			on:change={handleFileUpload}
		/>
		{#if sampleHeaders.length > 0}
			<div class="status success">✓ {sampleHeaders.length}개의 컬럼이 감지되었습니다</div>
		{/if}
	</div>

	<!-- Mapping Table with Side Panel -->
	<div class="builder-section">
		<div class="section-header">
			<h2 class="section-title">2. 매핑 설정</h2>
			<button class="btn-minimal" on:click={addCustomMapping}>+ 사용자 정의 컬럼</button>
		</div>

		<div class="mapping-workspace">
			<!-- Side Panel -->
			<div class="side-panel">
				<h3 class="side-panel-title">사용 가능한 컬럼</h3>
				<div class="available-list">
					{#each availableMappings as mapping (mapping.id)}
						<button class="available-item" on:click={() => addMappingFromAvailable(mapping)}>
							<span>+</span>
							{mapping.targetColumn}
						</button>
					{/each}
				</div>
			</div>

			<!-- Main Table -->
			<div class="main-table">
				<div class="mapping-table">
					<div class="table-header">
						<div class="col-drag"></div>
						<div class="col-target">대상 컬럼</div>
						<div class="col-source">원본 컬럼</div>
						<div class="col-index">인덱스</div>
						<div class="col-fixed">고정값</div>
						<div class="col-transform">변환</div>
						<div class="col-actions"></div>
					</div>

					{#each mappings as mapping, index (mapping.id)}
						<div
							class="table-row"
							class:dragging={draggedIndex === index}
							draggable="true"
							on:dragstart={() => handleDragStart(index)}
							on:dragover={(e) => handleDragOver(e, index)}
							on:dragend={handleDragEnd}
						>
							<div class="col-drag">
								<span class="drag-handle">⋮⋮</span>
							</div>
							<div class="col-target">
								<input
									type="text"
									class="input-minimal"
									bind:value={mapping.targetColumn}
									placeholder="대상 컬럼명"
								/>
							</div>
							<div class="col-source">
								<select
									class="select-minimal"
									value={mapping.sourceColumn}
									on:change={(e) => handleSourceColumnChange(mapping, e.target.value)}
									disabled={!sampleHeaders.length}
								>
									<option value="">선택 안함</option>
									{#each sampleHeaders as header}
										<option
											value={header.name}
											disabled={usedSourceColumns.has(header.name) &&
												mapping.sourceColumn !== header.name}
										>
											{header.name}
										</option>
									{/each}
								</select>
							</div>
							<div class="col-index">
								<input
									type="text"
									class="input-minimal"
									bind:value={mapping.sourceColumnIndex}
									placeholder="A, B..."
								/>
							</div>
							<div class="col-fixed">
								<input
									type="text"
									class="input-minimal"
									bind:value={mapping.fixedValue}
									placeholder="고정값"
								/>
							</div>
							<div class="col-transform">
								<button
									class="btn-transform"
									class:active={mapping.transform}
									on:click={() => openTransformEditor(mapping)}
								>
									{mapping.transform ? '✓' : '+'}
								</button>
							</div>
							<div class="col-actions">
								<button class="btn-remove" on:click={() => removeMapping(mapping)}>×</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Code Generation -->
	<div class="builder-section">
		<h2 class="section-title">3. 코드 생성</h2>
		<div class="output-actions">
			<button class="btn-minimal" on:click={downloadCode}>다운로드</button>
			<button class="btn-minimal" on:click={copyCode}>복사</button>
		</div>
		<pre class="code-preview">{generatedCode}</pre>
	</div>

	<div class="home-footer">
		<p>LESS BUT BETTER</p>
	</div>
</div>

<!-- Transform Editor Modal -->
{#if editingTransform}
	<div class="modal-overlay" on:click={closeTransformEditor}>
		<div class="modal-content" on:click={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>TRANSFORM 함수 편집</h3>
				<button class="btn-close" on:click={closeTransformEditor}>×</button>
			</div>

			<div class="modal-body">
				<p class="help-text">
					함수 형식: <code>(value, row, headers, context) => 변환된값</code>
				</p>
				<textarea
					class="transform-editor"
					bind:value={transformCode}
					on:keydown={handleTransformKeydown}
					rows="12"
					placeholder="(value) => value * 1000"
				/>
				{#if transformError}
					<div class="status error">{transformError}</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn-minimal" on:click={closeTransformEditor}>취소</button>
				<button class="btn-minimal primary" on:click={saveTransform}>저장</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.builder-section {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 2px;
		padding: 40px 30px;
		margin-bottom: 24px;
	}

	.section-title {
		font-size: 14px;
		font-weight: 400;
		letter-spacing: 0.5px;
		margin-bottom: 24px;
		color: #222;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.section-header .section-title {
		margin-bottom: 0;
	}

	.btn-minimal {
		padding: 8px 20px;
		background: transparent;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		color: #666;
		font-size: 12px;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-minimal:hover {
		border-color: #999;
		color: #222;
	}

	.btn-minimal.primary {
		background: #222;
		border-color: #222;
		color: white;
	}

	.btn-minimal.primary:hover {
		background: #444;
		border-color: #444;
	}

	/* Mapping Workspace */
	.mapping-workspace {
		display: flex;
		gap: 24px;
	}

	/* Side Panel */
	.side-panel {
		flex-shrink: 0;
		width: 220px;
		border: 1px solid #e0e0e0;
		border-radius: 2px;
		padding: 16px;
		background: #fafafa;
		max-height: 600px;
		overflow-y: auto;
	}

	.side-panel-title {
		font-size: 11px;
		color: #999;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		font-weight: 400;
		margin-bottom: 12px;
	}

	.available-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.available-item {
		padding: 8px 10px;
		background: white;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		text-align: left;
		font-size: 12px;
		color: #666;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.available-item span {
		color: #999;
		font-size: 14px;
	}

	.available-item:hover {
		border-color: #999;
		color: #222;
		background: #f5f5f5;
	}

	.available-item:hover span {
		color: #222;
	}

	/* Main Table */
	.main-table {
		flex: 1;
		overflow-x: auto;
	}

	.mapping-table {
		overflow-x: auto;
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 30px 1fr 1fr 80px 120px 50px 40px;
		gap: 12px;
		padding: 12px 0;
		align-items: center;
		border-bottom: 1px solid #e0e0e0;
	}

	.table-header {
		font-size: 11px;
		color: #999;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		font-weight: 400;
	}

	.table-row {
		font-size: 13px;
		transition: all 0.2s ease;
		cursor: move;
	}

	.table-row:hover {
		background: #fafafa;
	}

	.table-row.dragging {
		opacity: 0.5;
	}

	.drag-handle {
		color: #ccc;
		cursor: move;
		font-size: 14px;
		user-select: none;
	}

	.table-row:hover .drag-handle {
		color: #999;
	}

	.input-minimal,
	.select-minimal {
		width: 100%;
		padding: 6px 10px;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		font-size: 13px;
		color: #333;
		background: white;
		transition: border-color 0.2s ease;
	}

	.input-minimal:focus,
	.select-minimal:focus {
		outline: none;
		border-color: #999;
	}

	.select-minimal option:disabled {
		color: #ccc;
	}

	.btn-transform {
		width: 30px;
		height: 30px;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		background: white;
		color: #999;
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-transform:hover {
		border-color: #999;
		color: #222;
	}

	.btn-transform.active {
		background: #222;
		border-color: #222;
		color: white;
	}

	.btn-remove {
		width: 30px;
		height: 30px;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		background: white;
		color: #999;
		font-size: 20px;
		cursor: pointer;
		transition: all 0.2s ease;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-remove:hover {
		border-color: #c62828;
		color: #c62828;
	}

	/* Output Section */
	.output-actions {
		display: flex;
		gap: 12px;
		margin-bottom: 20px;
	}

	.code-preview {
		background: #1e1e1e;
		color: #d4d4d4;
		padding: 24px;
		border-radius: 2px;
		overflow-x: auto;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 12px;
		line-height: 1.6;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: white;
		border-radius: 2px;
		max-width: 700px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30px 30px 20px;
		border-bottom: 1px solid #e0e0e0;
	}

	.modal-header h3 {
		font-size: 14px;
		font-weight: 400;
		letter-spacing: 0.5px;
		color: #222;
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 28px;
		cursor: pointer;
		color: #999;
		line-height: 1;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.btn-close:hover {
		color: #222;
	}

	.modal-body {
		padding: 30px;
	}

	.help-text {
		color: #666;
		margin-bottom: 16px;
		font-size: 12px;
		line-height: 1.6;
	}

	.help-text code {
		background: #f5f5f5;
		padding: 2px 6px;
		border-radius: 2px;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 11px;
	}

	.transform-editor {
		width: 100%;
		padding: 16px;
		border: 1px solid #d0d0d0;
		border-radius: 2px;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 13px;
		line-height: 1.6;
		resize: vertical;
		color: #333;
	}

	.transform-editor:focus {
		outline: none;
		border-color: #999;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px 30px 30px;
		border-top: 1px solid #e0e0e0;
	}
</style>
