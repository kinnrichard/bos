<script lang="ts">
  import { page } from '$app/stores';
  import { createJobsQuery } from '$lib/queries/jobs.svelte';
  import { createJobsFilter } from '$lib/filters/jobs.svelte';
  import { jobsSearch } from '$lib/stores/jobsSearch.svelte';
  import {
    getSelectedJobStatuses,
    getSelectedJobPriorities,
    getSelectedTechnicianIds,
  } from '$lib/stores/jobFilter.svelte';
  import { getCurrentUser } from '$lib/auth/current-user';
  import { ReactiveUser } from '$lib/models/reactive-user';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobsListView from '$lib/components/jobs/JobsListView.svelte';

  // Get the filter from URL path (mine, not-mine, not-assigned, or undefined)
  const filter = $derived(() => {
    const path = $page.url.pathname;
    if (path === '/jobs/mine') return 'mine';
    if (path === '/jobs/not-mine') return 'not-mine';
    if (path === '/jobs/not-assigned') return 'not-assigned';
    return undefined;
  });
  
  // Get current user for "mine" and "not-mine" filters
  const currentUser = getCurrentUser();
  
  // Get all technicians for "not-mine" filter
  const allTechniciansQuery = $derived(
    filter() === 'not-mine' 
      ? ReactiveUser.all()
          .where('role', 'IN', ['technician', 'admin', 'owner'])
          .orderBy('name', 'asc')
          .all()
      : null
  );
  const allTechnicians = $derived(allTechniciansQuery?.data || []);

  // Create the query using composable builders
  const query = $derived(createJobsQuery().all());

  // Get filter selections from store
  const selectedStatuses = $derived(getSelectedJobStatuses());
  const selectedPriorities = $derived(getSelectedJobPriorities());
  const storedTechnicianIds = $derived(getSelectedTechnicianIds());

  // Determine technician IDs based on semantic route or stored selection
  const selectedTechnicianIds = $derived(() => {
    switch (filter()) {
      case 'mine':
        return currentUser ? [currentUser.id] : [];
      case 'not-mine':
        // All technicians except current user
        return currentUser 
          ? allTechnicians.filter(t => t.id !== currentUser.id).map(t => t.id)
          : [];
      case 'not-assigned':
        return ['not_assigned'];
      default:
        // Use stored selection for regular /jobs route
        return storedTechnicianIds;
    }
  });

  // Create the display filter
  const displayFilter = $derived(
    createJobsFilter({
      search: jobsSearch.searchQuery,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      priorities: selectedPriorities.length > 0 ? selectedPriorities : undefined,
      technicianIds: selectedTechnicianIds().length > 0 ? selectedTechnicianIds() : undefined,
    })
  );
  
  // Page title based on filter
  const pageTitle = $derived(() => {
    switch (filter()) {
      case 'mine':
        return 'My Jobs';
      case 'not-mine':
        return 'Other Jobs';
      case 'not-assigned':
        return 'Unassigned Jobs';
      default:
        return 'Jobs';
    }
  });
</script>

<svelte:head>
  <title>{pageTitle()} - bŏs</title>
</svelte:head>

<AppLayout>
  <JobsListView {query} {displayFilter} title={pageTitle()} />
</AppLayout>

<style>
  @import '$lib/styles/jobs-shared.scss';
</style>