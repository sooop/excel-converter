<script>
	import { page } from '$app/stores';
</script>

<nav class="nav">
	<div class="nav-container">
		<a href="/" class="nav-logo">CONVERTER</a>
		<div class="nav-links">
			<a href="/" class={$page.url.pathname === '/' ? 'nav-link active' : 'nav-link'}>Home</a>
			<a href="/builder" class={$page.url.pathname === '/builder' ? 'nav-link active' : 'nav-link'}>Builder</a>
		</div>
	</div>
</nav>
