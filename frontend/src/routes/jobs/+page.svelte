<script lang="ts">
  import { page } from '$app/stores';
  // Import reactive factory and job configuration for creating reactive model
  import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
  import { jobConfig, type JobType } from '$lib/models/generated/job';

  // ✨ NEW: Use factory-based ReactiveRecord for automatic Svelte reactivity
  // Automatically stays in sync with Zero.js data changes
  
  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import type { JobStatus, JobPriority } from '$lib/types/job';

  // ✨ USE $derived FOR QUERY PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const url = $derived($page.url);
  const scope = $derived(url.searchParams.get('scope') || 'all');
  const status = $derived(url.searchParams.get('status') as JobStatus | undefined);
  const priority = $derived(url.searchParams.get('priority') as JobPriority | undefined);
  const technicianId = $derived(url.searchParams.get('technician_id') || undefined);

  // ✨ CREATE REACTIVE MODEL IN SVELTE COMPONENT (where $state runes are available)
  const JobReactive = ModelFactory.createReactiveModel<JobType>(jobConfig);
  
  // ✨ USE RAILS-STYLE INCLUDES FOR RELATIONSHIPS (loads client data)
  const jobsQuery = JobReactive.includes('client').all();
  
  // ✨ USE $derived FOR DIRECT ZERO DATA ACCESS (NO TRANSFORMATION NEEDED)
  const allJobs = $derived(jobsQuery.data || []);
  
  // ✨ ZERO NATIVE OBJECTS: No transformation needed!

  // ✨ USE $derived FOR FILTERING WITH ZERO NATIVE STRUCTURE
  const filteredJobs = $derived(
    allJobs.filter((job: JobType) => {
      if (scope === 'mine') {
        // TODO: Filter by current user via job assignments
        // For now, show all jobs
        return true;
      }
      return true;
    })
  );

  // ✨ USE $derived FOR FINAL FILTERING WITH TECHNICIAN SUPPORT
  const jobs = $derived(
    filteredJobs.filter((job: JobType) => {
      // Filter by technician if specified
      if (technicianId) {
        const hasMatchingTechnician = job.jobAssignments?.some((assignment: any) => 
          assignment.user?.id === technicianId
        );
        if (!hasMatchingTechnician) {
          return false;
        }
      }

      // TODO: Add proper priority filtering using Zero's numeric priority field
      // Priority filtering would need to map from string to number
      return true;
    })
  );

  // Debug Zero query state (only when needed)
  // $: console.log('[JOBS PAGE] Zero native query state:', {
  //   isLoading: jobsQuery.isLoading,
  //   hasError: !!jobsQuery.error,
  //   allJobsCount: allJobs.length,
  //   filteredCount: filteredJobs.length,
  //   finalCount: jobs.length,
  //   firstJobTitle: jobs[0]?.title,
  //   firstJobClient: jobs[0]?.client?.name,
  //   firstJobTechnicians: jobs[0]?.jobAssignments?.map((ja: any) => ja.user?.name)
  // });

  // Handle retry - Factory-based ReactiveRecord uses Zero's native reactivity
  function handleRetry() {
    // ReactiveRecord automatically stays in sync via Zero.js addListener
    // Manual refresh available if needed
    jobsQuery.refresh();
    console.log('🔄 Jobs page retry requested - ReactiveRecord refreshed');
  }

  // Handle refresh - Factory-based ReactiveRecord stays fresh automatically
  function handleRefresh() {
    // ReactiveRecord provides real-time updates via Zero.js addListener
    console.log('🔄 Jobs page refresh requested - ReactiveRecord provides real-time updates');
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
    
    <!-- Technician Filter -->
    {#if technicianId}
      <div class="filter-info">
        <span class="filter-label">Filtered by technician</span>
        <a href="/jobs" class="clear-filter">Clear filter</a>
      </div>
    {/if}
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

  .filter-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    background-color: var(--bg-tertiary);
    border-radius: 6px;
    border: 1px solid var(--border-primary);
  }

  .filter-label {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .clear-filter {
    font-size: 14px;
    color: var(--accent-blue);
    text-decoration: none;
  }

  .clear-filter:hover {
    text-decoration: underline;
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