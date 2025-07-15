<script lang="ts">
	import '../app.css';
	import { initZero, getZeroState } from '$lib/zero';
	import { createZeroContext } from '$lib/zero-context.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let initializationStatus: 'idle' | 'pending' | 'success' | 'error' = 'idle';
	let initializationError: string | null = null;

	// Create Zero context for the entire app
	const zero = createZeroContext();

	// Initialize Zero client on mount (browser only)
	onMount(async () => {
		if (!browser) return;
		
		try {
			initializationStatus = 'pending';
			
			await initZero();
			
			initializationStatus = 'success';
			
		} catch (error) {
			initializationStatus = 'error';
			initializationError = error instanceof Error ? error.message : 'Unknown error';
			console.error('[Zero] Failed to initialize client:', error);
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		// Zero client cleanup is handled by the visibility change handler
		// No explicit cleanup needed here since Zero manages its own lifecycle
	});
</script>

<slot />
