<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { createQuery } from '@tanstack/svelte-query';
  import { jobsService } from '$lib/api/jobs';
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import { layoutActions } from '$lib/stores/layout';

  // Get job ID from URL params
  $: jobId = $page.params.id;

  // Create the query on the client side only
  $: query = browser && jobId ? createQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await jobsService.getJobWithDetails(jobId);
      return response;
    },
    staleTime: 0, // Always refetch - no cache
    gcTime: 0, // Don't keep data in memory
    retry: (failureCount, error: any) => {
      // Don't retry 404s or 403s
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  }) : null;

  // Reactive statements for query state
  $: isLoading = $query?.isLoading || false;
  $: error = $query?.error;
  $: job = $query?.data;

  // Update current job in layout store when job data changes
  $: if (job) {
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
  <title>{job ? `${job.attributes.title} - bŏs` : 'Job Details - bŏs'}</title>
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
    <JobDetailView {job} />

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

  .page-navigation {
    margin-bottom: 24px;
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .back-button:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .back-arrow {
    font-size: 16px;
    font-weight: bold;
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

  /* Responsive layout */
  @media (max-width: 768px) {
    .job-detail-container {
      padding: 16px;
    }

    .page-navigation {
      margin-bottom: 16px;
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
    .back-button {
      border: 1px solid var(--border-primary);
    }

    .error-details {
      border-width: 2px;
    }
  }
</style>