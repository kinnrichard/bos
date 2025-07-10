<script lang="ts">
	import { useUsersQuery as tanstackUsersQuery } from '$lib/api/hooks/users';
	import { useUsersQuery as zeroUsersQuery, migrationFlags, compareMigrationData } from '$lib/zero';
	import { onMount } from 'svelte';

	// Use both systems for comparison during migration
	const tanstackUsers = tanstackUsersQuery();
	const zeroUsers = zeroUsersQuery();

	// Compare data when both are available
	$: if ($tanstackUsers.data && $zeroUsers) {
		compareMigrationData($tanstackUsers.data, $zeroUsers, 'Users');
	}

	// Choose which system to use based on feature flag
	$: activeUsers = migrationFlags.useZeroForUsers ? $zeroUsers : $tanstackUsers.data;
	$: isLoading = migrationFlags.useZeroForUsers ? !$zeroUsers : $tanstackUsers.isLoading;

	onMount(() => {
		console.log('🧪 UserMigrationTest: Feature flags:', migrationFlags);
	});
</script>

<div class="user-migration-test p-4 border rounded-lg bg-blue-50">
	<h3 class="text-lg font-bold mb-4 flex items-center gap-2">
		🧪 User Migration Test
		<span class="text-sm font-normal bg-blue-200 px-2 py-1 rounded">
			Using: {migrationFlags.useZeroForUsers ? 'Zero' : 'TanStack'}
		</span>
	</h3>
	
	<div class="grid grid-cols-2 gap-4 mb-4">
		<!-- TanStack Users -->
		<div class="border rounded p-3 bg-orange-50">
			<h4 class="font-semibold mb-2 text-orange-800">
				TanStack Users ({$tanstackUsers.data?.length || 0})
			</h4>
			{#if $tanstackUsers.isLoading}
				<p class="text-gray-500 text-sm">Loading users from API...</p>
			{:else if $tanstackUsers.error}
				<p class="text-red-500 text-sm">Error: {$tanstackUsers.error}</p>
			{:else if $tanstackUsers.data}
				<ul class="space-y-1 text-sm">
					{#each $tanstackUsers.data.slice(0, 3) as user}
						<li>{user.attributes?.name || user.name} ({user.attributes?.role || user.role})</li>
					{/each}
					{#if $tanstackUsers.data.length > 3}
						<li class="text-gray-500">... and {$tanstackUsers.data.length - 3} more</li>
					{/if}
				</ul>
			{:else}
				<p class="text-gray-500 text-sm">No users loaded</p>
			{/if}
		</div>

		<!-- Zero Users -->
		<div class="border rounded p-3 bg-green-50">
			<h4 class="font-semibold mb-2 text-green-800">
				Zero Users ({$zeroUsers?.length || 0})
			</h4>
			{#if !$zeroUsers}
				<p class="text-gray-500 text-sm">Loading users from Zero...</p>
			{:else if $zeroUsers.length === 0}
				<p class="text-gray-500 text-sm">No users in Zero database</p>
			{:else}
				<ul class="space-y-1 text-sm">
					{#each $zeroUsers.slice(0, 3) as user}
						<li>{user.name} ({user.role})</li>
					{/each}
					{#if $zeroUsers.length > 3}
						<li class="text-gray-500">... and {$zeroUsers.length - 3} more</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Active System Display -->
	<div class="border rounded p-3 bg-gray-50">
		<h4 class="font-semibold mb-2">Active System Output</h4>
		{#if isLoading}
			<p class="text-gray-500 text-sm">Loading users...</p>
		{:else if activeUsers && activeUsers.length > 0}
			<p class="text-sm text-green-600">
				✅ Loaded {activeUsers.length} users from {migrationFlags.useZeroForUsers ? 'Zero' : 'TanStack'}
			</p>
		{:else}
			<p class="text-sm text-yellow-600">
				⚠️ No users available from active system
			</p>
		{/if}
	</div>

	<!-- Migration Controls -->
	<div class="mt-4 text-xs text-gray-600">
		<p>💡 Set <code>VITE_ZERO_USERS=true</code> to test Zero users</p>
		<p>🔄 This component compares both systems during migration</p>
	</div>
</div>