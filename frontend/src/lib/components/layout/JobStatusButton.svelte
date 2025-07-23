<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import { getJobStatusEmoji, EMOJI_MAPPINGS } from '$lib/config/emoji';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import '$lib/styles/popover-common.css';
  import { Job } from '$lib/models/job';
  import { ReactiveJob } from '$lib/models/reactive-job';
  import { debugComponent, debugWorkflow, debugError } from '$lib/utils/debug';

  // Self-sufficient props pattern - matches TechnicianAssignmentButton
  let {
    jobId,
    initialStatus = 'open'
  }: {
    jobId: string;
    initialStatus?: string;
  } = $props();


  // Self-sufficient query pattern - matches TechnicianAssignmentButton  
  const jobQuery = $derived(jobId ? ReactiveJob.find(jobId) : null);
  const job = $derived(jobQuery?.data);

  // All available job statuses with their display information - formatted for PopoverMenu
  const availableStatuses = [
    { id: 'title', value: 'title', label: 'Job Status', header: true },
    { id: 'open', value: 'open', label: 'Open', icon: EMOJI_MAPPINGS.jobStatuses.open },
    { id: 'in_progress', value: 'in_progress', label: 'In Progress', icon: EMOJI_MAPPINGS.jobStatuses.in_progress },
    { id: 'paused', value: 'paused', label: 'Paused', icon: EMOJI_MAPPINGS.jobStatuses.paused },
    { id: 'waiting_for_customer', value: 'waiting_for_customer', label: 'Waiting for Customer', icon: EMOJI_MAPPINGS.jobStatuses.waiting_for_customer },
    { id: 'waiting_for_scheduled_appointment', value: 'waiting_for_scheduled_appointment', label: 'Scheduled', icon: EMOJI_MAPPINGS.jobStatuses.waiting_for_scheduled_appointment },
    { id: 'successfully_completed', value: 'successfully_completed', label: 'Completed', icon: EMOJI_MAPPINGS.jobStatuses.successfully_completed },
    { id: 'cancelled', value: 'cancelled', label: 'Cancelled', icon: EMOJI_MAPPINGS.jobStatuses.cancelled }
  ];

  // Fallback to initialStatus during loading - self-sufficient pattern
  const currentStatus = $derived(job?.status || initialStatus);
  
  // Get job status emoji with fallback handling
  const jobStatusEmoji = $derived(
    job ? getJobStatusEmoji(currentStatus) : getJobStatusEmoji(initialStatus)
  );

  // Handle status change using ActiveRecord pattern (Zero.js handles optimistic updates)
  async function handleStatusChange(newStatus: string, option: any) {
    // Use jobId directly - always available in self-sufficient pattern
    if (!jobId) {
      debugError('[JobStatusButton] handleStatusChange called with invalid jobId - aborting');
      return;
    }
    
    debugComponent('[JobStatusButton] handleStatusChange called', {
      newStatus,
      currentStatus,
      jobId,
      timestamp: Date.now()
    });
    
    if (newStatus === currentStatus) {
      debugWorkflow('[JobStatusButton] Status change skipped - same status');
      return;
    }
    
    try {
      // Persist to database using ActiveRecord pattern (Zero.js handles optimistic updates)
      debugWorkflow('[JobStatusButton] Calling Job.update');
      await Job.update(jobId, { status: newStatus });
      
      debugWorkflow('[JobStatusButton] AFTER ActiveRecord mutation - SUCCESS', {
        persistedStatus: newStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      debugError('[JobStatusButton] Failed to update job status', error);
      // TODO: Show error toast to user
    }
  }
</script>

<BasePopover 
  preferredPlacement="bottom"
  panelWidth="max-content"
>
  {#snippet trigger({ popover })}
    <button 
      class="popover-button"
      use:popover.button
      title={`Job Status: ${jobStatusEmoji}`}
      onclick={(e) => {
        e.stopPropagation();
      }}
    >
      <span class="job-status-emoji">{jobStatusEmoji}</span>
    </button>
  {/snippet}

  {#snippet children({ close })}
    <PopoverMenu
      options={availableStatuses}
      selected={currentStatus}
      onSelect={handleStatusChange}
      onClose={close}
      showCheckmarks={true}
      showIcons={true}
      iconPosition="left"
      enableKeyboard={true}
      autoFocus={true}
    />
  {/snippet}
</BasePopover>

<style>
  .popover-button {
    width: 36px;
    height: 36px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
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