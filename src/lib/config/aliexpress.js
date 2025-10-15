export const aliexpressMapping = [
	{
		targetColumn: '출발 국가(O02)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: 'KR'
	},
	{
		targetColumn: '도착 국가(O03)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: 'KR'
	},
	{
		targetColumn: '참조 번호(O04)',
		sourceColumn: '주문 ID',
		sourceColumnIndex: 'A',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			ctx.order_id = value
			return value;
		}
	},
	{
		targetColumn: '상품명(O05)',
		sourceColumn: '제품 정보',
		sourceColumnIndex: 'R',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			const lines = value.trim().split('\n');
			const products = [];

			for (let i = 0; i < lines.length; i += 3) {
				const nameLine = lines[i];
				const attrLine = lines[i + 1];
				const qtyLine = lines[i + 2];

				if (!nameLine || !attrLine || !qtyLine) continue;

				const item = nameLine.replace(/^【\d+】\s*/, '').trim();
				const attrMatch = attrLine.match(/\(속성:(.+)\)/);
				const option = attrMatch ? attrMatch[1].trim() : '';
				const qtyMatch = qtyLine.match(/\(수량:(\d+)/);
				const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;

				if (qty > 0) {
					products.push({
						item,
						option,
						qty,
					});
				}
			}

			ctx.parsedItems = products;
			return products.map(e => e.item);
		}
	},
	{
		targetColumn: '상품 수(O06)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			return ctx.parsedItems.map(e => e.qty)
		}
	},
	{
		targetColumn: '고객이름(O08)',
		sourceColumn: '구매자 이름',
		sourceColumnIndex: 'D',
		fixedValue: ''
	},
	{
		targetColumn: '우편 번호(O09)',
		sourceColumn: '우편번호',
		sourceColumnIndex: 'AB',
		fixedValue: ''
	},
	{
		targetColumn: '수취인 주소 1(O10)',
		sourceColumn: '시/도',
		sourceColumnIndex: 'Y',
		fixedValue: ''
	},
	{
		targetColumn: '수취인 주소 2(O11)',
		sourceColumn: '주소',
		sourceColumnIndex: 'AA',
		fixedValue: ''
	},
	{
		targetColumn: '연락처(HP)(O12)',
		sourceColumn: '모바일',
		sourceColumnIndex: 'AE',
		fixedValue: ''
	},
	{
		targetColumn: '배송 등급(O18)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: 'RM'
	},
	{
		targetColumn: '구매 고객 통관 정보(O22)',
		sourceColumn: '세금 번호',
		sourceColumnIndex: 'AF',
		fixedValue: ''
	},
	{
		targetColumn: 'SKU No.(O30)',
		sourceColumn: '제품 코드',
		sourceColumnIndex: 'T',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			const ps = value.trim().split(';');
			const codes = ps.map(info => {
				return info.replace(/\s?\*\s?\d+.*/, '');
			})
			ctx.item_codes = codes;
			return codes;
		}
	},
	{
		targetColumn: '사이트 주문 번호(O34)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			if (!ctx.parsedItems) return ctx.order_id;
			return ctx.parsedItems.map(() => ctx.order_id);
		}
	},
	{
		targetColumn: '사이트 상품 번호(O35)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			return ctx.item_codes || [];
		}
	},
	{
		targetColumn: '상품 옵션(O39)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: '',
		transform: (value, row, headers, ctx) => {
			return ctx.parsedItems.map(item => item.option)
		}
	}
];
