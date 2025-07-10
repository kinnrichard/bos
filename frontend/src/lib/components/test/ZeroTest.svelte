<script lang="ts">
	import { useUsers, useClients } from '$lib/zero';

	// Test Zero reactive queries
	const users = useUsers();
	const clients = useClients();
</script>

<div class="zero-test p-4 border rounded-lg">
	<h3 class="text-lg font-bold mb-4">Zero Integration Test</h3>
	
	<div class="grid grid-cols-2 gap-4">
		<div>
			<h4 class="font-semibold mb-2">Users ({$users?.length || 0})</h4>
			{#if $users}
				<ul class="space-y-1">
					{#each $users as user}
						<li class="text-sm">{user.name} ({user.email})</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-500 text-sm">Loading users...</p>
			{/if}
		</div>

		<div>
			<h4 class="font-semibold mb-2">Clients ({$clients?.length || 0})</h4>
			{#if $clients}
				<ul class="space-y-1">
					{#each $clients as client}
						<li class="text-sm">{client.name}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-500 text-sm">Loading clients...</p>
			{/if}
		</div>
	</div>
</div>