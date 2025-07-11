<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	import { initZero } from '$lib/zero';
	import { onMount } from 'svelte';

	// Initialize Zero client on mount (browser only)
	onMount(async () => {
		try {
			await initZero();
			console.log('[Zero] Client initialized successfully');
		} catch (error) {
			console.error('[Zero] Failed to initialize client:', error);
		}
	});
</script>

<QueryClientProvider client={queryClient}>
	<slot />
</QueryClientProvider>
