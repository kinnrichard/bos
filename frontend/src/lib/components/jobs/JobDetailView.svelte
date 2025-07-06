<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';
  import JobInfo from './JobInfo.svelte';
  import TaskList from './TaskList.svelte';
  import StatusIndicator from './StatusIndicator.svelte';

  export let job: PopulatedJob;
  export let batchTaskDetails: any = null; // Optional batch task details data

  $: statusEmoji = getJobStatusEmoji(job?.attributes?.status);
  $: priorityEmoji = getJobPriorityEmoji(job?.attributes?.priority);
  
  // Debug logging for job data received
  $: if (job) {
    console.log('[JobDetailView] Received job data:', JSON.parse(JSON.stringify(job)));
    console.log('[JobDetailView] Job title:', job?.attributes?.title);
    console.log('[JobDetailView] Job client:', job?.client?.name || 'Using JSON:API format');
    console.log('[JobDetailView] Job status:', job?.attributes?.status);
  }
  
  // Handle both populated and JSON:API formats
  $: jobTitle = job?.attributes?.title || '';
  $: jobClient = job?.client?.name || 'Unknown Client'; // Fallback for JSON:API format
  $: jobStatus = job?.attributes?.status;
  $: jobId = job?.id || '';
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

  .job-header {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    padding: 24px;
  }

  .job-header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 16px;
  }

  .job-title-section {
    flex: 1;
    min-width: 0;
  }

  .job-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .job-status-emoji {
    font-size: 24px;
    flex-shrink: 0;
  }

  .job-priority-emoji {
    font-size: 20px;
    flex-shrink: 0;
  }

  .job-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 14px;
  }

  .client-name {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .job-id {
    color: var(--text-tertiary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
  }

  .job-status-section {
    flex-shrink: 0;
  }

  .job-description {
    padding-top: 16px;
    border-top: 1px solid var(--border-primary);
  }

  .job-description p {
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .job-info-section {
    display: flex;
    flex-direction: column;
  }

  .tasks-section {
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-header h2 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .task-counts {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .task-count {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* Responsive layout */

  @media (max-width: 768px) {
    .job-detail-view {
      gap: 24px;
    }

    .job-header {
      padding: 20px;
    }

    .job-header-main {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .job-title {
      font-size: 24px;
    }

    .job-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .tasks-section {
      padding: 20px;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }

  @media (max-width: 480px) {
    .job-header {
      padding: 16px;
    }

    .job-title-row {
      gap: 8px;
    }

    .job-title {
      font-size: 20px;
    }

    .job-status-emoji {
      font-size: 20px;
    }

    .job-priority-emoji {
      font-size: 16px;
    }

    .tasks-section {
      padding: 16px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .job-header,
    .tasks-section {
      border-width: 2px;
    }

    .job-description {
      border-top-width: 2px;
    }
  }
</style>