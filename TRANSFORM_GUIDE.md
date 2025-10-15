# Transform 함수 작성 가이드

Mapping Builder에서 사용하는 `transform` 함수 작성법과 고급 활용 패턴을 설명합니다.

---

## 기본 구조

```javascript
(value, row, headers, context) => 변환된값
```

### 매개변수

- **`value`**: 현재 컬럼의 원본 값 (우선순위: `fixedValue` > `sourceColumnIndex` > `sourceColumn`)
- **`row`**: 전체 원본 행 배열 (예: `['A', 'B', 'C', ...]`)
- **`headers`**: 원본 헤더 배열 (예: `['상품명', '수량', '가격', ...]`)
- **`context`**: transform 함수들 간 데이터 공유를 위한 객체

### 반환값

- **단일 값**: 그대로 해당 셀에 적용
- **배열**: 행 분해(row explosion) - 배열 각 요소마다 새로운 행 생성

---

## 기본 사용 예제

### 1. 단순 값 변환

```javascript
// 숫자에 1000 곱하기
(value) => value * 1000

// 통화 기호 추가
(value) => `$${value}`

// 문자열 대문자 변환
(value) => value.toUpperCase()
```

### 2. 조건부 변환

```javascript
// 수량에 따른 등급 분류
(value) => {
  const qty = parseInt(value);
  if (qty >= 100) return '대량';
  if (qty >= 10) return '중량';
  return '소량';
}

// null/undefined 처리
(value) => value || '기본값'

// 복잡한 조건
(value) => {
  if (!value) return 'N/A';
  if (value.includes('특급')) return 'EXPRESS';
  if (value.includes('일반')) return 'STANDARD';
  return 'NORMAL';
}
```

### 3. 다른 컬럼 참조

```javascript
// headers와 row를 활용하여 다른 컬럼 값 참조
(value, row, headers) => {
  const priceIndex = headers.indexOf('가격');
  const qtyIndex = headers.indexOf('수량');

  const price = parseFloat(row[priceIndex]) || 0;
  const qty = parseInt(row[qtyIndex]) || 0;

  return price * qty; // 총액 계산
}

// 조건부 다른 컬럼 참조
(value, row, headers) => {
  const countryIndex = headers.indexOf('국가');
  const country = row[countryIndex];

  // 국가별 전화번호 포맷 변경
  if (country === 'KR') {
    return value.replace(/^0/, '+82-');
  } else if (country === 'US') {
    return `+1-${value}`;
  }
  return value;
}
```

### 4. 정규식 활용

```javascript
// 전화번호에서 숫자만 추출
(value) => value.replace(/[^0-9]/g, '')

// 특정 패턴 추출
(value) => {
  const match = value.match(/SKU-(\d+)/);
  return match ? match[1] : '';
}

// 패턴 기반 변환
(value) => {
  // "상품명 (옵션)" 형태에서 괄호 안 내용 추출
  const match = value.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}
```

---

## 고급 사용: 행 분해 (Row Explosion)

배열을 반환하면 해당 배열의 각 요소마다 새로운 행이 생성됩니다.

### 5. 단순 행 분해

```javascript
// 쉼표로 구분된 값을 여러 행으로 분해
(value) => value.split(',').map(s => s.trim())
```

**입력 예시:**
| 상품명 | 수량 |
|--------|------|
| A,B,C  | 10   |

**출력 결과:**
| 상품명 | 수량 |
|--------|------|
| A      | 10   |
| B      | 10   |
| C      | 10   |

### 6. 복잡한 파싱 후 행 분해

```javascript
// "상품명 x 수량" 형태를 파싱하여 상품명만 추출
(value) => {
  // 예: "A1000 x 2, B2000 x 3" → ["A1000", "B2000"]
  const items = value.split(',').map(item => {
    const match = item.trim().match(/(\S+)\s*x\s*(\d+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  return items;
}
```

**입력 예시:**
| 상품정보      |
|---------------|
| A100 x 2, B200 x 3 |

**출력 결과:**
| 상품정보 |
|----------|
| A100     |
| B200     |

---

## 최고급: Context를 이용한 컬럼 간 협력

### 왜 Context가 필요한가?

**문제 상황:**
하나의 원본 셀에 복합 정보가 담겨 있고, 이를 여러 목표 컬럼으로 분해해야 할 때 각 컬럼이 **동일한 기준**으로 행 분해되어야 합니다.

예: `"A1000 x 2, B2000 x 3"` → 상품명과 수량을 각각 다른 컬럼에 넣되, 행 수는 동일하게 2개로 분해

**잘못된 접근 (Context 없이):**

```javascript
// 컬럼 A: 상품명
(value) => value.split(',').map(item => item.trim().match(/(\S+)/)[1])
// → ["A1000 x 2", "B2000 x 3"] (2개)

// 컬럼 B: 수량 (다른 정규식으로 독립 파싱)
(value) => value.split(',').map(item => parseInt(item.match(/x\s*(\d+)/)?.[1] || 0))
// → [2, 3] (2개) - 운이 좋으면 일치, 하지만 파싱 로직이 다르면 불일치 가능
```

**위 방식의 문제점:**
1. 각 컬럼이 **독립적으로** 문자열을 파싱 → 파싱 실패 시 배열 길이 불일치
2. 로직 중복 → 유지보수 시 여러 곳을 수정해야 함
3. "A1000 x 2"에서 상품명과 수량을 **한 번에 추출한 결과를 공유할 수 없음**

**올바른 접근 (Context 활용):**
- **첫 번째 컬럼**이 문자열을 파싱하여 구조화된 데이터(`{ name, unitQty }[]`)를 `context`에 저장
- **나머지 컬럼**은 `context`에서 동일한 데이터를 가져와 필요한 필드만 추출
- **결과**: 모든 컬럼의 배열 길이가 자동으로 일치, 단일 파싱 로직만 유지

---

### 7. Context 기반 행 분해

**시나리오:**
- 원본: `상품정보="A1000 x 2, B2000 x 3"`, `세트수량=5`
- 목표:
  - A1000을 10개 (2 × 5)
  - B2000을 15개 (3 × 5)
  - 총 2개 행으로 분해

```javascript
// 1번 컬럼: 상품명 (파싱 결과를 context에 저장)
{
  targetColumn: '상품명',
  sourceColumnIndex: 'A',
  transform: (value, row, headers, context) => {
    // "A1000 x 2, B2000 x 3" 파싱
    const items = value.split(',').map(item => {
      const match = item.trim().match(/(\S+)\s*x\s*(\d+)/);
      if (match) {
        return {
          name: match[1],      // 상품명
          unitQty: parseInt(match[2])  // 단위 수량
        };
      }
      return null;
    }).filter(Boolean);

    // context에 파싱 결과 저장 (다른 컬럼에서 재사용)
    context.parsedItems = items;

    // 상품명만 배열로 반환 (행 분해)
    return items.map(item => item.name);
  }
}

// 2번 컬럼: 수량 (context의 파싱 결과 활용)
{
  targetColumn: '수량',
  sourceColumnIndex: 'B', // 세트수량
  transform: (setQty, row, headers, context) => {
    // context에서 1번 컬럼이 파싱한 데이터 가져오기
    if (!context.parsedItems) return [setQty];

    const qty = parseInt(setQty) || 1;

    // 각 상품의 단위 수량 × 세트 수량
    return context.parsedItems.map(item => item.unitQty * qty);
  }
}

// 3번 컬럼: 가격 (context의 파싱 결과 활용)
{
  targetColumn: '가격',
  sourceColumnIndex: 'C', // 단가
  transform: (unitPrice, row, headers, context) => {
    if (!context.parsedItems) return [unitPrice];

    const price = parseFloat(unitPrice) || 0;

    // 각 상품마다 동일한 단가 적용
    return context.parsedItems.map(() => price);
  }
}
```

**입력 예시:**
| 상품정보           | 세트수량 | 단가  |
|--------------------|----------|-------|
| A1000 x 2, B2000 x 3 | 5        | 1000  |

**출력 결과:**
| 상품명 | 수량 | 가격 |
|--------|------|------|
| A1000  | 10   | 1000 |
| B2000  | 15   | 1000 |

---

### Context 구현 핵심 원칙

#### 1. 실행 순서 보장
매핑 테이블은 **위에서 아래로 순차 실행**됩니다.
- Context에 데이터를 저장하는 컬럼을 **먼저 배치**
- 해당 데이터를 읽는 컬럼을 **나중에 배치**

```javascript
// ✅ 올바른 순서
[
  { targetColumn: '상품명', transform: (v, r, h, ctx) => { ctx.items = parse(v); return [...]; } },
  { targetColumn: '수량', transform: (v, r, h, ctx) => ctx.items.map(...) },
  { targetColumn: '가격', transform: (v, r, h, ctx) => ctx.items.map(...) }
]

// ❌ 잘못된 순서 (수량 컬럼이 먼저 실행되어 ctx.items가 없음)
[
  { targetColumn: '수량', transform: (v, r, h, ctx) => ctx.items.map(...) },  // undefined 에러
  { targetColumn: '상품명', transform: (v, r, h, ctx) => { ctx.items = parse(v); return [...]; } }
]
```

#### 2. 배열 길이 일치 필수
모든 행 분해 컬럼이 **동일한 길이의 배열**을 반환해야 합니다.

```javascript
// ✅ 올바른 예시 (모두 2개 반환)
상품명: ['A1000', 'B2000']  // 길이 2
수량:   [10, 15]            // 길이 2
가격:   [1000, 1000]        // 길이 2

// ❌ 잘못된 예시 (길이 불일치)
상품명: ['A1000', 'B2000']  // 길이 2
수량:   [10]                // 길이 1 - 에러 발생
```

**해결 방법:**
```javascript
// Context 기반으로 동일한 기준 공유
transform: (value, row, headers, context) => {
  if (!context.parsedItems) return [value];  // fallback
  return context.parsedItems.map(item => /* 변환 로직 */);
}
```

#### 3. Context 명명 규칙
- **명확한 이름** 사용: `ctx.parsedItems`, `ctx.productInfo` 등
- **덮어쓰기 주의**: 동일한 키를 재사용하면 이전 데이터가 사라짐
- **행별 독립성**: Context는 각 행마다 새로 생성되어 행 간 간섭 없음

#### 4. Fallback 처리
Context 데이터가 없을 때를 대비한 안전장치:

```javascript
transform: (value, row, headers, context) => {
  // Context 데이터가 없으면 기본 동작
  if (!context.parsedItems) {
    return [value];  // 또는 적절한 기본값
  }

  return context.parsedItems.map(item => item.quantity);
}
```

---

### 실전 예제: 옵션 상품 분해

**원본 데이터:**
| 상품코드 | 옵션정보                    | 기본가격 |
|----------|----------------------------|---------|
| P001     | 빨강:+1000,파랑:+2000,검정:0 | 50000   |

**목표 변환:**
| 상품코드 | 옵션명 | 가격  |
|----------|--------|-------|
| P001     | 빨강   | 51000 |
| P001     | 파랑   | 52000 |
| P001     | 검정   | 50000 |

**구현:**
```javascript
// 1번 컬럼: 상품코드 (Context에 옵션 파싱 결과 저장)
{
  targetColumn: '상품코드',
  sourceColumnIndex: 'A',
  transform: (code, row, headers, context) => {
    // 옵션정보 컬럼 값 가져오기
    const optionIndex = headers.indexOf('옵션정보');
    const optionStr = row[optionIndex];

    // "빨강:+1000,파랑:+2000,검정:0" 파싱
    const options = optionStr.split(',').map(opt => {
      const [name, priceStr] = opt.split(':');
      return {
        name: name.trim(),
        priceOffset: parseInt(priceStr) || 0
      };
    });

    // Context에 저장
    context.options = options;

    // 상품코드를 옵션 수만큼 복제
    return options.map(() => code);
  }
}

// 2번 컬럼: 옵션명
{
  targetColumn: '옵션명',
  sourceColumnIndex: 'B',  // 사용 안 함
  transform: (_, row, headers, context) => {
    if (!context.options) return [''];
    return context.options.map(opt => opt.name);
  }
}

// 3번 컬럼: 가격 (기본가격 + 옵션 추가금)
{
  targetColumn: '가격',
  sourceColumnIndex: 'C',
  transform: (basePrice, row, headers, context) => {
    if (!context.options) return [basePrice];

    const base = parseInt(basePrice) || 0;
    return context.options.map(opt => base + opt.priceOffset);
  }
}
```

**핵심 포인트:**
1. 첫 번째 컬럼에서 복잡한 문자열을 **한 번만** 파싱
2. 파싱 결과를 `context.options`에 저장
3. 나머지 컬럼들은 `context.options.map()`으로 동일한 배열 길이 보장
4. 각 컬럼이 필요한 필드만 추출: `name`, `priceOffset + basePrice`

---

## 실전 패턴 모음

### 8. 날짜 포맷 변환

```javascript
// "2024-01-15" → "20240115"
(value) => value.replace(/-/g, '')

// "15/01/2024" → "2024-01-15"
(value) => {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
}

// 상대 날짜 계산
(value) => {
  const date = new Date(value);
  date.setDate(date.getDate() + 7); // 7일 후
  return date.toISOString().split('T')[0];
}
```

### 9. 주소 분리

```javascript
// 주소를 주소1, 주소2로 분리
// 주소1 컬럼
(value) => {
  const parts = value.split(',');
  return parts[0]?.trim() || '';
}

// 주소2 컬럼
(value) => {
  const parts = value.split(',');
  return parts.slice(1).join(',').trim();
}
```

### 10. 조건부 고정값

```javascript
// 특정 조건일 때만 고정값 사용
(value, row, headers) => {
  const typeIndex = headers.indexOf('배송유형');
  const type = row[typeIndex];

  if (type === '해외배송') {
    return 'INTERNATIONAL';
  }
  return value; // 원본 값 유지
}
```

### 11. 배열 반환 시 조건부 필터링

```javascript
// 빈 값 제외하고 행 분해
(value) => {
  return value.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);  // 빈 문자열 제외
}

// 조건을 만족하는 항목만 행 분해
(value) => {
  return value.split(',')
    .map(s => s.trim())
    .filter(s => s.startsWith('SKU-'));  // SKU-로 시작하는 것만
}
```

### 12. 에러 방지 패턴

```javascript
// 안전한 숫자 변환
(value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// 안전한 문자열 처리
(value) => {
  if (!value || typeof value !== 'string') return '';
  return value.toUpperCase();
}

// Try-catch로 에러 처리
(value) => {
  try {
    return JSON.parse(value).productName;
  } catch (e) {
    return value; // 파싱 실패 시 원본 반환
  }
}
```

---

## 주의사항

### ⚠️ 행 분해 시 주의점

1. **모든 분해 컬럼의 배열 길이가 동일해야 함**
   - 컬럼 A가 3개 요소 반환 → 컬럼 B도 3개 요소 반환
   - Context를 활용하여 동일한 기준으로 분해

2. **Context 데이터 공유 순서**
   - 매핑 테이블의 위에서 아래로 순차 실행
   - 먼저 파싱하는 컬럼을 위쪽에 배치

3. **행 분해 미적용 컬럼**
   - 배열 반환하지 않은 컬럼은 모든 새 행에 동일한 값 복사

### 💡 디버깅 팁

```javascript
// console.log로 값 확인 (브라우저 콘솔에 출력)
(value, row, headers, context) => {
  console.log('value:', value);
  console.log('row:', row);
  console.log('headers:', headers);
  console.log('context:', context);
  return value;
}
```

---

## 요약

| 사용 케이스              | 반환 타입 | 예시                                      |
|--------------------------|-----------|-------------------------------------------|
| 단순 변환                | 단일 값   | `(v) => v * 1000`                         |
| 조건부 변환              | 단일 값   | `(v) => v > 10 ? 'A' : 'B'`               |
| 다른 컬럼 참조           | 단일 값   | `(v, row, headers) => row[0] + v`         |
| 단순 행 분해             | 배열      | `(v) => v.split(',')`                     |
| 복잡한 파싱 + 행 분해    | 배열      | `(v) => v.match(/\d+/g)`                  |
| 컬럼 간 협력 행 분해     | 배열 + context | `(v, r, h, ctx) => { ctx.data = ...; return [...]; }` |

---

**작성일**: 2025-01-XX
**프로젝트**: Excel Converter - Mapping Builder
