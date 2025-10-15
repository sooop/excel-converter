<svelte:head>
	<title>Excel Converter - Home</title>
</svelte:head>

<div class="home-container">
	<div class="home-header">
		<h1>EXCEL CONVERTER</h1>
		<p>다양한 엑셀 변환 도구를 제공합니다</p>
	</div>

	<div class="converter-grid">
		<a href="/seribox" class="converter-card">
			<div class="converter-card-icon">📊</div>
			<h2 class="converter-card-title">SeriBox(TW)</h2>
			<p class="converter-card-description">
				엑셀 파일을 스마트십 업로드 형식으로 변환합니다
			</p>
			<div class="converter-card-status">사용 가능</div>
		</a>

		<a href="/aliexpress" class="converter-card">
			<div class="converter-card-icon">🛒</div>
			<h2 class="converter-card-title">AliExpress</h2>
			<p class="converter-card-description">
				알리익스프레스 주문 데이터를 스마트십 형식으로 변환합니다
			</p>
			<div class="converter-card-status">사용 가능</div>
		</a>

		<a href="/custom" class="converter-card">
			<div class="converter-card-icon">⚙️</div>
			<h2 class="converter-card-title">사용자 정의 변환기</h2>
			<p class="converter-card-description">
				저장한 커스텀 매핑으로 엑셀 파일을 변환합니다
			</p>
			<div class="converter-card-status">사용 가능</div>
		</a>

		<a href="/builder" class="converter-card">
			<div class="converter-card-icon">🔧</div>
			<h2 class="converter-card-title">Mapping Builder</h2>
			<p class="converter-card-description">
				엑셀 변환 매핑 설정을 쉽게 생성합니다
			</p>
			<div class="converter-card-status">사용 가능</div>
		</a>

		<a href="/test" class="converter-card">
			<div class="converter-card-icon">🧪</div>
			<h2 class="converter-card-title">Test Converter</h2>
			<p class="converter-card-description">
				테스트용 엑셀 변환 도구입니다
			</p>
			<div class="converter-card-status">사용 가능</div>
		</a>

		<div class="converter-card disabled">
			<div class="converter-card-icon">📋</div>
			<h2 class="converter-card-title">Order Converter</h2>
			<p class="converter-card-description">
				주문 데이터를 통합 형식으로 변환합니다
			</p>
			<div class="converter-card-status">준비 중</div>
		</div>

		<div class="converter-card disabled">
			<div class="converter-card-icon">👥</div>
			<h2 class="converter-card-title">Customer Converter</h2>
			<p class="converter-card-description">
				고객 데이터를 표준화된 형식으로 변환합니다
			</p>
			<div class="converter-card-status">준비 중</div>
		</div>

		<div class="converter-card disabled">
			<div class="converter-card-icon">💰</div>
			<h2 class="converter-card-title">Invoice Converter</h2>
			<p class="converter-card-description">
				송장 데이터를 회계 시스템용으로 변환합니다
			</p>
			<div class="converter-card-status">준비 중</div>
		</div>
	</div>

	<div class="home-footer">
		<p>LESS BUT BETTER</p>
	</div>
</div>
