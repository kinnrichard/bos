<script lang="ts">
	import { 
		useClientsQuery as zeroClientsQuery, 
		migrationFlags, 
		compareMigrationData 
	} from '$lib/zero';
	import { onMount } from 'svelte';

	// For now, we only have Zero clients (no TanStack equivalent yet)
	const zeroClients = zeroClientsQuery();

	// Simulate what TanStack clients would look like
	$: mockTanstackClients = {
		data: null,
		isLoading: true,
		error: null
	};

	onMount(() => {
		console.log('🧪 ClientMigrationTest: Feature flags:', migrationFlags);
		
		// Compare with mock data when Zero data is available
		if ($zeroClients) {
			compareMigrationData(mockTanstackClients.data, $zeroClients, 'Clients');
		}
	});

	// Choose which system to use based on feature flag
	$: activeClients = migrationFlags.useZeroForClients ? $zeroClients : mockTanstackClients.data;
	$: isLoading = migrationFlags.useZeroForClients ? !$zeroClients : mockTanstackClients.isLoading;
</script>

<div class="client-migration-test p-4 border rounded-lg bg-purple-50">
	<h3 class="text-lg font-bold mb-4 flex items-center gap-2">
		🧪 Client Migration Test
		<span class="text-sm font-normal bg-purple-200 px-2 py-1 rounded">
			Using: {migrationFlags.useZeroForClients ? 'Zero' : 'TanStack (Mock)'}
		</span>
	</h3>
	
	<div class="grid grid-cols-2 gap-4 mb-4">
		<!-- TanStack Clients (Mock) -->
		<div class="border rounded p-3 bg-orange-50">
			<h4 class="font-semibold mb-2 text-orange-800">
				TanStack Clients (Mock) ({mockTanstackClients.data?.length || 0})
			</h4>
			{#if mockTanstackClients.isLoading}
				<p class="text-gray-500 text-sm">Loading clients from API...</p>
			{:else if mockTanstackClients.error}
				<p class="text-red-500 text-sm">Error: {mockTanstackClients.error}</p>
			{:else if mockTanstackClients.data}
				<ul class="space-y-1 text-sm">
					{#each mockTanstackClients.data.slice(0, 3) as client}
						<li>{client.name}</li>
					{/each}
					{#if mockTanstackClients.data.length > 3}
						<li class="text-gray-500">... and {mockTanstackClients.data.length - 3} more</li>
					{/if}
				</ul>
			{:else}
				<p class="text-gray-500 text-sm">No TanStack clients API yet</p>
			{/if}
		</div>

		<!-- Zero Clients -->
		<div class="border rounded p-3 bg-green-50">
			<h4 class="font-semibold mb-2 text-green-800">
				Zero Clients ({$zeroClients?.length || 0})
			</h4>
			{#if !$zeroClients}
				<p class="text-gray-500 text-sm">Loading clients from Zero...</p>
			{:else if $zeroClients.length === 0}
				<p class="text-gray-500 text-sm">No clients in Zero database</p>
			{:else}
				<ul class="space-y-1 text-sm">
					{#each $zeroClients.slice(0, 3) as client}
						<li>{client.name}</li>
					{/each}
					{#if $zeroClients.length > 3}
						<li class="text-gray-500">... and {$zeroClients.length - 3} more</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Active System Display -->
	<div class="border rounded p-3 bg-gray-50">
		<h4 class="font-semibold mb-2">Active System Output</h4>
		{#if isLoading}
			<p class="text-gray-500 text-sm">Loading clients...</p>
		{:else if activeClients && activeClients.length > 0}
			<p class="text-sm text-green-600">
				✅ Loaded {activeClients.length} clients from {migrationFlags.useZeroForClients ? 'Zero' : 'TanStack'}
			</p>
		{:else}
			<p class="text-sm text-yellow-600">
				⚠️ No clients available from active system
			</p>
		{/if}
	</div>

	<!-- Zero Features Demo -->
	{#if $zeroClients && $zeroClients.length > 0}
		<div class="mt-4 border rounded p-3 bg-green-100">
			<h4 class="font-semibold mb-2 text-green-800">Zero Real-time Features</h4>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<strong>Reactive Updates:</strong> Changes sync instantly
				</div>
				<div>
					<strong>Local-first:</strong> Works offline
				</div>
				<div>
					<strong>Normalized Search:</strong> Case-insensitive
				</div>
				<div>
					<strong>Relationships:</strong> Jobs, people, devices
				</div>
			</div>
		</div>
	{/if}

	<!-- Migration Controls -->
	<div class="mt-4 text-xs text-gray-600">
		<p>💡 Set <code>VITE_ZERO_CLIENTS=true</code> to test Zero clients</p>
		<p>🔄 Ready for migration when TanStack client API is implemented</p>
	</div>
</div>