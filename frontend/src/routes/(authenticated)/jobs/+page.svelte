<script lang="ts">
  import { page } from '$app/stores';
  import { createJobsQuery } from '$lib/queries/jobs.svelte';
  import { createJobsFilter } from '$lib/filters/jobs.svelte';
  import { jobsSearch } from '$lib/stores/jobsSearch.svelte';
  import { getSelectedJobStatuses, getSelectedJobPriorities } from '$lib/stores/jobFilter.svelte';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobsListView from '$lib/components/jobs/JobsListView.svelte';

  // Get query parameters
  const url = $derived($page.url);
  const technicianId = $derived(url.searchParams.get('technician_id') || undefined);

  // Create the query using composable builders
  const query = $derived(createJobsQuery().all());

  // Get filter selections
  const selectedStatuses = $derived(getSelectedJobStatuses());
  const selectedPriorities = $derived(getSelectedJobPriorities());

  // Create the display filter from filter store selections
  const displayFilter = $derived(
    createJobsFilter({
      search: jobsSearch.searchQuery,
      technicianId,
      // Use filter store selections - empty array means show all
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
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
