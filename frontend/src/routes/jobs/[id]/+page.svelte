<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  // Epic-008: Import ReactiveQuery for Jobs
  import { ReactiveQueryOne } from '$lib/zero/reactive-query.svelte';
  import { queryJobs } from '$lib/zero/model-queries';
  import type { JobData } from '$lib/models/types/job-data';

  // ✨ NEW: Use ReactiveQuery for automatic Svelte reactivity
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';

  // ✨ USE $derived FOR URL PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const jobId = $derived($page.params.id);
  
  // Debug job ID extraction
  $effect(() => {
    console.log('[JobPage] URL params:', $page.params);
    console.log('[JobPage] Extracted jobId:', jobId);
    console.log('[JobPage] Page route:', $page.route?.id);
  });
  
  // ✨ CREATE REACTIVE QUERY IN SVELTE COMPONENT (where $state runes are available)
  const jobQuery = $derived(jobId ? new ReactiveQueryOne<Job>(
    () => {
      console.log('[JobPage] Executing query for job:', jobId);
      
      // Test simple query first
      console.log('[JobPage] Testing simple query without includes...');
      const simpleResult = queryJobs().where('id', jobId).one();
      console.log('[JobPage] Simple query result:', simpleResult);
      
      // Test with includes
      console.log('[JobPage] Testing query with includes...');
      const result = queryJobs().includes('client', 'tasks', 'jobAssignments').where('id', jobId).one();
      console.log('[JobPage] Full query result:', result);
      return result;
    },
    null,
    '5m' // 5 minute TTL
  ) : null);
  // TODO: Add notes query when NotesReactive model is ready
  // const notesQuery = $derived(NotesReactive.where({ notable_id: jobId }));
  
  // ✨ USE $derived FOR DYNAMIC TITLE
  const pageTitle = $derived(job ? `${job.title || 'Job'} - bŏs` : 'Job Details - bŏs');

  // ✨ USE ReactiveQuery GETTERS FOR PROPER SVELTE 5 REACTIVITY
  const job = $derived(jobQuery?.data);
  const isLoading = $derived(jobQuery?.isLoading ?? true);
  const error = $derived(jobQuery?.error);

  // Track Zero.js query refresh cycles specifically  
  $effect(() => {
    if (jobQuery && job) {
      console.log('[JobPage] Zero.js query data update detected:', {
        jobId: job.id,
        status: job.status,
        queryIsLoading: isLoading,
        timestamp: Date.now(),
        queryRefreshCycle: true
      });
    }
  });
  
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
    console.log('[JobPage] Effect triggered - jobId:', jobId, 'jobQuery available:', !!jobQuery);
    
    if (jobQuery) {
      console.log('[JobPage] JobQuery state - loading:', isLoading, 'error:', !!error, 'data available:', !!job);
      console.log('[JobPage] Raw jobQuery.data:', jobQuery.data);
      console.log('[JobPage] Raw jobQuery.isLoading:', jobQuery.isLoading);
      console.log('[JobPage] Raw jobQuery.error:', jobQuery.error);
      
      // NEW: Track query data changes specifically
      if (job) {
        console.log('[JobPage] Query returned job with status:', {
          jobId: job.id,
          status: job.status,
          timestamp: Date.now(),
          isNewJobObject: true // This will help us see if objects are being replaced
        });
      }
    } else {
      console.log('[JobPage] No jobQuery - jobId present:', !!jobId);
    }
    
    if (job) {
      // ✨ USE $state.snapshot() TO SAFELY LOG REACTIVE STATE
      const jobSnapshot = $state.snapshot(job);
      console.log('[JobPage] Job data loaded with relationships:', {
        title: jobSnapshot.title,
        hasClient: !!jobSnapshot.client,
        clientName: jobSnapshot.client?.name,
        hasTasks: !!jobSnapshot.tasks,
        tasksCount: jobSnapshot.tasks?.length || 0,
        hasJobAssignments: !!jobSnapshot.jobAssignments,
        techniciansCount: jobSnapshot.jobAssignments?.length || 0,
        technicians: jobSnapshot.jobAssignments?.map((ja: any) => ja.user?.name).filter(Boolean) || []
      });
      
      // Detailed debugging for missing relationships
      if (!jobSnapshot.tasks) {
        console.warn('[JobPage] ⚠️ Tasks relationship not loaded - check .includes() configuration');
      }
      if (!jobSnapshot.jobAssignments) {
        console.warn('[JobPage] ⚠️ JobAssignments relationship not loaded - check .includes() configuration');
      }
      
      // ✨ USE $inspect FOR DEBUGGING REACTIVE STATE IN SVELTE 5
      $inspect('[JobPage] Zero job structure:', job);
      
      // Note: Job is now passed directly to AppLayout - no need for layout store
    } else if (!isLoading && !error) {
      console.warn('[JobPage] Job is null but not loading and no error - possible query issue');
    }
    
    if (error) {
      console.error('[JobPage] Job loading error:', error.message);
    }
    
    if (notes && notes.length > 0) {
      console.log('[JobPage] Notes loaded progressively:', notes.length);
    }
  });

  // Note: No need to clear layout store since we're not using it anymore

  // Handle back navigation
  function handleBack() {
    goto('/jobs');
  }

  // Handle retry - ReactiveQuery automatically syncs, manual refresh available
  function handleRetry() {
    console.log('[JobPage] Retry requested for jobQuery');
    if (jobQuery) {
      try {
        jobQuery.refresh();
        console.log('[JobPage] JobQuery refresh triggered successfully');
      } catch (error) {
        console.error('[JobPage] Error during jobQuery refresh:', error);
      }
    } else {
      console.warn('[JobPage] JobQuery not available for refresh - jobId may be missing');
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout currentJob={job}>
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