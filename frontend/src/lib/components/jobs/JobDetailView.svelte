<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';
  import EditableTitle from '../ui/EditableTitle.svelte';
  import JobInfo from './JobInfo.svelte';
  import TaskList from './TaskList.svelte';
  import StatusIndicator from './StatusIndicator.svelte';
  import { debugComponent } from '$lib/utils/debug';

  // ✨ USE $props() FOR SVELTE 5 RUNES MODE
  let { job, batchTaskDetails = null }: { job: PopulatedJob; batchTaskDetails?: any } = $props();

  // ✨ USE $derived FOR COMPUTED VALUES (NOT REACTIVE STATEMENTS)
  const statusEmoji = $derived(getJobStatusEmoji(job?.status));
  const priorityEmoji = $derived(getJobPriorityEmoji(job?.priority));
  
  // ✨ USE $inspect FOR DEBUGGING REACTIVE STATE IN SVELTE 5
  $effect(() => {
    if (job) {
      $inspect('[JobDetailView] Received job data:', job);
      debugComponent('[JobDetailView] Job data loaded', {
        title: job?.title,
        client: job?.client?.name || 'Using Zero.js flat structure',
        status: job?.status,
        tasksType: typeof job?.tasks,
        tasksLength: job?.tasks?.length
      });
      if (job?.tasks && job.tasks.length > 0) {
        $inspect('[JobDetailView] First task:', job.tasks[0]);
        debugComponent('[JobDetailView] First task data', {
          taskId: job.tasks[0]?.id,
          taskTitle: job.tasks[0]?.title
        });
      }
    }
  });
  
  // ✨ USE $derived FOR COMPUTED VALUES (NOT REACTIVE STATEMENTS)
  const jobTitle = $derived(job?.title || '');
  const jobClient = $derived(job?.client?.name || 'Unknown Client'); // Zero.js flat structure
  const jobStatus = $derived(job?.status);
  const jobId = $derived(job?.id || '');
  const isUntitledJob = $derived(jobTitle === 'Untitled Job' || jobTitle === '');

  // Handle job title save
  async function handleJobTitleSave(newTitle: string) {
    try {
      // Use the Job ActiveRecord model to update
      const { Job } = await import('$lib/models/job');
      await Job.update(jobId, { title: newTitle });
      debugComponent('Job title updated successfully', { jobId, newTitle });
    } catch (error) {
      debugComponent.error('Job title update failed', { error, jobId, newTitle });
      throw error; // Re-throw so EditableTitle can handle the error
    }
  }
</script>

<div class="job-detail-view">
  <EditableTitle
    value={jobTitle}
    tag="h1"
    className="job-title"
    placeholder="Untitled Job"
    autoFocus={isUntitledJob}
    onSave={handleJobTitleSave}
  />
  
  <!-- Tasks Section -->
  <div class="tasks-section">
    <TaskList tasks={job?.tasks || []} jobId={job?.id} {batchTaskDetails} />
  </div>
  
</div>

<style>
  .job-detail-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .job-detail-view :global(.job-title) {
    flex-shrink: 0;
  }

  .tasks-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* Responsive layout */
  @media (max-width: 768px) {
    .job-detail-view {
      gap: 24px;
    }
  }
</style>