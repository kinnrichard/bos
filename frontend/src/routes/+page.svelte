<script lang="ts">
	import AppLayout from '$lib/components/layout/AppLayout.svelte';
	import ApiTest from '$lib/components/ApiTest.svelte';
	import ZeroTest from '$lib/components/test/ZeroTest.svelte';
	import UserMigrationTest from '$lib/components/test/UserMigrationTest.svelte';
	import ClientMigrationTest from '$lib/components/test/ClientMigrationTest.svelte';
	import JobMigrationTest from '$lib/components/test/JobMigrationTest.svelte';
	import TaskMigrationTest from '$lib/components/test/TaskMigrationTest.svelte';
</script>

<AppLayout>
<div class="home-page">
	<div class="container mx-auto px-4 py-8">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-primary mb-4">bŏs</h1>
			<p class="text-lg text-secondary">Job Management System</p>
			<p class="text-sm text-tertiary mt-4">Zero Migration in Progress</p>
		</div>
		
		<div class="space-y-6">
			<ZeroTest />
			<UserMigrationTest />
			<ClientMigrationTest />
			<JobMigrationTest />
			<TaskMigrationTest />
			<ApiTest />
		</div>
	</div>
</div>
</AppLayout>
