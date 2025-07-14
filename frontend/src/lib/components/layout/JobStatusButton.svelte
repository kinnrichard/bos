<script lang="ts">
  import HeadlessPopoverButton from '$lib/components/ui/HeadlessPopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import type { PopulatedJob } from '$lib/types/job';

  // Props
  let { job }: { job: PopulatedJob } = $props();
  import { getJobStatusEmoji } from '$lib/config/emoji';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import '$lib/styles/popover-common.css';
  import { Job } from '$lib/models/job';

  let popover = $state();

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

  // Get current status as string (no conversion needed since API returns strings)
  const currentStatus = $derived(
    job?.status || 'open'
  );
  
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

  // Track when status changes are attempted
  let lastAttemptedStatus = $state(null);
  $effect(() => {
    if (lastAttemptedStatus && lastAttemptedStatus !== job?.status) {
      console.log('[JobStatusButton] STATUS REVERT DETECTED:', {
        attemptedStatus: lastAttemptedStatus,
        currentStatus: job?.status,
        timestamp: Date.now()
      });
    }
  });

  // Handle status change using ActiveRecord pattern
  async function handleStatusChange(statusOption: any) {
    const newStatus = statusOption.value;
    console.log('[JobStatusButton] handleStatusChange called:', {
      newStatus,
      currentStatus,
      jobId: job?.id,
      jobBeforeChange: job?.status,
      timestamp: Date.now()
    });
    
    if (!job || newStatus === currentStatus) {
      console.log('[JobStatusButton] Status change skipped - no job or same status');
      return;
    }
    
    // Track the attempted change
    lastAttemptedStatus = newStatus;
    
    // Keep optimistic UI update for immediate feedback
    // const previousStatus = job.status;
    // job.status = newStatus;
    
    console.log('[JobStatusButton] BEFORE ActiveRecord mutation:', {
      jobStatus: job.status,
      newStatus: newStatus,
      timestamp: Date.now()
    });
    
    try {
      // Persist to database using ActiveRecord pattern (generates WebSocket traffic)
      console.log('[JobStatusButton] Calling Job.update...');
      await Job.update(job.id, { status: newStatus });
      
      console.log('[JobStatusButton] AFTER ActiveRecord mutation - SUCCESS:', {
        jobStatus: job.status,
        persistedStatus: newStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      // Revert optimistic update on failure
      job.status = previousStatus;
      console.error('[JobStatusButton] Failed to update job status:', error);
      console.log('[JobStatusButton] REVERTED optimistic update:', {
        revertedTo: job.status,
        failedStatus: newStatus,
        timestamp: Date.now()
      });
      // TODO: Show error toast to user
    }
    
    // Close popover
    if (popover && popover.close) {
      popover.close();
    }
  }
</script>

<HeadlessPopoverButton 
  bind:popover
  title={`Job Status: ${jobStatusEmoji}`}
  panelWidth="max-content"
  panelPosition="center"
  topOffset={POPOVER_CONSTANTS.DEFAULT_TOP_OFFSET}
  contentPadding={POPOVER_CONSTANTS.COMPACT_CONTENT_PADDING}
>
  <svelte:fragment slot="button-content">
    <span class="job-status-emoji">{jobStatusEmoji}</span>
  </svelte:fragment>

  <svelte:fragment slot="panel-content">
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
  </svelte:fragment>
</HeadlessPopoverButton>

<style>
  .job-status-emoji {
    font-size: 18px;
    line-height: 1;
  }


  /* Component-specific option styling removed - now using shared classes */

</style>