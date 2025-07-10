<script lang="ts">
	import { 
		useJobsQuery as tanstackJobsQuery 
	} from '$lib/api/hooks/jobs';
	import { 
		useJobsQuery as zeroJobsQuery, 
		migrationFlags, 
		compareMigrationData 
	} from '$lib/zero';
	import { onMount } from 'svelte';

	// Use both systems for comparison during migration
	const tanstackJobs = tanstackJobsQuery();
	const zeroJobs = zeroJobsQuery();

	// Compare data when both are available
	$: if ($tanstackJobs.data && $zeroJobs) {
		compareMigrationData($tanstackJobs.data, $zeroJobs, 'Jobs');
	}

	// Choose which system to use based on feature flag
	$: activeJobs = migrationFlags.useZeroForJobs ? $zeroJobs : $tanstackJobs.data;
	$: isLoading = migrationFlags.useZeroForJobs ? !$zeroJobs : $tanstackJobs.isLoading;

	onMount(() => {
		console.log('🧪 JobMigrationTest: Feature flags:', migrationFlags);
	});

	// Helper to extract client name safely
	function getClientName(job: any): string {
		if (migrationFlags.useZeroForJobs) {
			return job.client?.name || 'Unknown Client';
		} else {
			return job.client?.name || job.attributes?.client_name || 'Unknown Client';
		}
	}

	// Helper to get job title safely
	function getJobTitle(job: any): string {
		if (migrationFlags.useZeroForJobs) {
			return job.title;
		} else {
			return job.attributes?.title || job.title;
		}
	}

	// Helper to get job status safely
	function getJobStatus(job: any): string {
		if (migrationFlags.useZeroForJobs) {
			return job.status;
		} else {
			return job.attributes?.status || job.status;
		}
	}
</script>

<div class="job-migration-test p-4 border rounded-lg bg-indigo-50">
	<h3 class="text-lg font-bold mb-4 flex items-center gap-2">
		🧪 Job Migration Test
		<span class="text-sm font-normal bg-indigo-200 px-2 py-1 rounded">
			Using: {migrationFlags.useZeroForJobs ? 'Zero' : 'TanStack'}
		</span>
	</h3>
	
	<div class="grid grid-cols-2 gap-4 mb-4">
		<!-- TanStack Jobs -->
		<div class="border rounded p-3 bg-orange-50">
			<h4 class="font-semibold mb-2 text-orange-800">
				TanStack Jobs ({$tanstackJobs.data?.data?.length || 0})
			</h4>
			{#if $tanstackJobs.isLoading}
				<p class="text-gray-500 text-sm">Loading jobs from API...</p>
			{:else if $tanstackJobs.error}
				<p class="text-red-500 text-sm">Error: {$tanstackJobs.error}</p>
			{:else if $tanstackJobs.data?.data}
				<ul class="space-y-1 text-sm">
					{#each $tanstackJobs.data.data.slice(0, 3) as job}
						<li>
							<strong>{getJobTitle(job)}</strong>
							<br>
							<span class="text-gray-600">
								{getClientName(job)} • {getJobStatus(job)}
							</span>
						</li>
					{/each}
					{#if $tanstackJobs.data.data.length > 3}
						<li class="text-gray-500">... and {$tanstackJobs.data.data.length - 3} more</li>
					{/if}
				</ul>
			{:else}
				<p class="text-gray-500 text-sm">No jobs loaded</p>
			{/if}
		</div>

		<!-- Zero Jobs -->
		<div class="border rounded p-3 bg-green-50">
			<h4 class="font-semibold mb-2 text-green-800">
				Zero Jobs ({$zeroJobs?.length || 0})
			</h4>
			{#if !$zeroJobs}
				<p class="text-gray-500 text-sm">Loading jobs from Zero...</p>
			{:else if $zeroJobs.length === 0}
				<p class="text-gray-500 text-sm">No jobs in Zero database</p>
			{:else}
				<ul class="space-y-1 text-sm">
					{#each $zeroJobs.slice(0, 3) as job}
						<li>
							<strong>{getJobTitle(job)}</strong>
							<br>
							<span class="text-gray-600">
								{getClientName(job)} • {getJobStatus(job)}
							</span>
						</li>
					{/each}
					{#if $zeroJobs.length > 3}
						<li class="text-gray-500">... and {$zeroJobs.length - 3} more</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Active System Display -->
	<div class="border rounded p-3 bg-gray-50">
		<h4 class="font-semibold mb-2">Active System Output</h4>
		{#if isLoading}
			<p class="text-gray-500 text-sm">Loading jobs...</p>
		{:else if activeJobs && (Array.isArray(activeJobs) ? activeJobs.length : activeJobs.data?.length) > 0}
			{@const count = Array.isArray(activeJobs) ? activeJobs.length : activeJobs.data?.length}
			<p class="text-sm text-green-600">
				✅ Loaded {count} jobs from {migrationFlags.useZeroForJobs ? 'Zero' : 'TanStack'}
			</p>
		{:else}
			<p class="text-sm text-yellow-600">
				⚠️ No jobs available from active system
			</p>
		{/if}
	</div>

	<!-- Zero Features Demo -->
	{#if $zeroJobs && $zeroJobs.length > 0}
		<div class="mt-4 border rounded p-3 bg-green-100">
			<h4 class="font-semibold mb-2 text-green-800">Zero Job Features</h4>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<strong>Real-time Sync:</strong> Live job updates
				</div>
				<div>
					<strong>Relationships:</strong> Client, tasks, technicians
				</div>
				<div>
					<strong>Optimistic UI:</strong> Instant interactions
				</div>
				<div>
					<strong>Offline Support:</strong> Works without internet
				</div>
			</div>
		</div>
	{/if}

	<!-- Complex Relationship Demo -->
	{#if $zeroJobs && $zeroJobs.length > 0}
		{@const firstJob = $zeroJobs[0]}
		<div class="mt-4 border rounded p-3 bg-blue-100">
			<h4 class="font-semibold mb-2 text-blue-800">Job Relationship Demo</h4>
			<div class="text-sm">
				<p><strong>Job:</strong> {firstJob.title}</p>
				{#if firstJob.client}
					<p><strong>Client:</strong> {firstJob.client.name}</p>
				{/if}
				{#if firstJob.assignments && firstJob.assignments.length > 0}
					<p><strong>Technicians:</strong> 
						{firstJob.assignments.map(a => a.user?.name).filter(Boolean).join(', ')}
					</p>
				{/if}
				{#if firstJob.tasks && firstJob.tasks.length > 0}
					<p><strong>Tasks:</strong> {firstJob.tasks.length} tasks</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Migration Controls -->
	<div class="mt-4 text-xs text-gray-600">
		<p>💡 Set <code>VITE_ZERO_JOBS=true</code> to test Zero jobs</p>
		<p>🔄 Jobs include complex relationships (client, tasks, technicians)</p>
	</div>
</div>