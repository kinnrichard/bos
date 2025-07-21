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
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import type { JobStatus, JobPriority } from '$lib/types/job';

  // Get client ID from URL
  const clientId = $derived($page.params.id);
  
  // Query for the client
  const clientQuery = $derived(clientId ? ReactiveClient.find(clientId) : null);
  const client = $derived(clientQuery?.data);
  const clientLoading = $derived(clientQuery?.isLoading ?? true);
  const clientError = $derived(clientQuery?.error);
  
  // Query for jobs filtered by client
  const jobsQuery = ReactiveJob
    .includes('client')
    .where({ client_id: clientId })
    .orderBy('created_at', 'desc')
    .all();
  
  // Get jobs data
  const jobs = $derived(jobsQuery.data || []);
  const isLoading = $derived(jobsQuery.isLoading);
  const error = $derived(jobsQuery.error);
  
  // Get query parameters for filtering (similar to main jobs page)
  const url = $derived($page.url);
  const status = $derived(url.searchParams.get('status') as JobStatus | undefined);
  const priority = $derived(url.searchParams.get('priority') as JobPriority | undefined);
  
  // Filter jobs by status/priority if specified
  const filteredJobs = $derived(
    jobs.filter((job: JobData) => {
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
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout currentClient={client}>
  <div class="client-jobs-page">
    <!-- Page Header -->
    <div class="page-header">
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
      <a href="/jobs/new?client_id={clientId}" class="new-job-button">
        <span class="button-icon">➕</span>
        New Job
      </a>
    </div>
    
    <!-- Jobs List -->
    <div class="jobs-content">
      {#if isLoading || clientLoading}
        <div class="loading-state">
          <LoadingSkeleton type="list" />
        </div>
      {:else if error || clientError}
        <div class="error-state">
          <p>Error loading jobs. Please try again.</p>
        </div>
      {:else if filteredJobs.length === 0}
        <div class="empty-state">
          <p class="empty-message">
            {#if jobs.length === 0}
              No jobs yet for this client
            {:else}
              No jobs match your filters
            {/if}
          </p>
          <a href="/jobs/new?client_id={clientId}" class="empty-action-button">
            <span class="button-icon">➕</span>
            Create First Job
          </a>
        </div>
      {:else}
        <div class="jobs-list">
          {#each filteredJobs as job (job.id)}
            <JobCard {job} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</AppLayout>

<style>
  .client-jobs-page {
    min-height: 100vh;
    background-color: var(--bg-black, #000);
  }
  
  /* Page Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 24px;
    border-bottom: 1px solid var(--border-primary, #38383A);
  }
  
  .header-content {
    flex: 1;
  }
  
  .breadcrumb {
    font-size: 14px;
    color: var(--text-secondary, #C7C7CC);
    margin-bottom: 8px;
  }
  
  .breadcrumb-link {
    color: var(--text-secondary, #C7C7CC);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  
  .breadcrumb-link:hover {
    color: var(--text-primary, #F2F2F7);
  }
  
  .breadcrumb-separator {
    margin: 0 8px;
    color: var(--text-tertiary, #8E8E93);
  }
  
  .breadcrumb-current {
    color: var(--text-primary, #F2F2F7);
  }
  
  .page-header h1 {
    font-size: 32px;
    font-weight: 600;
    color: var(--text-primary, #F2F2F7);
    margin: 0;
  }
  
  .new-job-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background-color: var(--accent-blue, #00A3FF);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
  }
  
  .new-job-button:hover {
    background-color: var(--accent-blue-hover, #0089E0);
  }
  
  .button-icon {
    font-size: 16px;
  }
  
  /* Content Area */
  .jobs-content {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  /* Jobs List */
  .jobs-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  /* States */
  .loading-state,
  .error-state {
    text-align: center;
    padding: 80px 20px;
    color: var(--text-secondary, #C7C7CC);
  }
  
  .empty-state {
    text-align: center;
    padding: 80px 20px;
  }
  
  .empty-message {
    font-size: 18px;
    color: var(--text-secondary, #C7C7CC);
    margin-bottom: 24px;
  }
  
  .empty-action-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background-color: var(--accent-blue, #00A3FF);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
  }
  
  .empty-action-button:hover {
    background-color: var(--accent-blue-hover, #0089E0);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }
    
    .new-job-button {
      justify-content: center;
    }
  }
</style>