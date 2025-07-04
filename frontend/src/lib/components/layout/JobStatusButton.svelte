<script lang="ts">
  import BasePopoverButton from '$lib/components/ui/BasePopoverButton.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { currentJob, layoutActions } from '$lib/stores/layout';
  import { getJobStatusEmoji, EMOJI_MAPPINGS } from '$lib/config/emoji';
  import { jobsService } from '$lib/api/jobs';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage } from '$lib/utils/popover-utils';

  let popover: any;
  const queryClient = useQueryClient();

  // State
  let isLoading = false;
  let error = '';
  $: errorMessage = getPopoverErrorMessage(error);

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
  $: jobStatusEmoji = ($currentJob?.attributes?.status) ? getJobStatusEmoji($currentJob.attributes.status) : '📝';
  $: currentStatus = $currentJob?.attributes?.status || 'open';

  // Handle status change with optimistic updates
  function handleStatusChange(statusOption: any, selected: boolean) {
    const newStatus = statusOption.value;
    if (!$currentJob || newStatus === currentStatus) return;
    
    performStatusUpdate(newStatus);
  }

  async function performStatusUpdate(newStatus: string) {

    const originalStatus = $currentJob.attributes.status;
    
    // Optimistic update
    const updatedJob = {
      ...$currentJob,
      attributes: {
        ...$currentJob.attributes,
        status: newStatus
      }
    };
    console.log('[JobStatusButton] BEFORE optimistic update - currentJob:', JSON.parse(JSON.stringify($currentJob)));
    console.log('[JobStatusButton] APPLYING optimistic update - updatedJob:', JSON.parse(JSON.stringify(updatedJob)));
    layoutActions.setCurrentJob(updatedJob);

    // Close popover
    popover.close();

    try {
      isLoading = true;
      error = '';
      
      console.log('[JobStatusButton] Starting status update:', {
        jobId: $currentJob.id,
        oldStatus: originalStatus,
        newStatus: newStatus
      });
      
      const response = await jobsService.updateJobStatus($currentJob.id, newStatus);
      console.log('[JobStatusButton] Job status updated successfully:', response);
      console.log('[JobStatusButton] API response job data structure:', JSON.parse(JSON.stringify(response.data)));
      
      // Invalidate job queries to refetch updated data
      console.log('[JobStatusButton] Invalidating queries...');
      console.log('[JobStatusButton] Invalidating query key:', ['job', $currentJob.id]);
      await queryClient.invalidateQueries({
        queryKey: ['job', $currentJob.id],
        exact: true
      });
      await queryClient.invalidateQueries({
        queryKey: ['jobs']
      });
      
      console.log('[JobStatusButton] Queries invalidated successfully');
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

<BasePopoverButton 
  bind:popover
  title="Job Status"
  error={errorMessage}
  loading={isLoading}
  panelWidth={POPOVER_CONSTANTS.DEFAULT_PANEL_WIDTH}
  panelPosition="center"
  topOffset={POPOVER_CONSTANTS.ALTERNATIVE_TOP_OFFSET}
  contentPadding={POPOVER_CONSTANTS.DEFAULT_CONTENT_PADDING}
>
  <svelte:fragment slot="button-content">
    <span class="job-status-emoji">{jobStatusEmoji}</span>
  </svelte:fragment>

  <svelte:fragment slot="panel-content" let:error let:loading>
    <h3 class="status-title">Job Status</h3>
    
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <PopoverOptionList
      options={availableStatuses}
      selectedIds={new Set()}
      loading={loading}
      onOptionClick={handleStatusChange}
      showCheckmarks={true}
      singleSelect={true}
      currentSelection={currentStatus}
    >
      <svelte:fragment slot="option-content" let:option let:selected>
        <span class="status-emoji">{option.emoji}</span>
        <span class="status-label">{option.label}</span>
      </svelte:fragment>
    </PopoverOptionList>

    {#if loading}
      <div class="loading-indicator">Updating status...</div>
    {/if}
  </svelte:fragment>
</BasePopoverButton>

<style>
  .job-status-emoji {
    font-size: 18px;
    line-height: 1;
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

  .status-emoji {
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
    margin-right: 8px;
  }

  .status-label {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.2;
    flex: 1;
  }

  .loading-indicator {
    text-align: center;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 8px;
  }
</style>