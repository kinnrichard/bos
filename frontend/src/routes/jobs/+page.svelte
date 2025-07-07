<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';
  import { createQuery } from '@tanstack/svelte-query';
  import { jobsService } from '$lib/api/jobs';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import type { JobStatus, JobPriority } from '$lib/types/job';

  // Extract query parameters for filtering
  $: url = $page.url;
  $: scope = url.searchParams.get('scope') || 'all';
  $: status = url.searchParams.get('status') as JobStatus | undefined;
  $: priority = url.searchParams.get('priority') as JobPriority | undefined;
  $: currentPage = parseInt(url.searchParams.get('page') || '1');
  $: per_page = parseInt(url.searchParams.get('per_page') || '20');

  // Create the query on the client side only
  $: query = browser ? createQuery({
    queryKey: ['jobs', { scope, status, priority, page: currentPage, per_page }],
    queryFn: async () => {
      const response = await jobsService.getJobsWithScope({
        scope: scope as 'all' | 'mine',
        status,
        priority,
        page: currentPage,
        per_page,
        include: 'client,technicians,tasks' // Include related data
      });
      
      // Populate the jobs with relationship data
      const populatedJobs = jobsService.populateJobs(response);
      
      console.log('JOBS PAGE: Raw response from API:', response);
      console.log('JOBS PAGE: Populated jobs:', populatedJobs);
      console.log('JOBS PAGE: Job technicians:', populatedJobs.map(job => ({
        jobId: job.id,
        title: job.attributes.title,
        technicians: job.technicians || []
      })));
      
      return {
        jobs: populatedJobs,
        meta: response.meta,
        links: response.links
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  }) : null;

  // Reactive statements for query state
  $: isLoading = $query?.isLoading || false;
  $: error = $query?.error;
  $: jobs = $query?.data?.jobs || [];
  $: meta = $query?.data?.meta;
  // $: links = $query.data?.links;

  // Handle retry
  function handleRetry() {
    $query?.refetch();
  }

  // Handle refresh
  function handleRefresh() {
    $query?.refetch();
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

  .page-header {
    margin-bottom: 24px;
  }

  .page-header h1 {
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

  .empty-state-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    padding: 40px 20px;
  }

  .empty-state {
    text-align: center;
    max-width: 400px;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h2 {
    color: var(--text-primary);
    margin-bottom: 12px;
    font-size: 24px;
  }

  .empty-state p {
    color: var(--text-secondary);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .button {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .button--primary {
    background: var(--accent-blue);
    color: white;
  }

  .button--primary:hover {
    background: var(--accent-blue-hover);
  }

  .button--primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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