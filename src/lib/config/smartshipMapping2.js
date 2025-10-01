/**
 * Smartship 업로드 형식 맵핑 설정
 * 각 맵핑 객체는 다음 속성을 가집니다:
 * - targetColumn: 스마트십 업로드 칼럼명 (빈 값이면 해당 컬럼은 결과에서 제외)
 * - sourceColumn: 원본 칼럼명 (헤더 이름으로 매칭)
 * - sourceColumnIndex: 원본 열 번호 (Excel 형식: 'A', 'B', 'AD' 등)
 * - fixedValue: 고정값 (항상 이 값을 사용)
 * - transform: 값 변환 함수 (value, row, headers, context) => 변환된값 | [값1, 값2, ...]
 *   - value: 원본 값
 *   - row: 전체 원본 행 배열
 *   - headers: 원본 헤더 배열
 *   - context: transform 함수들 간 데이터 공유용 객체
 *   - 배열 반환 시: 해당 열을 기준으로 행 분리
 *
 * 우선순위: fixedValue > sourceColumnIndex > sourceColumn
 * transform 함수는 위 우선순위로 얻은 값에 적용됩니다.
 *
 * 예제:
 * 1. 값 변환:
 *    { targetColumn: '가격', sourceColumnIndex: 'A', transform: (v) => v * 1000 }
 *
 * 2. 조건부 변환:
 *    { targetColumn: '상태', sourceColumnIndex: 'B', transform: (v) => v > 10 ? '대량' : '소량' }
 *
 * 3. 행 분리 (쉼표로 구분된 값):
 *    { targetColumn: '상품명', sourceColumnIndex: 'C', transform: (v) => v.split(',').map(s => s.trim()) }
 *    원본 행: ['A', 'B', 'item1,item2,item3']
 *    결과: 3개 행으로 분리됨
 *    - ['A', 'B', 'item1']
 *    - ['A', 'B', 'item2']
 *    - ['A', 'B', 'item3']
 *
 * 4. Context를 이용한 복잡한 행 분리:
 *    원본: 상품정보="A1000 x 1, B1010 x 2", 세트수량=3
 *    목표: A1000 3개, B1010 6개로 2행 분리
 *
 *    {
 *      targetColumn: '상품명',
 *      sourceColumnIndex: 'A',
 *      transform: (v, row, headers, ctx) => {
 *        // "A1000 x 1, B1010 x 2" 파싱
 *        const items = v.split(',').map(item => {
 *          const match = item.trim().match(/(\S+)\s*x\s*(\d+)/);
 *          if (match) return { name: match[1], qty: parseInt(match[2]) };
 *          return null;
 *        }).filter(Boolean);
 *        ctx.parsedItems = items; // context에 저장하여 다른 컬럼과 공유
 *        return items.map(i => i.name);
 *      }
 *    },
 *    {
 *      targetColumn: '수량',
 *      sourceColumnIndex: 'B', // 세트수량
 *      transform: (setQty, row, headers, ctx) => {
 *        if (!ctx.parsedItems) return [setQty];
 *        const qty = parseInt(setQty) || 1;
 *        return ctx.parsedItems.map(i => i.qty * qty); // 개별 수량 * 세트수량
 *      }
 *    }
 */
export const smartshipMapping = [
	{ targetColumn: '판매자 ID(O00)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '발송자 이름(O01)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '출발 국가(O02)', sourceColumn: '', sourceColumnIndex: '', fixedValue: 'KR' },
	{ targetColumn: '도착 국가(O03)', sourceColumn: '배송국가', sourceColumnIndex: 'AC', fixedValue: '' },
	{ targetColumn: '참조 번호(O04)', sourceColumn: '접수번호', sourceColumnIndex: 'C', fixedValue: '' },
	{
		targetColumn: '상품명(O05)',
		sourceColumn: '상품명 (한글)',
		sourceColumnIndex: 'AS',
		fixedValue: ''
	},
	{ targetColumn: '상품 수(O06)', sourceColumn: '수량', sourceColumnIndex: 'V', fixedValue: '' , transform: (set_qty, row, header, ctx) => {
		// parsedItems가 없으면 원본 값 그대로 반환
		if (!ctx.parsedItems || !Array.isArray(ctx.parsedItems)) {
			return set_qty;
		}
		const qty = parseInt(set_qty) || 1;
		return ctx.parsedItems.map(i => i.qty * qty);
	}},
	{ targetColumn: '상품 가격(총액)(O07)', sourceColumn: '합계', sourceColumnIndex: 'AZ', fixedValue: '' },
	{ targetColumn: '고객이름(O08)', sourceColumn: '수취인명', sourceColumnIndex: 'Z', fixedValue: '' },
	{ targetColumn: '우편 번호(O09)', sourceColumn: '우편번호', sourceColumnIndex: 'AB', fixedValue: '' },
	{ targetColumn: '수취인 주소 1(O10)', sourceColumn: '주소', sourceColumnIndex: 'AA', fixedValue: '' },
	{ targetColumn: '수취인 주소 2(O11)', sourceColumn: '주소', sourceColumnIndex: 'AA', fixedValue: '' },
	{ targetColumn: '연락처(HP)(O12)', sourceColumn: '전화번호', sourceColumnIndex: 'AD', fixedValue: '' },
	{ targetColumn: '연락처(O13)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '이메일(O14)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: '통화(O15)',
		sourceColumn: '상품금액통화단위',
		sourceColumnIndex: 'X',
		fixedValue: ''
	},
	{ targetColumn: '비고(O16)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '후쿠오카 노선 이용(O17)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '배송 등급(O18)', sourceColumn: '', sourceColumnIndex: '', fixedValue: 'RM' },
	{ targetColumn: '이름 후리가나(O19)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '프리미엄 서비스(O20)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '생년월일(O21)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: '구매 고객 통관 정보(O22)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: ''
	},
	{ targetColumn: '상품 URL 정보(O23)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '세부 분류(O24)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: '사용자 정의 상품 코드(O25)',
		sourceColumn: 'SKU',
		sourceColumnIndex: 'U',
		fixedValue: '',
		transform: (info, row, header, ctx) => {
			// 빈 값 처리
			if (!info || info.trim() === '') {
				ctx.parsedItems = null;
				return info;
			}

			// 구분자 확인 및 파싱
			const items = info.split(',').map(item => {
				const match = item.trim().match(/(\S+)\s*x\s*(\d+)/);
				if (match) return { seller_sku_code: match[1], qty: parseInt(match[2])};
				return null;
			}).filter(Boolean); // null 제거

			// 파싱된 항목이 없으면 원본 값 그대로 사용
			if (items.length === 0) {
				ctx.parsedItems = null;
				return info;
			}

			ctx.parsedItems = items;
			return items.map(i => i.seller_sku_code);
		}
	},
	{ targetColumn: 'COD 서비스 사용(O26)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'COD 금액(O27)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'COD 금액 통화(O28)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '창고 코드(O29)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'SKU No.(O30)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '사이트 번호(O31)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '사이트 로그인 ID(O32)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: '사이트 장바구니 번호(O33)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: ''
	},
	{ targetColumn: '사이트 주문 번호(O34)', sourceColumn: '주문번호', sourceColumnIndex: 'R', fixedValue: '' },
	{ targetColumn: '사이트 상품 번호(O35)', sourceColumn: 'SKU', sourceColumnIndex: 'AQ', fixedValue: '' },
	{ targetColumn: '퀵 배송 날짜(O36)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'Quick 배송 시간대(O37)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'Delivery City(O38)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '상품 옵션(O39)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'IOSS CODE(O40)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '주문일(O41)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '판매자 지정 배송사(O42)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: '판매자 지정 송장번호(O43)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: ''
	},
	{ targetColumn: '화물 운송장 URL(O44)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '운송 수단(O45)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'B2B Order YN(O46)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: '생산/제조 단위 번호 (Lot No.)(O47)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: ''
	},
	{ targetColumn: '유효기간(O48)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: 'Damage Insurance(O49)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{
		targetColumn: 'Drop off 스테이션 코드(O50)',
		sourceColumn: '',
		sourceColumnIndex: '',
		fixedValue: ''
	},
	{ targetColumn: 'PUDO 업체 타입 (O51)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '통관 타입(O52)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '사업자명/대표자명(O53)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '박스 총 무게(O54)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '박스 부피(O55)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '상품 유형(O56)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' },
	{ targetColumn: '픽업 스테이션 코드(O57)', sourceColumn: '', sourceColumnIndex: '', fixedValue: '' }
];
