<script lang="ts">
	import AppLayout from '$lib/components/layout/AppLayout.svelte';
	import ApiTest from '$lib/components/ApiTest.svelte';
</script>

<AppLayout>
<div class="home-page">
	<div class="container mx-auto px-4 py-8">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold text-primary mb-4">bŏs</h1>
			<p class="text-lg text-secondary">Job Management System</p>
			<p class="text-sm text-tertiary mt-4">Zero Migration Complete</p>
		</div>
		
		<div class="space-y-6">
			<!-- Zero migration complete - using ApiTest for basic functionality testing -->
			<ApiTest />
		</div>
	</div>
</div>
</AppLayout>
