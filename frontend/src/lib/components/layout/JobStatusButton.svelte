<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { currentJob, layoutActions } from '$lib/stores/layout';
  import { getJobStatusEmoji, EMOJI_MAPPINGS } from '$lib/config/emoji';
  import { jobsService } from '$lib/api/jobs';

  const popover = createPopover();
  const queryClient = useQueryClient();

  // State
  let isLoading = false;
  let error = '';

  // All available job statuses with their display information
  const availableStatuses = [
    { value: 'open', label: 'Open', emoji: '⚫' },
    { value: 'in_progress', label: 'In Progress', emoji: '🟢' },
    { value: 'paused', label: 'Paused', emoji: '⏸️' },
    { value: 'waiting_for_customer', label: 'Waiting for Customer', emoji: '⏳' },
    { value: 'waiting_for_scheduled_appointment', label: 'Scheduled', emoji: '📅' },
    { value: 'successfully_completed', label: 'Completed', emoji: '✅' },
    { value: 'cancelled', label: 'Cancelled', emoji: '❌' }
  ];

  // Get job status emoji
  $: jobStatusEmoji = $currentJob ? getJobStatusEmoji($currentJob.attributes?.status) : '📝';
  $: currentStatus = $currentJob?.attributes?.status;

  // Handle status change with optimistic updates
  async function handleStatusChange(newStatus: string) {
    if (!$currentJob || newStatus === currentStatus) return;

    const originalStatus = $currentJob.attributes.status;
    
    // Optimistic update
    const updatedJob = {
      ...$currentJob,
      attributes: {
        ...$currentJob.attributes,
        status: newStatus
      }
    };
    layoutActions.setCurrentJob(updatedJob);

    // Close popover
    popover.close();

    try {
      isLoading = true;
      error = '';
      
      const response = await jobsService.updateJobStatus($currentJob.id, newStatus);
      console.log('Job status updated successfully:', response);
      
      // Invalidate job queries to refetch updated data
      await queryClient.invalidateQueries({
        queryKey: ['job', $currentJob.id],
        exact: true
      });
      await queryClient.invalidateQueries({
        queryKey: ['jobs']
      });
      
      // Force immediate refetch regardless of stale time
      await queryClient.refetchQueries({
        queryKey: ['job', $currentJob.id],
        exact: true,
        type: 'active'
      });
    } catch (err: any) {
      console.error('Failed to update job status:', err);
      
      // Show appropriate error message
      if (err.code === 'INVALID_CSRF_TOKEN') {
        error = 'Session expired - please try again';
      } else {
        error = 'Failed to update status - please try again';
      }
      
      // Rollback on error
      const rolledBackJob = {
        ...$currentJob,
        attributes: {
          ...$currentJob.attributes,
          status: originalStatus
        }
      };
      layoutActions.setCurrentJob(rolledBackJob);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="job-status-popover">
  <button 
    class="job-status-button"
    use:popover.button
    title="Job Status"
  >
    <span class="job-status-emoji">{jobStatusEmoji}</span>
  </button>

  {#if $popover.expanded}
    <div 
      class="job-status-panel"
      use:popover.panel
      in:fade={{ duration: 0 }}
      out:fade={{ duration: 150 }}
    >
      <div class="job-status-content">
        <h3 class="status-title">Job Status</h3>
        
        {#if error}
          <div class="error-message">{error}</div>
        {/if}

        <div class="status-options" class:loading={isLoading}>
          {#each availableStatuses as status}
            <button
              class="status-option"
              class:current={status.value === currentStatus}
              disabled={isLoading}
              on:click={() => handleStatusChange(status.value)}
            >
              <span class="status-emoji">{status.emoji}</span>
              <span class="status-label">{status.label}</span>
              {#if status.value === currentStatus}
                <span class="current-indicator">✓</span>
              {/if}
            </button>
          {/each}
        </div>

        {#if isLoading}
          <div class="loading-indicator">Updating status...</div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .job-status-popover {
    position: relative;
  }

  .job-status-button {
    width: 36px;
    height: 36px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    position: relative;
  }

  .job-status-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .job-status-emoji {
    font-size: 18px;
    line-height: 1;
  }

  .job-status-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 240px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  /* Arrow/tail pointing up to the button */
  .job-status-panel::before {
    content: '';
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .job-status-panel::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  .job-status-content {
    padding: 16px;
  }

  .status-title {
    color: var(--text-primary);
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .error-message {
    color: var(--accent-red);
    font-size: 12px;
    margin-bottom: 8px;
    text-align: center;
  }

  .status-options {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .status-options.loading {
    opacity: 0.6;
    pointer-events: none;
  }

  .status-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    text-align: left;
    width: 100%;
  }

  .status-option:hover {
    background-color: var(--bg-tertiary);
  }

  .status-option.current {
    background-color: var(--accent-blue);
    color: white;
  }

  .status-option.current:hover {
    background-color: var(--accent-blue-hover);
  }

  .status-option:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .status-emoji {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }

  .status-label {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.2;
    flex: 1;
  }

  .status-option.current .status-label {
    color: white;
  }

  .current-indicator {
    font-size: 12px;
    color: white;
    flex-shrink: 0;
  }

  .loading-indicator {
    text-align: center;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 8px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .job-status-panel {
      width: 220px;
    }
  }
</style>