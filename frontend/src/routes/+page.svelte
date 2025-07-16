<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Redirect to jobs page (authenticated route)
	onMount(() => {
		goto('/jobs', { replaceState: true });
	});
</script>

<!-- Show loading while redirecting -->
<div class="redirect-loading">
	<div class="loading-content">
		<div class="spinner"></div>
		<p>Redirecting to jobs...</p>
	</div>
</div>

<style>
	.redirect-loading {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-black, #000);
	}

	.loading-content {
		text-align: center;
		color: var(--text-secondary, #C7C7CC);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 2px solid rgba(0, 163, 255, 0.2);
		border-top: 2px solid var(--accent-blue, #00A3FF);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>
