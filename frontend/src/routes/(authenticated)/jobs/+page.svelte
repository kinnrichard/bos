<script lang="ts">
  import { page } from '$app/stores';
  // Epic-009: Import ReactiveJob for Rails-style includes()
  import { ReactiveJob } from '$lib/models/reactive-job';
  import type { JobData } from '$lib/models/types/job-data';
  import { shouldShowJob } from '$lib/stores/jobsSearch.svelte';

  // ✨ NEW: Use ReactiveQuery for automatic Svelte reactivity
  // Automatically stays in sync with Zero.js data changes

  import AppLayout from '$lib/components/layout/AppLayout.svelte';
  import JobsLayout from '$lib/components/jobs/JobsLayout.svelte';
  import ReactiveView from '$lib/reactive/ReactiveView.svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import JobCard from '$lib/components/jobs/JobCard.svelte';
  // import type { JobStatus, JobPriority } from '$lib/types/job';

  // ✨ USE $derived FOR QUERY PARAMETER EXTRACTION (NOT REACTIVE STATEMENTS)
  const url = $derived($page.url);
  const scope = $derived(url.searchParams.get('scope') || 'all');
  // const status = $derived(url.searchParams.get('status') as JobStatus | undefined);
  // const priority = $derived(url.searchParams.get('priority') as JobPriority | undefined);
  const technicianId = $derived(url.searchParams.get('technician_id') || undefined);

  // ✨ Epic-009: Use ReactiveJob with Rails-style includes()
  const jobsQuery = ReactiveJob.includes('client').orderBy('created_at', 'desc').all();

  // Function to apply all filters to the jobs data
  function applyFilters(jobs: JobData[]): JobData[] {
    if (!jobs) return [];

    return jobs.filter((job: JobData) => {
      // Apply scope filter
      if (scope === 'mine') {
        // TODO: Filter by current user via job assignments
        // For now, show all jobs
      }

      // Apply search filter
      if (!shouldShowJob(job)) {
        return false;
      }

      // Filter by technician if specified
      if (technicianId) {
        const hasMatchingTechnician = job.jobAssignments?.some(
          (assignment: any) => assignment.user?.id === technicianId
        );
        if (!hasMatchingTechnician) {
          return false;
        }
      }

      // TODO: Add proper priority filtering using Zero's numeric priority field
      // Priority filtering would need to map from string to number
      return true;
    });
  }

  // Zero.js handles all retries and refreshes automatically
  // No manual retry logic needed - trust Zero's built-in resilience
</script>

<svelte:head>
  <title>Jobs - bŏs</title>
</svelte:head>

<AppLayout>
  <JobsLayout>
    {#snippet header()}
      <h1>Jobs</h1>

      <!-- Technician Filter -->
      {#if technicianId}
        <div class="filter-info">
          <span class="filter-label">Filtered by technician</span>
          <a href="/jobs" class="clear-filter">Clear filter</a>
        </div>
      {/if}
    {/snippet}

    <ReactiveView query={jobsQuery} strategy="progressive">
      {#snippet loading()}
        <LoadingSkeleton type="job-card" count={6} />
      {/snippet}

      {#snippet error({ error, refresh })}
        <div class="error-state">
          <h2>Unable to load jobs</h2>
          <p>{error.message}</p>
          <button onclick={refresh}>Retry</button>
        </div>
      {/snippet}

      {#snippet empty()}
        <div class="empty-state">
          <div class="empty-state-icon">💼</div>
          <h2>No jobs found</h2>
        </div>
      {/snippet}

      {#snippet content({ data })}
        {@const filteredJobs = applyFilters(data)}
        {#if filteredJobs.length === 0}
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h2>No jobs match your filters</h2>
            <p>Try adjusting your filters or search criteria.</p>
          </div>
        {:else}
          <div class="jobs-list">
            {#each filteredJobs as job (job.id)}
              <JobCard {job} showClient={true} />
            {/each}
          </div>
        {/if}
      {/snippet}
    </ReactiveView>
  </JobsLayout>
</AppLayout>

<style>
  @import '$lib/styles/jobs-shared.scss';

  /* Page-specific h1 override */
  h1 {
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

  /* Error state styles */
  .error-state {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .error-state h2 {
    color: var(--text-primary);
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .error-state p {
    color: var(--text-secondary);
    font-size: 14px;
    margin: 0 0 16px 0;
  }

  .error-state button {
    padding: 8px 16px;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .error-state button:hover {
    background-color: var(--accent-blue-hover, #0051d5);
  }

  /* Empty state styles */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 32px;
    text-align: center;
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-state h2 {
    color: var(--text-secondary, #86868b);
    font-size: 18px;
    font-weight: 500;
    margin: 0;
  }

  .empty-state p {
    color: var(--text-tertiary, #98989d);
    font-size: 14px;
    margin: 8px 0 0 0;
  }
</style>
