<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { createQuery } from '@tanstack/svelte-query';
  import { jobsService } from '$lib/api/jobs';
  import { useTaskBatchDetailsQuery } from '$lib/api/hooks/tasks';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import { layoutActions } from '$lib/stores/layout.svelte';

  // Get job ID from URL params
  $: jobId = $page.params.id;

  // Create the query on the client side only
  $: query = browser && jobId ? createQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      console.log('[JobPage] Executing query with key:', ['job', jobId]);
      const response = await jobsService.getJobWithDetails(jobId);
      console.log('[JobPage] Query response received:', JSON.parse(JSON.stringify(response)));
      
      // Check if this is a wrapped response from the API directly vs populated response
      if (response && typeof response === 'object' && 'data' in response && !('client' in response)) {
        console.log('[JobPage] Got wrapped JSON:API response, extracting and using raw data');
        console.log('[JobPage] Raw job data:', (response as any).data);
        // Return the raw job data - it's in JSON:API format but better than wrapped
        return (response as any).data;
      }
      
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry 404s or 403s
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  }) : null;

  // Background fetch for task batch details - enabled only after job loads successfully
  $: taskBatchDetailsQuery = useTaskBatchDetailsQuery(jobId, !!job && !isLoading);

  // Reactive statements for query state
  $: isLoading = $query?.isLoading || false;
  $: error = $query?.error;
  $: job = $query?.data;
  
  // Debug logging for query state changes
  $: if (typeof isLoading !== 'undefined') {
    console.log('[JobPage] Query state changed:', {
      isLoading,
      hasError: !!error,
      hasJob: !!job,
      jobId: jobId
    });
    if (job) {
      console.log('[JobPage] CURRENT job data structure:', JSON.parse(JSON.stringify(job)));
      console.log('[JobPage] Job title from data:', job?.attributes?.title);
      console.log('[JobPage] Job client from data:', job?.client?.name);
    }
  }

  // Update current job in layout store when job data changes
  // Only update with actual data, preserve existing data during cache invalidation
  $: if (job) {
    console.log('[JobPage] Setting current job in layout store:', JSON.parse(JSON.stringify(job)));
    layoutActions.setCurrentJob(job);
  }

  // Clear current job when component is destroyed (leaving page)
  onDestroy(() => {
    layoutActions.setCurrentJob(null);
  });

  // Handle back navigation
  function handleBack() {
    goto('/jobs');
  }

  // Handle retry
  function handleRetry() {
    $query?.refetch();
  }
</script>

<svelte:head>
  <title>{job ? `${job.attributes?.title || 'Job'} - bŏs` : 'Job Details - bŏs'}</title>
</svelte:head>

<AppLayout>
<div class="job-detail-container">

  <!-- Loading State -->
  {#if isLoading}
    <div class="job-detail-loading">
      <LoadingSkeleton type="job-detail" />
    </div>

  <!-- Error State -->
  {:else if error}
    <div class="error-state">
      <div class="error-content">
        <h2>Unable to load job</h2>
        <p>There was a problem loading this job. Please try again.</p>
        {#if error.message}
          <div class="error-details">
            <code>{error.message}</code>
          </div>
        {/if}
        <div class="error-actions">
          <button 
            class="button button--primary"
            on:click={handleRetry}
          >
            Try Again
          </button>
          <button 
            class="button button--secondary"
            on:click={handleBack}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    </div>

  <!-- Job Detail Content -->
  {:else if job}
    <JobDetailView {job} batchTaskDetails={$taskBatchDetailsQuery?.data} />

  <!-- Fallback (should not happen with proper loading states) -->
  {:else}
    <div class="error-state">
      <div class="error-content">
        <h2>Job not found</h2>
        <p>The requested job could not be found.</p>
        <button 
          class="button button--primary"
          on:click={handleBack}
        >
          Back to Jobs
        </button>
      </div>
    </div>
  {/if}
</div>
</AppLayout>

<style>
  .job-detail-container {
    padding: 0 24px;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 100vh;
  }


  .job-detail-loading {
    padding: 20px 0;
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

  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 20px;
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

  .button--secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
  }

  .button--secondary:hover {
    background: var(--bg-quaternary);
  }

  /* Responsive layout */
  @media (max-width: 768px) {
    .job-detail-container {
      padding: 16px;
    }


    .error-actions {
      flex-direction: column;
    }

    .error-content h2 {
      font-size: 20px;
    }

    .error-content p {
      font-size: 14px;
    }
  }

  @media (min-width: 768px) {
    .error-actions {
      flex-direction: row;
      justify-content: center;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .error-details {
      border-width: 2px;
    }
  }
</style>