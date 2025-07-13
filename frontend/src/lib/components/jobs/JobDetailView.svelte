<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';
  import JobInfo from './JobInfo.svelte';
  import TaskList from './TaskList.svelte';
  import StatusIndicator from './StatusIndicator.svelte';

  // ✨ USE $props() FOR SVELTE 5 RUNES MODE
  let { job, batchTaskDetails = null }: { job: PopulatedJob; batchTaskDetails?: any } = $props();

  // ✨ USE $derived FOR COMPUTED VALUES (NOT REACTIVE STATEMENTS)
  const statusEmoji = $derived(getJobStatusEmoji(job?.status));
  const priorityEmoji = $derived(getJobPriorityEmoji(job?.priority));
  
  // ✨ USE $inspect FOR DEBUGGING REACTIVE STATE IN SVELTE 5
  $effect(() => {
    if (job) {
      $inspect('[JobDetailView] Received job data:', job);
      console.log('[JobDetailView] Job title:', job?.title);
      console.log('[JobDetailView] Job client:', job?.client?.name || 'Using Zero.js flat structure');
      console.log('[JobDetailView] Job status:', job?.status);
      console.log('[JobDetailView] Job tasks type:', typeof job?.tasks);
      console.log('[JobDetailView] Job tasks length:', job?.tasks?.length);
      if (job?.tasks && job.tasks.length > 0) {
        $inspect('[JobDetailView] First task:', job.tasks[0]);
        console.log('[JobDetailView] Task ID:', job.tasks[0]?.id);
        console.log('[JobDetailView] Task title:', job.tasks[0]?.title);
      }
    }
  });
  
  // ✨ USE $derived FOR COMPUTED VALUES (NOT REACTIVE STATEMENTS)
  const jobTitle = $derived(job?.title || '');
  const jobClient = $derived(job?.client?.name || 'Unknown Client'); // Zero.js flat structure
  const jobStatus = $derived(job?.status);
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