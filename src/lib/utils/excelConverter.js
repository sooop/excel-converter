/**
 * Excel 열 문자를 숫자 인덱스로 변환 (A=0, B=1, ..., AA=26, AB=27, ...)
 * @param {string} col - Excel 열 문자 (예: 'A', 'AB', 'AD')
 * @returns {number} 0-based 인덱스
 */
export function excelColumnToIndex(col) {
	col = col.toUpperCase();
	let index = 0;
	for (let i = 0; i < col.length; i++) {
		index = index * 26 + (col.charCodeAt(i) - 64);
	}
	return index - 1;
}

/**
 * 엑셀 데이터를 맵핑 정보에 따라 변환
 * @param {Array<Array>} sourceData - 원본 데이터 (2차원 배열)
 * @param {Array<Array>} mappingData - 맵핑 정보 (2차원 배열)
 * @returns {Array<Array>} 변환된 데이터
 */
export function convertData(sourceData, mappingData) {
	if (sourceData.length === 0 || mappingData.length === 0) {
		throw new Error('데이터가 비어있습니다.');
	}

	const sourceHeaders = sourceData[0];
	const mappings = parseMappings(mappingData);
	const result = [];

	// 헤더 생성
	const resultHeaders = mappings.map((m) => m.targetColumn).filter((h) => h);
	result.push(resultHeaders);

	// 데이터 행 변환
	for (let i = 1; i < sourceData.length; i++) {
		const sourceRow = sourceData[i];
		const resultRow = processRow(sourceRow, mappings, sourceHeaders);
		result.push(resultRow);
	}

	return result;
}

/**
 * 맵핑 데이터를 파싱하여 맵핑 객체 배열로 변환
 * @param {Array<Array>} mappingData - 맵핑 정보 (2차원 배열)
 * @returns {Array<Object>} 맵핑 객체 배열
 */
function parseMappings(mappingData) {
	const mappings = [];

	for (let i = 1; i < mappingData.length; i++) {
		const row = mappingData[i];
		if (row.length < 6) continue;

		const mapping = {
			targetColumn: row[2] || '', // 스마트십 업로드 칼럼
			sourceColumn: row[3] || '', // 원본칼럼2
			sourceColumnIndex: row[4] || '', // 원본열번호
			fixedValue: row[5] || '' // 고정값
		};

		mappings.push(mapping);
	}

	return mappings;
}

/**
 * 단일 행을 처리하여 변환된 행 반환
 * @param {Array} sourceRow - 원본 데이터 행
 * @param {Array<Object>} mappings - 맵핑 객체 배열
 * @param {Array} sourceHeaders - 원본 데이터 헤더
 * @returns {Array} 변환된 행
 */
function processRow(sourceRow, mappings, sourceHeaders) {
	const resultRow = [];

	// 전화번호 값 미리 가져오기 (통관정보에 사용)
	const phoneNumber = getPhoneNumber(sourceRow);

	for (const mapping of mappings) {
		let value = getValue(sourceRow, mapping, sourceHeaders);
		value = applySpecialRules(value, mapping, phoneNumber);
		resultRow.push(value);
	}

	return resultRow;
}

/**
 * 전화번호 값 추출 (AD열)
 * @param {Array} sourceRow - 원본 데이터 행
 * @returns {string} 전화번호
 */
function getPhoneNumber(sourceRow) {
	const phoneColIndex = excelColumnToIndex('AD');
	if (phoneColIndex < sourceRow.length) {
		const phoneNumber = sourceRow[phoneColIndex];
		return phoneNumber !== null && phoneNumber !== undefined ? String(phoneNumber) : '';
	}
	return '';
}

/**
 * 맵핑 정보에 따라 값 추출
 * @param {Array} sourceRow - 원본 데이터 행
 * @param {Object} mapping - 맵핑 객체
 * @param {Array} sourceHeaders - 원본 데이터 헤더
 * @returns {string} 추출된 값
 */
function getValue(sourceRow, mapping, sourceHeaders) {
	// 1. 고정값이 있으면 고정값 사용
	if (mapping.fixedValue) {
		return mapping.fixedValue;
	}

	// 2. 원본열번호가 있으면 해당 열 사용
	if (mapping.sourceColumnIndex) {
		const colIndex = excelColumnToIndex(mapping.sourceColumnIndex);
		const cellValue = sourceRow[colIndex];
		return cellValue !== null && cellValue !== undefined ? cellValue : '';
	}

	// 3. 원본칼럼명으로 찾기
	if (mapping.sourceColumn) {
		const colIndex = sourceHeaders.indexOf(mapping.sourceColumn);
		if (colIndex >= 0) {
			const cellValue = sourceRow[colIndex];
			return cellValue !== null && cellValue !== undefined ? cellValue : '';
		}
	}

	return '';
}

/**
 * 특별 규칙 적용
 * @param {string} value - 원본 값
 * @param {Object} mapping - 맵핑 객체
 * @param {string} phoneNumber - 전화번호
 * @returns {string} 규칙이 적용된 값
 */
function applySpecialRules(value, mapping, phoneNumber) {
	// 규칙 1: 구매 고객 통관 정보는 전화번호와 동일하게
	if (mapping.targetColumn === '구매 고객 통관 정보(O22)') {
		return phoneNumber;
	}

	// 규칙 2: 상품 가격(총액)이 0이면 1로 변경
	if (mapping.targetColumn === '상품 가격(총액)(O07)') {
		const numValue = parseFloat(value);
		if (numValue === 0 || value === '0' || value === 0) {
			return '1';
		}
	}

	return value;
}

/**
 * 변환된 데이터를 Excel 파일로 다운로드
 * @param {Object} XLSX - XLSX 라이브러리 객체
 * @param {Array<Array>} data - 변환된 데이터
 * @param {string} originalFileName - 원본 파일명
 */
export function downloadExcelFile(XLSX, data, originalFileName) {
	const wb = XLSX.utils.book_new();
	const ws = XLSX.utils.aoa_to_sheet(data);

	XLSX.utils.book_append_sheet(wb, ws, 'Converted');

	const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
	const baseName = originalFileName.replace('.xlsx', '');
	const newFileName = `SmartshipExcel_${baseName}_${timestamp}.xlsx`;

	XLSX.writeFile(wb, newFileName);
}
