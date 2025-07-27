<!--
  Client Jobs Index Page
  
  Displays all jobs for a specific client
  Reuses components from the main jobs page
-->

<script lang="ts">
  import { page } from '$app/stores';
  import { ReactiveJob } from '$lib/models/reactive-job';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import type { JobData } from '$lib/models/types/job-data';
  import { shouldShowJob } from '$lib/stores/jobsSearch.svelte';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobsLayout from '$lib/components/jobs/JobsLayout.svelte';
  import JobsList from '$lib/components/jobs/JobsList.svelte';
  import type { JobStatus, JobPriority } from '$lib/types/job';

  // Get client ID from URL
  const clientId = $derived($page.params.id);

  // Query for the client
  const clientQuery = $derived(clientId ? ReactiveClient.find(clientId) : null);
  const client = $derived(clientQuery?.data);
  const clientLoading = $derived(clientQuery?.isLoading ?? true);
  const clientError = $derived(clientQuery?.error);

  // Query for jobs filtered by client
  const jobsQuery = $derived(
    clientId
      ? ReactiveJob.includes('client')
          .where({ client_id: clientId })
          .orderBy('created_at', 'desc')
          .all()
      : null
  );

  // Get jobs data
  const jobs = $derived(jobsQuery?.data || []);
  const isLoading = $derived(jobsQuery?.isLoading ?? false);
  const error = $derived(jobsQuery?.error);

  // Get query parameters for filtering (similar to main jobs page)
  const url = $derived($page.url);
  const status = $derived(url.searchParams.get('status') as JobStatus | undefined);
  const priority = $derived(url.searchParams.get('priority') as JobPriority | undefined);

  // Filter jobs by status/priority/search if specified
  const filteredJobs = $derived(
    jobs.filter((job: JobData) => {
      // Apply search filter first
      if (!shouldShowJob(job)) {
        return false;
      }

      // Filter by status if specified
      if (status && job.status !== status) {
        return false;
      }

      // Filter by priority if specified
      if (priority && job.priority !== priority) {
        return false;
      }

      return true;
    })
  );

  // Page title
  const pageTitle = $derived(
    client ? `${client.name}'s Jobs - Faultless` : 'Client Jobs - Faultless'
  );

  // Handle retry
  function handleRetry() {
    if (jobsQuery) {
      jobsQuery.refresh();
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout currentClient={client}>
  <JobsLayout>
    {#snippet header()}
      <div class="header-content">
        <div class="breadcrumb">
          {#if client}
            <a href="/clients/{clientId}" class="breadcrumb-link">
              {client.name}
            </a>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">Jobs</span>
          {:else}
            <span>Client Jobs</span>
          {/if}
        </div>
        <h1>
          {#if client}
            Jobs for {client.name}
          {:else}
            Client Jobs
          {/if}
        </h1>
      </div>
      <a href="/jobs/new?clientId={clientId}" class="action-button action-button--small">
        <span class="button-icon">➕</span>
        New Job
      </a>
    {/snippet}

    <JobsList
      jobs={filteredJobs}
      isLoading={isLoading || clientLoading}
      error={error || clientError}
      showClient={false}
      emptyMessage={jobs.length === 0
        ? 'No jobs yet for this client'
        : 'No jobs match your filters'}
      onRetry={handleRetry}
    >
      {#snippet emptyAction()}
        <a href="/jobs/new?clientId={clientId}" class="action-button">
          <span class="button-icon">➕</span>
          Create First Job
        </a>
      {/snippet}
    </JobsList>
  </JobsLayout>
</AppLayout>

<style>
  @import '$lib/styles/jobs-shared.scss';

  /* Header layout */
  .header-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  /* Page header styling */
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
</style>
