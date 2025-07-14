<script lang="ts">
  import HeadlessPopoverButton from '$lib/components/ui/HeadlessPopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import type { PopulatedJob } from '$lib/types/job';

  // Props
  let { job }: { job: PopulatedJob } = $props();
  import { getJobStatusEmoji } from '$lib/config/emoji';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import '$lib/styles/popover-common.css';

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
  
  // Debug logging for JobStatusButton
  $effect(() => {
    console.log('[JobStatusButton] Debug Info:');
    console.log('  job prop:', job);
    console.log('  job?.status:', job?.status);
    console.log('  currentStatus:', currentStatus);
    console.log('  jobStatusEmoji:', jobStatusEmoji);
    console.log('  getJobStatusEmoji(currentStatus):', getJobStatusEmoji(currentStatus));
    
    // Test all status mappings
    console.log('[JobStatusButton] Emoji mapping tests:');
    console.log('  getJobStatusEmoji("open"):', getJobStatusEmoji("open"));
    console.log('  getJobStatusEmoji("paused"):', getJobStatusEmoji("paused"));
    console.log('  getJobStatusEmoji("successfully_completed"):', getJobStatusEmoji("successfully_completed"));
    console.log('  getJobStatusEmoji("in_progress"):', getJobStatusEmoji("in_progress"));
  });

  // Handle status change using simple reactive state update
  function handleStatusChange(statusOption: any) {
    const newStatus = statusOption.value;
    if (!job || newStatus === currentStatus) return;
    
    // Simple reactive update - Svelte 5 handles the reactivity
    job.status = newStatus;
    
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