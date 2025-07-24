<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  // Epic-009: Import ReactiveJob for Rails-style includes()
  import { ReactiveJob } from '$lib/models/reactive-job';
  import type { JobData } from '$lib/models/types/job-data';
  import { taskFilterActions, shouldShowTask } from '$lib/stores/taskFilter.svelte';

  // ✨ NEW: Use ReactiveQuery for automatic Svelte reactivity
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';

  // ✨ USE $derived FOR URL PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const jobId = $derived($page.params.id);
  
  
  // ✨ Epic-009: Use ReactiveJob with Rails-style includes() - proper chained pattern
  // Filter tasks to exclude deleted ones (discarded_at IS NULL)
  const jobQuery = $derived(jobId ? ReactiveJob
    .includes('client')
    .includes('tasks')
    .includes('jobAssignments')
    .find(jobId) : null);
  // TODO: Add notes query when NotesReactive model is ready
  // const notesQuery = $derived(NotesReactive.where({ notable_id: jobId }));
  
  // ✨ USE $derived FOR DYNAMIC TITLE
  const pageTitle = $derived(job ? `${job.title || 'Job'} - bŏs` : 'Job Details - bŏs');

  // ✨ USE ReactiveQuery GETTERS FOR PROPER SVELTE 5 REACTIVITY
  const job = $derived(jobQuery?.data);
  const isLoading = $derived(jobQuery?.isLoading ?? true);
  const error = $derived(jobQuery?.error);
  const resultType = $derived(jobQuery?.resultType ?? 'loading');
  
  // ✨ Pass job to AppLayout once loaded (for client display in sidebar)
  const currentJobForLayout = $derived(job);

  
  // ✨ NOTES: Will be loaded via job associations for now
  // TODO: Implement separate NotesReactive query when needed
  const notes = $derived(job?.notes || []);
  const notesLoading = $derived(false); // Notes load with job for now

  // ✨ Filter out discarded tasks
  const keptTasks = $derived(job?.tasks?.filter(t => !t.discarded_at) || []);
  
  // ✨ TASK BATCH DETAILS: Extract from Zero job relationships (filtered tasks only)
  const taskBatchDetails = $derived(keptTasks.length > 0 ? {
    total: keptTasks.length,
    completed: keptTasks.filter((task: any) => task.status === 'completed').length,
    pending: keptTasks.filter((task: any) => task.status === 'pending').length,
    in_progress: keptTasks.filter((task: any) => task.status === 'in_progress').length
  } : undefined);
  
  // ✨ USE $effect FOR SIDE EFFECTS (NOT REACTIVE STATEMENTS)  
  $effect(() => {
    if (error) {
      console.error('[JobPage] Job loading error:', error.message);
    }
  });

  // Note: No need to clear layout store since we're not using it anymore

  // Handle back navigation
  function handleBack() {
    // Reset filters when navigating away from job detail
    taskFilterActions.clearSearch();
    goto('/jobs');
  }

  // Reset filters when component unmounts (user navigates away)
  onDestroy(() => {
    taskFilterActions.clearSearch();
  });

  // Handle retry - ReactiveQuery automatically syncs, manual refresh available
  function handleRetry() {
    if (jobQuery) {
      try {
        jobQuery.refresh();
      } catch (error) {
        console.error('[JobPage] Error during jobQuery refresh:', error);
      }
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout currentJob={currentJobForLayout}>
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
    <JobDetailView job={{...job, tasks: keptTasks}} batchTaskDetails={taskBatchDetails} {notes} notesLoading={notesLoading} />

  <!-- Not Found State - Zero.js pattern: Only show when complete with no job -->
  {:else if !job && resultType === 'complete'}
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
    padding: 3px 24px 0 24px;
    max-width: 1200px;
    margin: 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
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