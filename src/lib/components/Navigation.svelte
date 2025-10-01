<script>
	import { page } from '$app/stores';
</script>

<nav class="nav">
	<div class="nav-container">
		<a href="/" class="nav-logo">CONVERTER</a>
		<div class="nav-links">
			<a href="/" class={$page.url.pathname === '/' ? 'nav-link active' : 'nav-link'}>Home</a>
		</div>
	</div>
</nav>
