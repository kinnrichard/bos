<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/query-client';
	import { initZero } from '$lib/zero';
	import { onMount } from 'svelte';

	// Initialize Zero client on mount (browser only)
	onMount(() => {
		initZero();
	});
</script>

<QueryClientProvider client={queryClient}>
	<slot />
</QueryClientProvider>
