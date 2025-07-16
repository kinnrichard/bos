<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';
  import { fixContentEditable } from '$lib/actions/fixContentEditable';
  import JobInfo from './JobInfo.svelte';
  import TaskList from './TaskList.svelte';
  import StatusIndicator from './StatusIndicator.svelte';
  import { debugComponent } from '$lib/utils/debug';

  // ✨ USE $props() FOR SVELTE 5 RUNES MODE
  let { job, batchTaskDetails = null }: { job: PopulatedJob; batchTaskDetails?: any } = $props();

  // Job title editing state
  let jobTitleElement = $state<HTMLHeadingElement>();
  let originalJobTitle = $state('');

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

  // Job title editing functions
  function handleJobTitleFocus() {
    if (jobTitleElement) {
      originalJobTitle = jobTitleElement.textContent || '';
    }
  }

  async function saveJobTitle() {
    if (!jobTitleElement) return;
    
    const newTitle = (jobTitleElement.textContent || '').trim();
    
    if (newTitle === '' || newTitle === originalJobTitle) {
      // Revert to original if empty or unchanged
      jobTitleElement.textContent = originalJobTitle;
      jobTitleElement.blur();
      return;
    }

    try {
      // Use the Job ActiveRecord model to update
      const { Job } = await import('$lib/models/job');
      await Job.update(jobId, { title: newTitle });
      
      // Update original title for future comparisons
      originalJobTitle = newTitle;
      jobTitleElement.blur();
    } catch (error) {
      debugComponent.error('Job title update failed', { error, jobId, newTitle });
      // Revert to original title on error
      jobTitleElement.textContent = originalJobTitle;
      jobTitleElement.blur();
    }
  }

  function cancelJobTitleEdit() {
    if (jobTitleElement) {
      jobTitleElement.textContent = originalJobTitle;
      jobTitleElement.blur();
    }
  }

  function handleJobTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveJobTitle();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelJobTitleEdit();
    }
  }

  function handleJobTitleBlur() {
    saveJobTitle();
  }
</script>

<div class="job-detail-view">
  <h1 
    class="job-title" 
    contenteditable="true"
    use:fixContentEditable
    onkeydown={handleJobTitleKeydown}
    onblur={handleJobTitleBlur}
    onfocus={handleJobTitleFocus}
    bind:this={jobTitleElement}
  >
    {jobTitle}
  </h1>
  
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