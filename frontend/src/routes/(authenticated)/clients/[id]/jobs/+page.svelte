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
  import ReactiveView from '$lib/reactive/ReactiveView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import type { JobStatus, JobPriority } from '$lib/types/job';

  // Get client ID from URL
  const clientId = $derived($page.params.id);

  // Query for the client
  const clientQuery = $derived(clientId ? ReactiveClient.find(clientId) : null);
  const client = $derived(clientQuery?.data);
  // const clientLoading = $derived(clientQuery?.isLoading ?? true);
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

  // Note: ReactiveView handles data, loading, and error states internally

  // Get query parameters for filtering (similar to main jobs page)
  const url = $derived($page.url);
  const status = $derived(url.searchParams.get('status') as JobStatus | undefined);
  const priority = $derived(url.searchParams.get('priority') as JobPriority | undefined);

  // Function to apply all filters to the jobs data
  function applyFilters(jobs: JobData[]): JobData[] {
    if (!jobs) return [];

    return jobs.filter((job: JobData) => {
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
    });
  }

  // Page title
  const pageTitle = $derived(
    client ? `${client.name}'s Jobs - Faultless` : 'Client Jobs - Faultless'
  );

  // Zero.js handles all retries and refreshes automatically
  // No manual retry logic needed - trust Zero's built-in resilience
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout currentClient={client}>
  <JobsLayout>
    {#snippet header()}
      <div class="header-content">
        <h1>
          {#if client}
            Jobs for {client.name}
          {:else}
            Client Jobs
          {/if}
        </h1>
      </div>
    {/snippet}

    {#if clientError}
      <!-- Show client error state -->
      <div class="error-state">
        <h2>Unable to load client</h2>
        <p>{clientError.message}</p>
        <button onclick={() => window.location.reload()}>Retry</button>
      </div>
    {:else if jobsQuery}
      <!-- Show jobs with ReactiveView -->
      <ReactiveView query={jobsQuery} strategy="progressive">
        {#snippet loading()}
          <LoadingSkeleton type="job-card" count={6} />
        {/snippet}

        {#snippet error({ error, refresh })}
          <div class="error-state">
            <h2>Unable to load jobs</h2>
            <p>{error.message}</p>
            <button onclick={refresh}>Retry</button>
          </div>
        {/snippet}

        {#snippet empty()}
          <div class="empty-state">
            <div class="empty-state-icon">💼</div>
            <h2>No jobs yet for this client</h2>
          </div>
        {/snippet}

        {#snippet content({ data })}
          {@const filteredJobs = applyFilters(data)}
          {#if filteredJobs.length === 0}
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h2>No jobs match your filters</h2>
              <p>Try adjusting your filters or search criteria.</p>
            </div>
          {:else}
            <div class="jobs-list">
              {#each filteredJobs as job (job.id)}
                <JobCard {job} showClient={false} />
              {/each}
            </div>
          {/if}
        {/snippet}
      </ReactiveView>
    {:else}
      <!-- Loading client -->
      <LoadingSkeleton type="job-card" count={6} />
    {/if}
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

  .jobs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Error state styles */
  .error-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .error-state h2 {
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .error-state p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0 0 16px 0;
  }

  .error-state button {
    padding: 8px 16px;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .error-state button:hover {
    background-color: var(--accent-blue-hover, #0051d5);
  }

  /* Empty state styles */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-state h2 {
    color: var(--text-secondary, #86868b);
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }

  .empty-state p {
    color: var(--text-tertiary, #98989d);
    font-size: 14px;
    margin: 8px 0 0 0;
  }
</style>
