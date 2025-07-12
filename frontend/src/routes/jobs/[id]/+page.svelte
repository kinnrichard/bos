<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import { getZeroContext } from '$lib/zero-context.svelte';

  // Get Zero functions from context
  const { Job } = getZeroContext();
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import { layoutActions } from '$lib/stores/layout.svelte';

  // ✨ USE $derived FOR URL PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const jobId = $derived($page.params.id);
  
  // ✨ USE $derived FOR REACTIVE QUERY - UPDATES WHEN jobId CHANGES
  const jobQuery = $derived(Job.find(jobId));
  
  // ✨ USE $derived FOR DYNAMIC TITLE
  const pageTitle = $derived(job ? `${job.attributes?.title || 'Job'} - bŏs` : 'Job Details - bŏs');

  // ✨ USE ReactiveQuery GETTERS FOR PROPER SVELTE 5 REACTIVITY
  const job = $derived(jobQuery.data);
  const isLoading = $derived(jobQuery.isLoading);
  const error = $derived(jobQuery.error);

  // TODO: Task batch details - need to implement Zero-based task query
  // For now, we'll pass undefined until tasks are fully migrated to Zero
  const taskBatchDetails = $derived(undefined);
  
  // ✨ USE $effect FOR SIDE EFFECTS (NOT REACTIVE STATEMENTS)
  $effect(() => {
    console.log('[JobPage] Job ID from URL params:', jobId);
    
    if (job) {
      console.log('[JobPage] Job data loaded via ReactiveQuery:', job?.title || job?.attributes?.title);
      console.log('[JobPage] Zero job structure:', job);
      
      // Update current job in layout store when job data changes
      console.log('[JobPage] Setting current job in layout store via ReactiveQuery');
      layoutActions.setCurrentJob(job);
    }
  });

  // Clear current job when component is destroyed (leaving page)
  onDestroy(() => {
    layoutActions.setCurrentJob(null);
  });

  // Handle back navigation
  function handleBack() {
    goto('/jobs');
  }

  // Handle retry - ReactiveQuery automatically syncs, manual refresh available
  function handleRetry() {
    console.log('[JobPage] ReactiveQuery auto-syncs via Zero addListener, manual refresh available');
    jobQuery.refresh();
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
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
            onclick={handleRetry}
          >
            Try Again
          </button>
          <button 
            class="button button--secondary"
            onclick={handleBack}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    </div>

  <!-- Job Detail Content -->
  {:else if job}
    <JobDetailView {job} batchTaskDetails={taskBatchDetails} />

  <!-- Fallback (should not happen with proper loading states) -->
  {:else}
    <div class="error-state">
      <div class="error-content">
        <h2>Job not found</h2>
        <p>The requested job could not be found.</p>
        <button 
          class="button button--primary"
          onclick={handleBack}
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