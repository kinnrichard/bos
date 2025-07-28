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
  import ZeroDataView from '$lib/components/data/ZeroDataView.svelte';
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

  // ✨ USE $derived FOR DIRECT ZERO DATA ACCESS (NO TRANSFORMATION NEEDED)
  const allJobs = $derived(jobsQuery.data || []);

  // ✨ ZERO NATIVE OBJECTS: No transformation needed!

  // ✨ USE $derived FOR FILTERING WITH ZERO NATIVE STRUCTURE
  const filteredJobs = $derived(
    allJobs.filter((_job: JobData) => {
      if (scope === 'mine') {
        // TODO: Filter by current user via job assignments
        // For now, show all jobs
        return true;
      }
      return true;
    })
  );

  // ✨ USE $derived FOR FINAL FILTERING WITH TECHNICIAN AND SEARCH SUPPORT
  const jobs = $derived(
    filteredJobs.filter((job: JobData) => {
      // Apply search filter first
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
    })
  );

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

    <ZeroDataView
      query={{
        data: jobsQuery.data,
        resultType: jobsQuery.resultType,
        error: jobsQuery.error,
      }}
      displayData={jobs}
      emptyMessage="No jobs found"
      filteredEmptyMessage="No jobs match your filters"
    >
      {#snippet content(jobsData)}
        <div class="jobs-list">
          {#each jobsData as job (job.id)}
            <JobCard {job} showClient={true} />
          {/each}
        </div>
      {/snippet}
    </ZeroDataView>
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
</style>
