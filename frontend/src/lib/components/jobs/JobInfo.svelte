<script lang="ts">
  import type { PopulatedJob } from '$lib/types/job';
  import SchedulePriorityEditPopover from '$lib/components/layout/SchedulePriorityEditPopover.svelte';

  export let job: PopulatedJob | null | undefined;

  function formatDate(dateString?: string): string {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTime(timeString?: string): string {
    if (!timeString) return 'Not set';
    return timeString;
  }

  function formatStatusLabel(status?: string): string {
    if (!status) return 'Unknown';
    // Convert raw status to display label
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function formatPriorityLabel(priority?: string): string {
    if (!priority) return 'Normal';
    // Convert raw priority to display label  
    return priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Computed labels from raw API data
  $: statusLabel = formatStatusLabel(job?.attributes?.status);
  $: priorityLabel = formatPriorityLabel(job?.attributes?.priority);

</script>

<div class="job-info-panel">
  {#if job?.attributes}
    <div class="info-grid">
      <!-- Status and Priority -->
      <div class="info-group">
        <h4>Status & Priority</h4>
        <div class="info-items">
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="info-value status-value" data-status={job.attributes.status || 'unknown'}>
              {statusLabel}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Priority</span>
            <span class="info-value priority-value" data-priority={job.attributes.priority || 'normal'}>
              {priorityLabel}
            </span>
          </div>
          {#if job.attributes.is_overdue}
            <div class="info-item">
              <span class="info-label">Status</span>
              <span class="info-value overdue-indicator">
                ⚠️ Overdue
              </span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Scheduling -->
      <div class="info-group">
        <div class="info-group-header">
          <h4>Schedule</h4>
          {#if job?.id}
            <SchedulePriorityEditPopover jobId={job.id} initialJob={job} />
          {/if}
        </div>
        <div class="info-items">
          <div class="info-item">
            <span class="info-label">Start Date</span>
            <span class="info-value">{formatDate(job.attributes.start_on)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Start Time</span>
            <span class="info-value">{formatTime(job.attributes.start_time)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Due Date</span>
            <span class="info-value">{formatDate(job.attributes.due_on)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Due Time</span>
            <span class="info-value">{formatTime(job.attributes.due_time)}</span>
          </div>
        </div>
      </div>

      <!-- Team -->
      <div class="info-group">
        <h4>Team</h4>
        <div class="info-items">
          <div class="info-item">
            <span class="info-label">Created By</span>
            <span class="info-value">
              {#if job.created_by?.name}
                <div class="user-info">
                  <span 
                    class="user-avatar" 
                    style={job.created_by.avatar_style || `background-color: var(--accent-blue);`}
                  >
                    {job.created_by.initials || '?'}
                  </span>
                  <span class="user-name">{job.created_by.name}</span>
                </div>
              {:else}
                <span class="no-data">Unknown</span>
              {/if}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Technicians</span>
            <span class="info-value">
              {#if job.technicians?.length > 0}
                <div class="technicians-list">
                  {#each job.technicians as technician}
                    {#if technician?.name}
                      <div class="user-info">
                        <span 
                          class="user-avatar" 
                          style={technician.avatar_style || `background-color: var(--accent-blue);`}
                        >
                          {technician.initials || '?'}
                        </span>
                        <span class="user-name">{technician.name}</span>
                      </div>
                    {/if}
                  {/each}
                </div>
              {:else}
                <span class="no-data">No technicians assigned</span>
              {/if}
            </span>
          </div>
        </div>
      </div>

    </div>
  {/if}
</div>

<style>
  .job-info-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    padding: 24px;
  }


  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .info-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-group h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .info-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .info-label {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
    flex-shrink: 0;
    min-width: 80px;
  }

  .info-value {
    font-size: 13px;
    color: var(--text-primary);
    text-align: right;
    flex: 1;
    min-width: 0;
  }

  .status-value[data-status="successfully_completed"] {
    color: var(--accent-green);
    font-weight: 500;
  }

  .status-value[data-status="in_progress"] {
    color: var(--accent-blue);
    font-weight: 500;
  }

  .status-value[data-status="cancelled"] {
    color: var(--accent-red);
    font-weight: 500;
  }

  .priority-value[data-priority="high"] {
    color: var(--accent-red);
    font-weight: 500;
  }

  .priority-value[data-priority="critical"] {
    color: var(--accent-red);
    font-weight: 600;
  }

  .overdue-indicator {
    color: var(--accent-red);
    font-weight: 600;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .user-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    line-height: 1;
    flex-shrink: 0;
    user-select: none;
    text-shadow: 0.5px 0.5px 1px rgba(0, 0, 0, 0.75);
  }

  .user-name {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .technicians-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
  }

  .no-data {
    color: var(--text-tertiary);
    font-style: italic;
  }


  /* Responsive adjustments */
  @media (max-width: 768px) {
    .job-info-panel {
      padding: 20px;
    }

    .info-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .info-label {
      min-width: auto;
    }

    .info-value {
      text-align: left;
    }

    .user-info {
      justify-content: flex-start;
    }

    .technicians-list {
      align-items: flex-start;
    }
  }

  @media (max-width: 480px) {
    .job-info-panel {
      padding: 16px;
    }

    .info-grid {
      gap: 20px;
    }

    .info-group {
      gap: 10px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .job-info-panel {
      border-width: 2px;
    }

    .status-value,
    .priority-value,
    .overdue-indicator {
      font-weight: 700;
    }
  }
</style>