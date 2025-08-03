<script lang="ts">
  import type { JobData } from '$lib/models/types/job-data';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';
  import { getDueDateIcon } from '$lib/utils/due-date-icon';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';

  let {
    job,
    showClient = true,
  }: {
    job: JobData;
    showClient?: boolean;
  } = $props();

  // Use centralized enum conversion functions

  // Extract technicians from job assignments
  const technicians = $derived(
    job.jobAssignments?.map((assignment: any) => assignment.user).filter(Boolean) || []
  );

  const statusEmoji = $derived(getJobStatusEmoji(job.status));
  const priorityEmoji = $derived(getJobPriorityEmoji(job.priority));
  const dueDateIcon = $derived(job.due_at ? getDueDateIcon(new Date(job.due_at)) : null);

  function getJobPath(job: JobData): string {
    return `/jobs/${job.id}`;
  }
</script>

<a
  href={getJobPath(job)}
  class="job-card-inline"
  data-job-id={job.id}
  data-sveltekit-preload-data="hover"
>
  <!-- Status emoji -->
  <span class="job-status-emoji">{statusEmoji}</span>

  <!-- Client and job name section -->
  <span class="job-name-section">
    {#if showClient}
      <button
        class="client-name-prefix client-link"
        onclick={(e) => {
          e.stopPropagation();
          window.location.href = `/clients/${job.client?.id}`;
        }}
      >
        {job.client?.name || 'Unknown Client'}
      </button>
    {/if}
    <span class="job-name">{job.title || 'Untitled Job'}</span>
  </span>

  <!-- Right side items -->
  <span class="job-right-section">
    <!-- Technician avatars (leftmost) -->
    {#if technicians?.length > 0}
      <span class="technician-avatars">
        {#each technicians as technician, index}
          <UserAvatar user={technician} size="xs" overlap={index > 0} />
        {/each}
      </span>
    {/if}

    <!-- Due date icon (if due date is set) -->
    {#if dueDateIcon && job.due_at}
      <img src={dueDateIcon} alt="Due date" class="due-date-icon" />
    {/if}

    <!-- Priority emoji (if not normal, rightmost) -->
    {#if job.priority !== 'normal' && priorityEmoji}
      <span class="job-priority-emoji">{priorityEmoji}</span>
    {/if}
  </span>
</a>

<style>
  /* 
   * Note: Most styling comes from the existing CSS classes in application.css
   * This just adds any Svelte-specific styles if needed
   */
  .job-card-inline {
    display: flex;
    align-items: center;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    padding: 12px 16px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
    gap: 12px;
  }

  .job-status-emoji {
    font-size: 18px;
    flex-shrink: 0;
  }

  .job-name-section {
    flex: 1;
    display: flex;
    align-items: baseline;
    overflow: hidden;
  }

  .client-name-prefix {
    color: var(--text-tertiary);
    font-size: 13px;
    font-weight: 400;
    padding-right: 13px;
  }

  .client-link {
    text-decoration: none;
    color: var(--accent-blue);
    transition: color 0.15s ease;
  }

  .job-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .job-right-section {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .job-priority-emoji {
    font-size: 18px;
  }

  .due-date-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .technician-avatars {
    display: flex;
    align-items: center;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .job-card-inline {
      padding: 10px 12px;
      gap: 10px;
    }

    .client-name-prefix {
      font-size: 12px;
      padding-right: 10px;
    }

    .job-name {
      font-size: 13px;
    }
  }
</style>
