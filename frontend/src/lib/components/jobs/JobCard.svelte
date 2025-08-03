<script lang="ts">
  import type { JobData } from '$lib/models/types/job-data';
  import { getJobStatusEmoji, getJobPriorityEmoji } from '$lib/config/emoji';

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
    job.jobAssignments?.map((assignment: any) => ({
      id: assignment.user?.id,
      name: assignment.user?.name,
      initials:
        assignment.user?.name
          ?.split(' ')
          .map((n: string) => n[0])
          .join('') || '?',
      avatar_style: `background-color: var(--accent-blue);`, // TODO: Get actual avatar style
    })) || []
  );

  const statusEmoji = $derived(getJobStatusEmoji(job.status));
  const priorityEmoji = $derived(getJobPriorityEmoji(job.priority));

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
    <!-- Priority emoji (if not normal) -->
    {#if job.priority !== 'normal' && priorityEmoji}
      <span class="job-priority-emoji">{priorityEmoji}</span>
    {/if}

    <!-- Technician avatars -->
    {#if technicians?.length > 0}
      <span class="technician-avatars">
        {#each technicians as technician}
          <span
            class="technician-avatar"
            style={technician.avatar_style || `background-color: var(--accent-blue);`}
          >
            {technician.initials}
          </span>
        {/each}
      </span>
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

  .technician-avatars {
    display: flex;
    align-items: center;
    gap: 0; /* No gap, we'll use negative margins for overlap */
  }

  .technician-avatar {
    width: 28px;
    height: 28px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px; /* Increased from 11px */
    font-weight: 600;
    color: white;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75);
    border: 1px solid var(--border-primary);
    flex-shrink: 0;
    position: relative; /* For stacking */
  }

  /* Create overlap effect for multiple avatars */
  .technician-avatar:not(:first-child) {
    margin-left: -8px;
  }

  /* Ensure each avatar stacks properly */
  .technician-avatar:nth-child(1) {
    z-index: 5;
  }
  .technician-avatar:nth-child(2) {
    z-index: 4;
  }
  .technician-avatar:nth-child(3) {
    z-index: 3;
  }
  .technician-avatar:nth-child(4) {
    z-index: 2;
  }
  .technician-avatar:nth-child(5) {
    z-index: 1;
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

    .technician-avatar {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      font-size: 14px;
    }

    .technician-avatar:not(:first-child) {
      margin-left: -6px;
    }
  }
</style>
