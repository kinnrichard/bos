<script lang="ts">
  import HeadlessPopoverButton from '$lib/components/ui/HeadlessPopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import { getZeroContext } from '$lib/zero-context.svelte';

  // Get Zero functions from context
  const { updateJob } = getZeroContext();
  import { layout } from '$lib/stores/layout.svelte';
  import { getJobStatusEmoji, EMOJI_MAPPINGS } from '$lib/config/emoji';
  import { getJobStatusString } from '$lib/utils/enum-conversions';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage } from '$lib/utils/popover-utils';
  import '$lib/styles/popover-common.css';

  let popover: any;
  
  // Local state for Zero mutation management
  let isLoading = false;
  let error: any = null;

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

  // Get job status emoji with comprehensive null checks and proper conversion
  const jobStatusEmoji = $derived(
    layout.currentJob?.attributes?.status !== undefined && layout.currentJob?.attributes?.status !== null
      ? getJobStatusEmoji(getJobStatusString(layout.currentJob.attributes.status))
      : '📝'
  );
  const currentStatus = $derived(
    layout.currentJob?.attributes?.status !== undefined && layout.currentJob?.attributes?.status !== null
      ? getJobStatusString(layout.currentJob.attributes.status)
      : 'open'
  );

  // Handle status change using Zero direct mutation
  async function handleStatusChange(statusOption: any) {
    const newStatus = statusOption.value;
    if (!layout.currentJob || newStatus === currentStatus || isLoading) return;
    
    try {
      isLoading = true;
      error = null;
      
      // Use Zero's updateJob with status field
      await updateJob(layout.currentJob.id, { status: newStatus });
      
      // Zero automatically updates the UI in real-time
      // Close popover
      popover.close();
    } catch (err) {
      error = err;
      console.error('Failed to update job status:', err);
    } finally {
      isLoading = false;
    }
  }
</script>

<HeadlessPopoverButton 
  bind:popover
  title={`Job Status: ${jobStatusEmoji}`}
  error={error ? getPopoverErrorMessage(error) : ''}
  loading={isLoading}
  panelWidth="max-content"
  panelPosition="center"
  topOffset={POPOVER_CONSTANTS.DEFAULT_TOP_OFFSET}
  contentPadding={POPOVER_CONSTANTS.COMPACT_CONTENT_PADDING}
>
  <svelte:fragment slot="button-content">
    <span class="job-status-emoji">{jobStatusEmoji}</span>
  </svelte:fragment>

  <svelte:fragment slot="panel-content" let:error let:loading>
    <h3 class="popover-title">Job Status</h3>
    
    {#if error}
      <div class="popover-error-message">{error}</div>
    {/if}

    <PopoverOptionList
      options={availableStatuses}
      loading={loading}
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

    {#if isLoading}
      <div class="popover-loading-indicator">Updating status...</div>
    {/if}
  </svelte:fragment>
</HeadlessPopoverButton>

<style>
  .job-status-emoji {
    font-size: 18px;
    line-height: 1;
  }


  /* Component-specific option styling removed - now using shared classes */

</style>