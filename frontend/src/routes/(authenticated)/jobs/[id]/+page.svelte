<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  // Epic-009: Import ReactiveJob for Rails-style includes()
  import { ReactiveJob } from '$lib/models/reactive-job';
  import { ReactiveClient } from '$lib/models/reactive-client';
  import { Job } from '$lib/models/job';
  import { taskFilterActions, shouldShowTask } from '$lib/stores/taskFilter.svelte';
  import { toastStore } from '$lib/stores/toast.svelte';

  // ✨ NEW: Use ReactiveQuery for automatic Svelte reactivity
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobDetailView from '$lib/components/jobs/JobDetailView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';

  // ✨ Route Detection Logic: Detect if this is "new" job creation mode
  const isNewJobMode = $derived($page.params.id === 'new');
  const jobId = $derived(!isNewJobMode ? $page.params.id : null);
  const clientId = $derived(isNewJobMode ? $page.url.searchParams.get('clientId') : null);

  // ✨ Conditional Data Loading: Job query for regular jobs
  const jobQuery = $derived(
    !isNewJobMode && jobId
      ? ReactiveJob.includes('client')
          .includes('tasks', { orderBy: ['position', 'created_at'] })
          .includes('jobAssignments')
          .find(jobId)
      : null
  );

  // ✨ Conditional Data Loading: Client query for new job creation
  const clientQuery = $derived(isNewJobMode && clientId ? ReactiveClient.find(clientId) : null);

  // ✨ Create mock job object for new job creation mode
  const newJobMock = $derived(
    isNewJobMode && clientQuery?.data
      ? {
          id: null, // Indicates this is a new job
          title: '', // Start empty, EditableTitle will handle in creation mode
          status: 'active',
          priority: 'medium',
          client_id: clientId,
          client: clientQuery.data,
          tasks: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : null
  );

  // ✨ Unified job object: use mock for creation mode, real data for regular jobs
  const job = $derived(isNewJobMode ? newJobMock : jobQuery?.data);
  const isLoading = $derived(
    isNewJobMode
      ? (clientQuery?.isLoading ?? true) ||
          clientQuery?.resultType === 'loading' ||
          clientQuery?.resultType === 'unknown'
      : (jobQuery?.isLoading ?? true) ||
          jobQuery?.resultType === 'loading' ||
          jobQuery?.resultType === 'unknown'
  );
  const error = $derived(isNewJobMode ? clientQuery?.error : jobQuery?.error);
  const resultType = $derived(
    isNewJobMode ? (clientQuery?.resultType ?? 'loading') : (jobQuery?.resultType ?? 'loading')
  );

  // ✨ Page Title Logic: Different titles for creation vs viewing
  const pageTitle = $derived(
    isNewJobMode
      ? clientQuery?.data
        ? `New Job for ${clientQuery.data.name} - bŏs`
        : 'New Job - bŏs'
      : job
        ? `${job.title || 'Job'} - bŏs`
        : 'Job Details - bŏs'
  );

  // ✨ Pass job to AppLayout once loaded (for client display in sidebar)
  const currentJobForLayout = $derived(job);

  // ✨ NOTES: Will be loaded via job associations for now
  // TODO: Implement separate NotesReactive query when needed
  const notes = $derived(job?.notes || []);
  const notesLoading = $derived(false); // Notes load with job for now

  // ✨ DUAL QUERY PATTERN:
  // keptTasks: All non-discarded tasks (for positioning calculations)
  const keptTasks = $derived(job?.tasks?.filter((t) => !t.discarded_at) || []);

  // displayedTasks: Tasks matching current filters (for UI rendering)
  const displayedTasks = $derived(job?.tasks?.filter(shouldShowTask) || []);

  // ✨ TASK BATCH DETAILS: Based on displayed tasks (what user sees)
  const taskBatchDetails = $derived(
    displayedTasks.length > 0
      ? {
          total: displayedTasks.length,
          completed: displayedTasks.filter((task) => task.status === 'completed').length,
          pending: displayedTasks.filter((task) => task.status === 'pending').length,
          in_progress: displayedTasks.filter((task) => task.status === 'in_progress').length,
        }
      : undefined
  );

  // ✨ USE $effect FOR SIDE EFFECTS (NOT REACTIVE STATEMENTS)
  $effect(() => {
    if (error) {
      console.error('[JobPage] Job loading error:', error.message);
    }
  });

  // 🔍 DEBUG: Track loading state transitions to identify flash cause
  let loadingStartTime = Date.now();
  $effect(() => {
    const now = Date.now();
    const elapsed = now - loadingStartTime;

    // eslint-disable-next-line no-console
    console.log(`🔍 [JobView Debug] Loading state change:`, {
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}ms`,
      isLoading,
      hasJob: !!job,
      jobId: job?.id || 'null',
      resultType,
      isNewJobMode,

      // ReactiveQuery states
      jobQueryLoading: jobQuery?.isLoading,
      jobQueryResultType: jobQuery?.resultType,
      jobQueryHasData: !!jobQuery?.data,

      clientQueryLoading: clientQuery?.isLoading,
      clientQueryResultType: clientQuery?.resultType,
      clientQueryHasData: !!clientQuery?.data,
    });
  });

  // 🔍 DEBUG: Track job data changes specifically
  $effect(() => {
    if (job) {
      // eslint-disable-next-line no-console
      console.log(`🔍 [JobView Debug] Job data populated:`, {
        timestamp: new Date().toISOString(),
        jobId: job.id,
        title: job.title,
        hasClient: !!job.client,
        clientName: job.client?.name,
        tasksCount: job.tasks?.length || 0,
        resultType,
      });
    } else {
      // eslint-disable-next-line no-console
      console.log(`🔍 [JobView Debug] Job data is null:`, {
        timestamp: new Date().toISOString(),
        isLoading,
        resultType,
        isNewJobMode,
      });
    }
  });

  // 🔍 DEBUG: Track specific transitions that might cause flash
  $effect(() => {
    if (!isLoading && !job && resultType !== 'complete') {
      console.warn(`🚨 [JobView Debug] POTENTIAL FLASH STATE:`, {
        timestamp: new Date().toISOString(),
        isLoading: false,
        hasJob: false,
        resultType,
        message: 'Not loading but no job data - this might cause empty flash!',
      });
    }
  });

  // Note: No need to clear layout store since we're not using it anymore

  // ✨ Creation Handler: Handle job title save (creation)
  async function handleJobTitleSave(newTitle: string) {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      toastStore.error('Please give this job a name');
      return Promise.reject(new Error('Job title is required'));
    }

    try {
      const createdJob = await Job.create({
        title: trimmedTitle,
        client_id: clientId,
        status: 'active',
        priority: 'medium',
      });

      // Navigate to the newly created job
      goto(`/jobs/${createdJob.id}`);
      return createdJob;
    } catch (error) {
      console.error('Failed to create job:', error);
      toastStore.error('Failed to create job. Please try again.');
      throw error;
    }
  }

  // ✨ Cancel Handler: Handle cancel action in creation mode
  function handleCancel() {
    goto(`/clients/${clientId}/jobs`);
  }

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

  // Zero.js handles all retries and refreshes automatically
  // No manual retry logic needed - trust Zero's built-in resilience
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout
  currentJob={currentJobForLayout}
  currentClient={isNewJobMode ? clientQuery?.data : undefined}
  toolbarDisabled={isNewJobMode}
>
  <div class="job-detail-container">
    <!-- 🔍 DEBUG: Visual indicators for state tracking -->
    {#if import.meta.env.DEV}
      <div class="debug-indicator">
        🔍 Debug: isLoading={isLoading}, hasJob={!!job}, resultType={resultType}
      </div>
    {/if}

    <!-- Loading State -->
    {#if isLoading}
      <div class="job-detail-loading">
        {#if import.meta.env.DEV}
          <!-- eslint-disable-next-line no-console -->
          {console.log('🔍 [JobView Debug] RENDERING: Loading skeleton')}
        {/if}
        <LoadingSkeleton type="job-detail" />
      </div>

      <!-- Error State -->
    {:else if error}
      <div class="error-state">
        <div class="error-content">
          <h2>{isNewJobMode ? 'Client not found' : 'Unable to load job'}</h2>
          <p>
            {isNewJobMode
              ? 'The specified client could not be found.'
              : 'There was a problem loading this job. Please try again.'}
          </p>
          {#if error.message}
            <div class="error-details">
              <code>{error.message}</code>
            </div>
          {/if}
          <div class="error-actions">
            {#if !isNewJobMode}
              <p>Zero.js will automatically retry the connection.</p>
            {/if}
            <button
              class="button button--{isNewJobMode ? 'primary' : 'secondary'}"
              onclick={isNewJobMode ? () => goto('/clients') : handleBack}
            >
              {isNewJobMode ? 'Back to Clients' : 'Back to Jobs'}
            </button>
          </div>
        </div>
      </div>

      <!-- Job Detail Content -->
    {:else if job}
      {#if import.meta.env.DEV}
        <!-- eslint-disable-next-line no-console -->
        {console.log('🔍 [JobView Debug] RENDERING: Job content', {
          jobId: job.id,
          title: job.title,
        })}
      {/if}
      <JobDetailView
        job={isNewJobMode ? job : { ...job, tasks: displayedTasks }}
        keptTasks={isNewJobMode ? [] : keptTasks}
        batchTaskDetails={isNewJobMode ? undefined : taskBatchDetails}
        notes={isNewJobMode ? [] : notes}
        notesLoading={isNewJobMode ? false : notesLoading}
        {isNewJobMode}
        onJobTitleSave={isNewJobMode ? handleJobTitleSave : undefined}
        onCancel={isNewJobMode ? handleCancel : undefined}
      />

      <!-- Not Found State - Zero.js pattern: Only show when complete with no job -->
    {:else if !job && resultType === 'complete'}
      {#if import.meta.env.DEV}
        <!-- eslint-disable-next-line no-console -->
        {console.log('🔍 [JobView Debug] RENDERING: Not found state')}
      {/if}
      <div class="error-state">
        <div class="error-content">
          <h2>{isNewJobMode ? 'Client not found' : 'Job not found'}</h2>
          <p>
            {isNewJobMode
              ? 'The specified client could not be found.'
              : 'The requested job could not be found.'}
          </p>
          <button
            class="button button--primary"
            onclick={isNewJobMode ? () => goto('/clients') : handleBack}
          >
            {isNewJobMode ? 'Back to Clients' : 'Back to Jobs'}
          </button>
        </div>
      </div>

      <!-- 🔍 DEBUG: Catch-all state to identify unexpected conditions -->
    {:else if import.meta.env.DEV}
      <!-- eslint-disable-next-line no-console -->
      {console.warn('🚨 [JobView Debug] RENDERING: Unexpected state (potential flash!)', {
        isLoading,
        hasJob: !!job,
        resultType,
        jobQueryState: jobQuery
          ? {
              isLoading: jobQuery.isLoading,
              resultType: jobQuery.resultType,
              hasData: !!jobQuery.data,
            }
          : 'null',
      })}
      <div class="debug-unexpected-state">🚨 Unexpected state - check console for details</div>
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

  /* 🔍 DEBUG: Visual indicators styling */
  .debug-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(255, 255, 0, 0.9);
    color: black;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    z-index: 9999;
    border: 2px solid orange;
  }

  .debug-unexpected-state {
    background: rgba(255, 0, 0, 0.9);
    color: white;
    padding: 20px;
    text-align: center;
    font-weight: bold;
    border: 3px solid red;
    margin: 20px;
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
