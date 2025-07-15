<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import type { PopulatedJob } from '$lib/types/job';

  // Props
  let { job }: { job: PopulatedJob } = $props();
  import { getJobStatusEmoji } from '$lib/config/emoji';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import '$lib/styles/popover-common.css';
  import { Job } from '$lib/models/job';

  let basePopover = $state();

  // All available job statuses with their display information
  const availableStatuses = [
    { id: 'open', value: 'open', label: 'Open', emoji: '⚫' },
    { id: 'in_progress', value: 'in_progress', label: 'In Progress', emoji: '🟢' },
    { id: 'paused', value: 'paused', label: 'Paused', emoji: '⏸️' },
    { id: 'waiting_for_customer', value: 'waiting_for_customer', label: 'Waiting for Customer', emoji: '⏳' },
    { id: 'waiting_for_scheduled_appointment', value: 'waiting_for_scheduled_appointment', label: 'Scheduled', emoji: '📅' },
    { id: 'successfully_completed', value: 'successfully_completed', label: 'Completed', emoji: '✅' },
    { id: 'cancelled', value: 'cancelled', label: 'Cancelled', emoji: '❌' }
  ];

  // Get job status emoji with comprehensive null checks
  const jobStatusEmoji = $derived(
    job ? getJobStatusEmoji(currentStatus) : '📝'
  );
  
  // Debug logging for JobStatusButton - track job prop changes
  $effect(() => {
    console.log('[JobStatusButton] Job prop changed:', {
      id: job?.id,
      status: job?.status,
      title: job?.title,
      timestamp: Date.now(),
      currentStatus: currentStatus,
      jobStatusEmoji: jobStatusEmoji
    });
    
    // Track if this is the same job object or a new one
    if (job) {
      console.log('[JobStatusButton] Job object details:', {
        isProxy: job.constructor.name === 'Proxy',
        objectId: job.id,
        statusValue: job.status,
        rawJobObject: job
      });
    }
  });

  // Simple direct binding to job status (let Zero.js handle optimistic updates)
  const currentStatus = $derived(job?.status || 'open');

  // Handle status change using ActiveRecord pattern (Zero.js handles optimistic updates)
  async function handleStatusChange(statusOption: any) {
    const newStatus = statusOption.value;
    console.log('[JobStatusButton] handleStatusChange called:', {
      newStatus,
      currentStatus,
      jobId: job?.id,
      jobStatus: job?.status,
      timestamp: Date.now()
    });
    
    if (!job || newStatus === currentStatus) {
      console.log('[JobStatusButton] Status change skipped - no job or same status');
      return;
    }
    
    try {
      // Persist to database using ActiveRecord pattern (Zero.js handles optimistic updates)
      console.log('[JobStatusButton] Calling Job.update...');
      await Job.update(job.id, { status: newStatus });
      
      console.log('[JobStatusButton] AFTER ActiveRecord mutation - SUCCESS:', {
        jobStatus: job.status,
        persistedStatus: newStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[JobStatusButton] Failed to update job status:', error);
      // TODO: Show error toast to user
    }
    
    // Close popover
    if (basePopover && basePopover.close) {
      basePopover.close();
    }
  }
</script>

<BasePopover 
  bind:popover={basePopover}
  preferredPlacement="bottom"
  panelWidth="max-content"
>
  <svelte:fragment slot="trigger" let:popover>
    <button 
      class="popover-button"
      use:popover.button
      title={`Job Status: ${jobStatusEmoji}`}
      onclick={(e) => e.stopPropagation()}
    >
      <span class="job-status-emoji">{jobStatusEmoji}</span>
    </button>
  </svelte:fragment>

  <div style="padding: {POPOVER_CONSTANTS.COMPACT_CONTENT_PADDING};">
    <h3 class="popover-title">Job Status</h3>

    <PopoverOptionList
      options={availableStatuses}
      onOptionClick={handleStatusChange}
      isSelected={(option) => option.value === currentStatus}
    >
      <svelte:fragment slot="option-content" let:option>
        <span class="status-emoji popover-option-left-content">{option.emoji}</span>
        <span class="popover-option-main-label">{option.label}</span>
        
        <!-- Selection indicator in same reactive scope -->
        <div class="popover-checkmark-container">
          {#if option.value === currentStatus}
            <img src="/icons/checkmark.svg" alt="Selected" class="popover-checkmark-icon" />
          {/if}
        </div>
      </svelte:fragment>
    </PopoverOptionList>
  </div>
</BasePopover>

<style>
  .popover-button {
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
    padding: 0;
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
  }

  .popover-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .job-status-emoji {
    font-size: 18px;
    line-height: 1;
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .popover-button {
      border-width: 2px;
    }
  }
</style>