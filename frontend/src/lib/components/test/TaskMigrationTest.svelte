<script lang="ts">
	import { 
		useTaskBatchDetailsQuery as tanstackTasksQuery 
	} from '$lib/api/hooks/tasks';
	import { 
		useTasksByJobQuery as zeroTasksQuery, 
		useTaskUtils,
		migrationFlags, 
		compareMigrationData 
	} from '$lib/zero';
	import { onMount } from 'svelte';

	// Mock a job ID for testing (in real app this would come from props/store)
	const mockJobId = 'test-job-id';

	// Use both systems for comparison during migration
	const tanstackTasks = tanstackTasksQuery(mockJobId);
	const zeroTasks = zeroTasksQuery(mockJobId);
	const taskUtils = useTaskUtils();

	// Compare data when both are available
	$: if ($tanstackTasks.data && $zeroTasks) {
		compareMigrationData($tanstackTasks.data, $zeroTasks, 'Tasks');
	}

	// Choose which system to use based on feature flag
	$: activeTasks = migrationFlags.useZeroForTasks ? $zeroTasks : $tanstackTasks.data;
	$: isLoading = migrationFlags.useZeroForTasks ? !$zeroTasks : $tanstackTasks.isLoading;

	// Process tasks for hierarchy display (Zero only)
	$: hierarchyTasks = $zeroTasks ? taskUtils.flattenHierarchy($zeroTasks) : [];

	onMount(() => {
		console.log('🧪 TaskMigrationTest: Feature flags:', migrationFlags);
	});

	// Helper to get task title safely
	function getTaskTitle(task: any): string {
		if (migrationFlags.useZeroForTasks) {
			return task.title;
		} else {
			return task.attributes?.title || task.title;
		}
	}

	// Helper to get task status safely
	function getTaskStatus(task: any): string {
		if (migrationFlags.useZeroForTasks) {
			return task.status;
		} else {
			return task.attributes?.status || task.status;
		}
	}

	// Helper to count subtasks
	function getSubtaskCount(task: any): number {
		if (migrationFlags.useZeroForTasks) {
			return task.children?.length || 0;
		} else {
			return task.subtasks_count || 0;
		}
	}
</script>

<div class="task-migration-test p-4 border rounded-lg bg-emerald-50">
	<h3 class="text-lg font-bold mb-4 flex items-center gap-2">
		🧪 Task Migration Test
		<span class="text-sm font-normal bg-emerald-200 px-2 py-1 rounded">
			Using: {migrationFlags.useZeroForTasks ? 'Zero' : 'TanStack'}
		</span>
	</h3>
	
	<div class="grid grid-cols-2 gap-4 mb-4">
		<!-- TanStack Tasks -->
		<div class="border rounded p-3 bg-orange-50">
			<h4 class="font-semibold mb-2 text-orange-800">
				TanStack Tasks ({$tanstackTasks.data?.length || 0})
			</h4>
			{#if $tanstackTasks.isLoading}
				<p class="text-gray-500 text-sm">Loading tasks from API...</p>
			{:else if $tanstackTasks.error}
				<p class="text-red-500 text-sm">Error: {$tanstackTasks.error}</p>
			{:else if $tanstackTasks.data && $tanstackTasks.data.length > 0}
				<ul class="space-y-1 text-sm">
					{#each $tanstackTasks.data.slice(0, 3) as task}
						<li>
							<strong>{getTaskTitle(task)}</strong>
							<br>
							<span class="text-gray-600">
								{getTaskStatus(task)} • {getSubtaskCount(task)} subtasks
							</span>
						</li>
					{/each}
					{#if $tanstackTasks.data.length > 3}
						<li class="text-gray-500">... and {$tanstackTasks.data.length - 3} more</li>
					{/if}
				</ul>
			{:else}
				<p class="text-gray-500 text-sm">No tasks for job {mockJobId}</p>
			{/if}
		</div>

		<!-- Zero Tasks -->
		<div class="border rounded p-3 bg-green-50">
			<h4 class="font-semibold mb-2 text-green-800">
				Zero Tasks ({$zeroTasks?.length || 0})
			</h4>
			{#if !$zeroTasks}
				<p class="text-gray-500 text-sm">Loading tasks from Zero...</p>
			{:else if $zeroTasks.length === 0}
				<p class="text-gray-500 text-sm">No tasks in Zero database</p>
			{:else}
				<ul class="space-y-1 text-sm">
					{#each $zeroTasks.slice(0, 3) as task}
						<li>
							<strong>{getTaskTitle(task)}</strong>
							<br>
							<span class="text-gray-600">
								{getTaskStatus(task)} • {getSubtaskCount(task)} subtasks
								{#if task.parent_id}
									<span class="text-blue-600">• Subtask</span>
								{/if}
							</span>
						</li>
					{/each}
					{#if $zeroTasks.length > 3}
						<li class="text-gray-500">... and {$zeroTasks.length - 3} more</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Active System Display -->
	<div class="border rounded p-3 bg-gray-50">
		<h4 class="font-semibold mb-2">Active System Output</h4>
		{#if isLoading}
			<p class="text-gray-500 text-sm">Loading tasks...</p>
		{:else if activeTasks && activeTasks.length > 0}
			<p class="text-sm text-green-600">
				✅ Loaded {activeTasks.length} tasks from {migrationFlags.useZeroForTasks ? 'Zero' : 'TanStack'}
			</p>
		{:else}
			<p class="text-sm text-yellow-600">
				⚠️ No tasks available from active system
			</p>
		{/if}
	</div>

	<!-- Zero Hierarchy Features Demo -->
	{#if hierarchyTasks.length > 0}
		<div class="mt-4 border rounded p-3 bg-green-100">
			<h4 class="font-semibold mb-2 text-green-800">Zero Hierarchy Features</h4>
			<div class="text-sm space-y-1">
				{#each hierarchyTasks.slice(0, 5) as task}
					<div style="padding-left: {task.depth * 20}px" class="flex items-center gap-2">
						{#if task.depth > 0}
							<span class="text-gray-400">└</span>
						{/if}
						<span class="font-medium">{task.title}</span>
						<span class="text-gray-500">({task.status})</span>
						{#if task.children && task.children.length > 0}
							<span class="text-blue-600 text-xs">[{task.children.length} subtasks]</span>
						{/if}
					</div>
				{/each}
				{#if hierarchyTasks.length > 5}
					<div class="text-gray-500">... and {hierarchyTasks.length - 5} more</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Zero Task Features -->
	{#if $zeroTasks && $zeroTasks.length > 0}
		<div class="mt-4 border rounded p-3 bg-blue-100">
			<h4 class="font-semibold mb-2 text-blue-800">Zero Task Features</h4>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<strong>Hierarchical Structure:</strong> Parent/child relationships
				</div>
				<div>
					<strong>Drag & Drop:</strong> Batch reordering support
				</div>
				<div>
					<strong>Real-time Updates:</strong> Live position changes
				</div>
				<div>
					<strong>Optimistic Locking:</strong> Conflict prevention
				</div>
			</div>
		</div>
	{/if}

	<!-- Task Hierarchy Demo -->
	{#if $zeroTasks && $zeroTasks.length > 0}
		{@const rootTasks = $zeroTasks.filter(t => !t.parent_id)}
		{@const subtasks = $zeroTasks.filter(t => t.parent_id)}
		<div class="mt-4 border rounded p-3 bg-indigo-100">
			<h4 class="font-semibold mb-2 text-indigo-800">Task Statistics</h4>
			<div class="grid grid-cols-3 gap-4 text-sm">
				<div class="text-center">
					<div class="text-2xl font-bold text-indigo-600">{rootTasks.length}</div>
					<div>Root Tasks</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-indigo-600">{subtasks.length}</div>
					<div>Subtasks</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-indigo-600">{$zeroTasks.length}</div>
					<div>Total Tasks</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Migration Controls -->
	<div class="mt-4 text-xs text-gray-600">
		<p>💡 Set <code>VITE_ZERO_TASKS=true</code> to test Zero tasks</p>
		<p>🔄 Tasks support complex hierarchies and real-time positioning</p>
		<p>🎯 Testing with job ID: <code>{mockJobId}</code></p>
	</div>
</div>