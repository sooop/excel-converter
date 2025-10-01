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
 * @param {Array<Object>} mappingConfig - 맵핑 설정 객체 배열
 * @returns {Array<Array>} 변환된 데이터
 */
export function convertData(sourceData, mappingConfig) {
	if (sourceData.length === 0) {
		throw new Error('데이터가 비어있습니다.');
	}

	if (!mappingConfig || mappingConfig.length === 0) {
		throw new Error('맵핑 설정이 없습니다.');
	}

	// targetColumn이 있는 항목만 필터링
	const validMappings = mappingConfig.filter((m) => m.targetColumn);

	const sourceHeaders = sourceData[0];
	const result = [];

	// 헤더 생성
	const resultHeaders = validMappings.map((m) => m.targetColumn);
	result.push(resultHeaders);

	// 데이터 행 변환
	for (let i = 1; i < sourceData.length; i++) {
		const sourceRow = sourceData[i];
		const resultRows = processRow(sourceRow, validMappings, sourceHeaders);
		// 행 분리 지원: processRow가 여러 행을 반환할 수 있음
		result.push(...resultRows);
	}

	return result;
}


/**
 * 단일 행을 처리하여 변환된 행 반환 (행 분리 시 여러 행 반환 가능)
 * @param {Array} sourceRow - 원본 데이터 행
 * @param {Array<Object>} mappings - 맵핑 객체 배열
 * @param {Array} sourceHeaders - 원본 데이터 헤더
 * @returns {Array<Array>} 변환된 행들 (보통 1개, 행 분리 시 여러 개)
 */
function processRow(sourceRow, mappings, sourceHeaders) {
	const phoneNumber = getPhoneNumber(sourceRow);
	const context = {}; // transform 함수 간 데이터 공유를 위한 context 객체

	// 1단계: 각 컬럼의 값 계산 (transform 적용)
	const columnValues = [];
	let maxSplitCount = 1; // 최대 분리 행 수
	let splitColumnIndex = -1; // 분리가 발생한 컬럼 인덱스

	for (let i = 0; i < mappings.length; i++) {
		const mapping = mappings[i];
		let value = getValue(sourceRow, mapping, sourceHeaders);

		// transform 함수 적용 (context 전달)
		if (mapping.transform && typeof mapping.transform === 'function') {
			value = mapping.transform(value, sourceRow, sourceHeaders, context);
		}

		// 특수 규칙 적용
		value = applySpecialRules(value, mapping, phoneNumber);

		// 배열인 경우 행 분리 처리
		if (Array.isArray(value)) {
			if (value.length > maxSplitCount) {
				maxSplitCount = value.length;
				splitColumnIndex = i;
			}
		}

		columnValues.push(value);
	}

	// 2단계: 행 분리가 필요한 경우 여러 행 생성
	const resultRows = [];
	for (let rowIndex = 0; rowIndex < maxSplitCount; rowIndex++) {
		const resultRow = [];
		for (let colIndex = 0; colIndex < columnValues.length; colIndex++) {
			const value = columnValues[colIndex];
			if (Array.isArray(value)) {
				// 배열인 경우: 해당 인덱스 값 사용, 없으면 빈 문자열
				resultRow.push(value[rowIndex] !== undefined ? value[rowIndex] : '');
			} else {
				// 일반 값인 경우: 모든 행에 동일하게 사용
				resultRow.push(value);
			}
		}
		resultRows.push(resultRow);
	}

	return resultRows;
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
