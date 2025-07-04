<script lang="ts">
  import BasePopoverButton from '$lib/components/ui/BasePopoverButton.svelte';
  import CircularButton from '$lib/components/ui/CircularButton.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import FormSelect from '$lib/components/ui/FormSelect.svelte';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
  import { useJobQuery, useUpdateJobMutation } from '$lib/api/hooks/jobs';
  import type { PopulatedJob } from '$lib/types/job';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage } from '$lib/utils/popover-utils';

  export let jobId: string;
  export let initialJob: PopulatedJob | null = null;

  let popover: any;
  
  const jobQuery = useJobQuery(jobId);
  const updateJobMutation = useUpdateJobMutation();

  // Derived state from TanStack Query cache
  $: job = $jobQuery.data || initialJob;
  $: isLoading = $updateJobMutation.isPending;
  $: error = $updateJobMutation.error;
  $: errorMessage = getPopoverErrorMessage(error);

  // Local form state
  let localPriority = '';
  let localStartDate = '';
  let localStartTime = '';
  let localDueDate = '';
  let localDueTime = '';

  // Keep local state in sync with server data
  $: {
    if (job?.attributes && !isLoading) {
      localPriority = job.attributes.priority || 'normal';
      localStartDate = job.attributes.start_on || '';
      localStartTime = job.attributes.start_time || '';
      localDueDate = job.attributes.due_on || '';
      localDueTime = job.attributes.due_time || '';
    }
  }

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
    { value: 'proactive_followup', label: 'Proactive Followup' }
  ];

  function handleSave() {
    if (isLoading || !job?.id) return;

    const updates: any = {};
    
    // Only include changed fields
    if (localPriority !== job.attributes.priority) {
      updates.priority = localPriority;
    }
    if (localStartDate !== job.attributes.start_on) {
      updates.start_on = localStartDate || null;
    }
    if (localStartTime !== job.attributes.start_time) {
      updates.start_time = localStartTime || null;
    }
    if (localDueDate !== job.attributes.due_on) {
      updates.due_on = localDueDate || null;
    }
    if (localDueTime !== job.attributes.due_time) {
      updates.due_time = localDueTime || null;
    }

    // Only submit if there are changes
    if (Object.keys(updates).length > 0) {
      $updateJobMutation.mutate({ 
        id: job.id, 
        data: updates 
      }, {
        onSuccess: () => {
          // Popover will close automatically when clicking outside
        }
      });
    }
  }

  function handleCancel() {
    // Reset local state to server values
    if (job?.attributes) {
      localPriority = job.attributes.priority || 'normal';
      localStartDate = job.attributes.start_on || '';
      localStartTime = job.attributes.start_time || '';
      localDueDate = job.attributes.due_on || '';
      localDueTime = job.attributes.due_time || '';
    }
    // Popover will close automatically when clicking outside
  }
</script>

<BasePopoverButton
  bind:popover
  buttonClass="schedule-priority-popover"
  panelClass="schedule-panel"
  position="bottom-right"
  let:isExpanded
>
  <CircularButton
    slot="trigger"
    variant="default"
    size="normal"
    title="Schedule and Priority"
  >
    <img src="/icons/calendar-add.svg" alt="Schedule" class="calendar-icon" />
  </CircularButton>

  <div class="schedule-content" slot="content">
    <h3 class="schedule-title">Schedule & Priority</h3>
    
    {#if errorMessage}
      <ErrorMessage 
        message={errorMessage}
        variant="popover"
        size="small"
      />
    {/if}

    <form class="schedule-form" on:submit|preventDefault={handleSave}>
      <!-- Priority Section -->
      <div class="form-section">
        <label class="form-label" for="priority-select-{jobId}">Priority</label>
        <FormSelect
          id="priority-select-{jobId}"
          bind:value={localPriority}
          options={priorityOptions}
          disabled={isLoading}
          size="small"
        />
      </div>

      <!-- Schedule Section -->
      <div class="form-section">
        <h4 class="section-title">Schedule</h4>
        
        <div class="date-time-group">
          <label class="form-label" for="start-date-{jobId}">Start Date</label>
          <FormInput
            id="start-date-{jobId}"
            type="date"
            bind:value={localStartDate}
            disabled={isLoading}
            size="small"
          />
        </div>

        <div class="date-time-group">
          <label class="form-label" for="start-time-{jobId}">Start Time</label>
          <FormInput
            id="start-time-{jobId}"
            type="time"
            bind:value={localStartTime}
            disabled={isLoading}
            size="small"
          />
        </div>

        <div class="date-time-group">
          <label class="form-label" for="due-date-{jobId}">Due Date</label>
          <FormInput
            id="due-date-{jobId}"
            type="date"
            bind:value={localDueDate}
            disabled={isLoading}
            size="small"
          />
        </div>

        <div class="date-time-group">
          <label class="form-label" for="due-time-{jobId}">Due Time</label>
          <FormInput
            id="due-time-{jobId}"
            type="time"
            bind:value={localDueTime}
            disabled={isLoading}
            size="small"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          type="button" 
          class="cancel-button"
          disabled={isLoading}
          on:click={handleCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          class="save-button"
          disabled={isLoading}
        >
          {#if isLoading}
            <LoadingIndicator type="text" message="Saving..." size="small" inline />
          {:else}
            Save
          {/if}
        </button>
      </div>
    </form>
  </div>
</BasePopoverButton>

<style>
  .calendar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .schedule-content {
    padding: 20px;
    width: 280px;
  }

  .schedule-title {
    color: var(--text-primary);
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .schedule-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title {
    color: var(--text-secondary);
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .date-time-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-label {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .cancel-button,
  .save-button {
    flex: 1;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cancel-button {
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    color: var(--text-secondary);
  }

  .cancel-button:hover:not(:disabled) {
    background-color: var(--bg-quaternary);
    color: var(--text-primary);
  }

  .save-button {
    background-color: var(--accent-blue);
    border: 1px solid var(--accent-blue);
    color: white;
  }

  .save-button:hover:not(:disabled) {
    background-color: var(--accent-blue-dark, #0066cc);
  }

  .cancel-button:disabled,
  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .schedule-content {
      width: 260px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .cancel-button,
    .save-button {
      transition: none;
    }
  }
</style>