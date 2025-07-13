<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  // Import reactive factory and job configuration for creating reactive model
  import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
  import { jobConfig, type Job } from '$lib/models/generated/job';

  // ✨ NEW: Use factory-based ReactiveRecord for automatic Svelte reactivity
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import { layoutActions } from '$lib/stores/layout.svelte';

  // ✨ USE $derived FOR URL PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const jobId = $derived($page.params.id);
  
  // ✨ CREATE REACTIVE MODEL IN SVELTE COMPONENT (where $state runes are available)
  const JobReactive = ModelFactory.createReactiveModel<Job>(jobConfig);
  
  // ✨ USE RAILS-STYLE INCLUDES WITH FIND (loads client, tasks, and related data)
  const jobQuery = $derived(JobReactive.includes('client', 'tasks').find(jobId));
  // TODO: Add notes query when NotesReactive model is ready
  // const notesQuery = $derived(NotesReactive.where({ notable_id: jobId }));
  
  // ✨ USE $derived FOR DYNAMIC TITLE
  const pageTitle = $derived(job ? `${job.title || 'Job'} - bŏs` : 'Job Details - bŏs');

  // ✨ USE ReactiveQuery GETTERS FOR PROPER SVELTE 5 REACTIVITY
  const job = $derived(jobQuery.data);
  const isLoading = $derived(jobQuery.isLoading);
  const error = $derived(jobQuery.error);
  
  // ✨ NOTES: Will be loaded via job associations for now
  // TODO: Implement separate NotesReactive query when needed
  const notes = $derived(job?.notes || []);
  const notesLoading = $derived(false); // Notes load with job for now

  // ✨ TASK BATCH DETAILS: Extract from Zero job relationships
  const taskBatchDetails = $derived(job?.tasks ? {
    total: job.tasks.length,
    completed: job.tasks.filter((task: any) => task.status === 'completed').length,
    pending: job.tasks.filter((task: any) => task.status === 'pending').length,
    in_progress: job.tasks.filter((task: any) => task.status === 'in_progress').length
  } : undefined);
  
  // ✨ USE $effect FOR SIDE EFFECTS (NOT REACTIVE STATEMENTS)
  $effect(() => {
    console.log('[JobPage] Job ID from URL params:', jobId);
    
    if (job) {
      console.log('[JobPage] Job data loaded via Zero relationships:', job.title);
      // ✨ USE $state.snapshot() FOR SVELTE 5 - AVOIDS $state PROXY WARNING
      console.log('[JobPage] Zero job structure:', $state.snapshot(job));
      console.log('[JobPage] Client:', job.client?.name);
      console.log('[JobPage] Tasks count:', job.tasks?.length);
      console.log('[JobPage] Technicians:', job.jobAssignments?.map((ja: any) => ja.user?.name));
      
      // Update current job in layout store when job data changes
      console.log('[JobPage] Setting current job in layout store via Zero relationships');
      layoutActions.setCurrentJob(job);
    }
    
    if (notes && notes.length > 0) {
      console.log('[JobPage] Notes loaded progressively:', notes.length);
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
    <JobDetailView {job} batchTaskDetails={taskBatchDetails} {notes} notesLoading={notesLoading} />

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