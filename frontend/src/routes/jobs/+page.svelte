<script lang="ts">
  // import { page } from '$app/stores';
  import { invalidateAll } from '$app/navigation';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  // Create the query using the factory from the load function
  $: query = data.queryFactory();

  // Reactive statements for query state
  $: isLoading = $query.isLoading;
  $: error = $query.error;
  $: jobs = $query.data?.jobs || [];
  $: meta = $query.data?.meta;
  // $: links = $query.data?.links;

  // Handle retry
  function handleRetry() {
    $query.refetch();
  }

  // Handle refresh
  function handleRefresh() {
    invalidateAll();
    $query.refetch();
  }
</script>

<svelte:head>
  <title>Jobs - bŏs</title>
</svelte:head>

<AppLayout>
<div class="jobs-container">
  <!-- Page Header -->
  <div class="page-header">
    <h1>Jobs</h1>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="jobs-list">
      <LoadingSkeleton type="job-card" count={5} />
    </div>

  <!-- Error State -->
  {:else if error}
    <div class="error-state">
      <div class="error-content">
        <h2>Unable to load jobs</h2>
        <p>There was a problem loading your jobs. Please try again.</p>
        <div class="error-details">
          <code>{error.message}</code>
        </div>
        <button 
          class="button button--primary"
          on:click={handleRetry}
        >
          Try Again
        </button>
      </div>
    </div>

  <!-- Jobs List -->
  {:else if jobs.length > 0}
    <div class="jobs-list">
      {#each jobs as job (job.id)}
        <JobCard {job} showClient={true} />
      {/each}
    </div>

    <!-- Pagination Info -->
    {#if meta}
      <div class="pagination-info">
        <p>
          Showing {jobs.length} of {meta.total} jobs
          {#if meta.total_pages > 1}
            (Page {meta.page} of {meta.total_pages})
          {/if}
        </p>
      </div>
    {/if}

  <!-- Empty State -->
  {:else}
    <div class="empty-state-wrapper">
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h2>No jobs found</h2>
        <p>There are currently no jobs to display.</p>
      </div>
    </div>
  {/if}
</div>
</AppLayout>

<style>
  .jobs-container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .jobs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 40px 20px;
  }

  .error-content {
    text-align: center;
    max-width: 400px;
  }

  .error-content h2 {
    color: var(--text-primary);
    margin-bottom: 12px;
    font-size: 24px;
  }

  .error-content p {
    color: var(--text-secondary);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .error-details {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 12px;
    margin: 16px 0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .error-details code {
    color: var(--text-secondary);
    font-size: 13px;
    word-break: break-word;
  }

  .pagination-info {
    margin-top: 24px;
    padding: 16px 0;
    text-align: center;
    border-top: 1px solid var(--border-primary);
  }

  .pagination-info p {
    color: var(--text-tertiary);
    font-size: 14px;
    margin: 0;
  }

  /* Responsive layout */
  @media (max-width: 768px) {
    .jobs-container {
      padding: 16px;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .page-header h1 {
      font-size: 24px;
    }

    .page-header__actions {
      width: 100%;
    }

    .page-header__actions .button {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .jobs-container {
      padding: 12px;
    }

    .error-content h2 {
      font-size: 20px;
    }

    .error-content p {
      font-size: 14px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .jobs-list {
      gap: 12px;
    }

    .error-details {
      border-width: 2px;
    }
  }
</style>