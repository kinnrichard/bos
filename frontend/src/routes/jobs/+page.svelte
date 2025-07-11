<script lang="ts">
  import { page } from '$app/stores';
  import { getZeroContext } from '$lib/zero-context.svelte';
  import { fZero } from '$lib/zero/runes.svelte';

  // Get Zero functions from context - no imports needed!
  const { Job } = getZeroContext();
  
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import type { JobStatus, JobPriority } from '$lib/types/job';

  // ✨ USE $derived FOR QUERY PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const url = $derived($page.url);
  const scope = $derived(url.searchParams.get('scope') || 'all');
  const status = $derived(url.searchParams.get('status') as JobStatus | undefined);
  const priority = $derived(url.searchParams.get('priority') as JobPriority | undefined);

  // ✨ USE CUSTOM fZero RUNE FOR ZERO NATIVE REACTIVITY  
  const jobsQuery = fZero(() => Job.queryBuilder(), []);
  
  // ✨ USE $derived FOR DATA TRANSFORMATIONS (NOT IMPERATIVE UPDATES)
  const allJobs = $derived(
    jobsQuery.data.map(transformZeroJobToPopulatedJob)
  );
  
  // Transform Zero job data to PopulatedJob format expected by JobCard
  function transformZeroJobToPopulatedJob(zeroJob: any): any {
    return {
      id: zeroJob.id,
      type: 'jobs',
      attributes: {
        title: zeroJob.title || 'Untitled Job',
        description: zeroJob.description,
        status: mapZeroStatusToString(zeroJob.status),
        priority: mapZeroPriorityToString(zeroJob.priority),
        due_on: zeroJob.due_at ? new Date(zeroJob.due_at).toISOString().split('T')[0] : undefined,
        start_on: zeroJob.starts_at ? new Date(zeroJob.starts_at).toISOString().split('T')[0] : undefined,
        created_at: new Date(zeroJob.created_at).toISOString(),
        updated_at: new Date(zeroJob.updated_at).toISOString(),
        status_label: mapZeroStatusToString(zeroJob.status),
        priority_label: mapZeroPriorityToString(zeroJob.priority),
        is_overdue: false, // TODO: Calculate this
        task_counts: { total: 0, completed: 0, pending: 0, in_progress: 0 } // TODO: Get actual counts
      },
      client: {
        id: zeroJob.client_id || 'unknown',
        name: 'Unknown Client' // TODO: Load client data
      },
      created_by: {
        id: zeroJob.created_by_id || 'unknown',
        name: 'Unknown User' // TODO: Load user data
      },
      technicians: [], // TODO: Load technician data
      tasks: [] // TODO: Load task data
    };
  }
  
  // Map Zero's numeric status to string
  function mapZeroStatusToString(status: number | null): string {
    // TODO: Get actual mapping from backend or create enum mapping
    const statusMap: Record<number, string> = {
      0: 'open',
      1: 'in_progress',
      2: 'waiting_for_customer',
      3: 'waiting_for_scheduled_appointment', 
      4: 'paused',
      5: 'successfully_completed',
      6: 'cancelled'
    };
    return statusMap[status || 0] || 'open';
  }
  
  // Map Zero's numeric priority to string
  function mapZeroPriorityToString(priority: number | null): string {
    const priorityMap: Record<number, string> = {
      0: 'low',
      1: 'normal', 
      2: 'high',
      3: 'critical',
      4: 'proactive_followup'
    };
    return priorityMap[priority || 1] || 'normal';
  }

  // ✨ USE $derived FOR FILTERING (NOT REACTIVE STATEMENTS)
  const filteredJobs = $derived(
    allJobs.filter(job => {
      if (scope === 'mine') {
        // This would need user context to filter "my" jobs
        // For now, show all jobs
        return true;
      }
      return true;
    })
  );

  // ✨ USE $derived FOR FINAL FILTERING (NOT REACTIVE STATEMENTS)
  const jobs = $derived(
    filteredJobs.filter(job => {
      if (priority && job.priority !== priority) {
        return false;
      }
      return true;
    })
  );

  // Debug Zero query state (only when needed)
  // $: console.log('[JOBS PAGE] Zero query state:', {
  //   hasValue: jobsQuery ? !!jobsQuery.value : false,
  //   allJobsCount: allJobs.length,
  //   filteredCount: filteredJobs.length,
  //   finalCount: jobs.length,
  //   firstJob: jobs[0]
  // });

  // Handle retry - Zero automatically retries with native reactivity
  function handleRetry() {
    // Zero rune automatically stays in sync via addListener
    // Manual refresh not needed with native reactivity
    console.log('🔄 Jobs page retry requested - Zero rune will auto-sync');
  }

  // Handle refresh - Zero automatically stays fresh with native reactivity
  function handleRefresh() {
    // Zero queries auto-refresh in real-time via addListener
    console.log('🔄 Jobs page refresh requested - Zero rune provides real-time updates');
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
  {#if jobsQuery.isLoading}
    <div class="jobs-list">
      <LoadingSkeleton type="job-card" count={5} />
    </div>

  <!-- Error State -->
  {:else if jobsQuery.error}
    <div class="error-state">
      <div class="error-content">
        <h2>Unable to load jobs</h2>
        <p>There was a problem loading your jobs. Please try again.</p>
        <div class="error-details">
          <code>{jobsQuery.error.message}</code>
        </div>
        <button 
          class="button button--primary"
          onclick={handleRetry}
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

    <!-- Jobs Count Info -->
    <div class="jobs-info">
      <p>
        Showing {jobs.length} jobs
      </p>
    </div>

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

  .jobs-info {
    margin-top: 24px;
    padding: 16px 0;
    text-align: center;
    border-top: 1px solid var(--border-primary);
  }

  .jobs-info p {
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