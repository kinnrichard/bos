<script lang="ts">
  import { page } from '$app/stores';
  import { createJobsQuery } from '$lib/queries/jobs.svelte';
  import { createJobsFilter, createFilterFromSearchParams } from '$lib/filters/jobs.svelte';
  import { jobsSearch } from '$lib/stores/jobsSearch.svelte';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobsListView from '$lib/components/jobs/JobsListView.svelte';

  // Get query parameters
  const url = $derived($page.url);
  const technicianId = $derived(url.searchParams.get('technician_id') || undefined);

  // Create the query using composable builders
  const query = $derived(createJobsQuery().all());

  // Create the display filter from URL params and search store
  const displayFilter = $derived(
    createJobsFilter({
      ...createFilterFromSearchParams(url.searchParams),
      search: jobsSearch.searchQuery,
      technicianId,
    })
  );
</script>

<svelte:head>
  <title>Jobs - bŏs</title>
</svelte:head>

<AppLayout>
  <JobsListView {query} {displayFilter} title="Jobs">
    {#snippet headerContent()}
      <!-- Technician Filter Info -->
      {#if technicianId}
        <div class="filter-info">
          <span class="filter-label">Filtered by technician</span>
          <a href="/jobs" class="clear-filter">Clear filter</a>
        </div>
      {/if}
    {/snippet}
  </JobsListView>
</AppLayout>

<style>
  @import '$lib/styles/jobs-shared.scss';

  /* All common styles moved to JobsListView component */
  /* Only page-specific overrides remain here */
</style>
