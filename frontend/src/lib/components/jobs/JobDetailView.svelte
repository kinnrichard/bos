<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';
  import JobInfo from './JobInfo.svelte';
  import TaskList from './TaskList.svelte';
  import StatusIndicator from './StatusIndicator.svelte';

  // ✨ USE $props() FOR SVELTE 5 RUNES MODE
  let { job, batchTaskDetails = null }: { job: PopulatedJob; batchTaskDetails?: any } = $props();

  // ✨ USE $derived FOR COMPUTED VALUES (NOT REACTIVE STATEMENTS)
  const statusEmoji = $derived(getJobStatusEmoji(job?.attributes?.status));
  const priorityEmoji = $derived(getJobPriorityEmoji(job?.attributes?.priority));
  
  // ✨ USE $effect FOR SIDE EFFECTS AND $state.snapshot() FOR LOGGING
  $effect(() => {
    if (job) {
      console.log('[JobDetailView] Received job data:', $state.snapshot(job));
      console.log('[JobDetailView] Job title:', job?.attributes?.title);
      console.log('[JobDetailView] Job client:', job?.client?.name || 'Using JSON:API format');
      console.log('[JobDetailView] Job status:', job?.attributes?.status);
    }
  });
  
  // ✨ USE $derived FOR COMPUTED VALUES (NOT REACTIVE STATEMENTS)
  const jobTitle = $derived(job?.attributes?.title || '');
  const jobClient = $derived(job?.client?.name || 'Unknown Client'); // Fallback for JSON:API format
  const jobStatus = $derived(job?.attributes?.status);
  const jobId = $derived(job?.id || '');
</script>

<div class="job-detail-view">
  <h1 class="job-title">{jobTitle}</h1>
  
  <!-- Tasks Section -->
  <div class="tasks-section">
    <div class="section-header">
      <div class="task-counts">
        <!--span class="task-count">
          {job.attributes.task_counts.completed} / {job.attributes.task_counts.total} completed
        </span-->
      </div>
    </div>
    <TaskList tasks={job?.tasks || []} jobId={job?.id} {batchTaskDetails} />
  </div>
  
</div>

<style>
  h1 {
    margin: 0;
    padding: 0;
  }  
  
  .job-detail-view {
    display: flex;
    flex-direction: column;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .task-counts {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Responsive layout */
  @media (max-width: 768px) {
    .job-detail-view {
      gap: 24px;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
</style>