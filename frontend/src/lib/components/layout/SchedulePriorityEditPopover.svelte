<script lang="ts">
  import BasePopoverButton from '$lib/components/ui/BasePopoverButton.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import FormSelect from '$lib/components/ui/FormSelect.svelte';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import LoadingIndicator from '$lib/components/ui/LoadingIndicator.svelte';
  import { useJobQuery, updateJob } from '$lib/zero/jobs';
  import type { PopulatedJob } from '$lib/types/job';
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';
  import { getPopoverErrorMessage } from '$lib/utils/popover-utils';

  export let jobId: string;
  export let initialJob: PopulatedJob | null = null;

  let popover: any;
  
  // Zero query for real-time job data
  const jobQuery = useJobQuery(jobId, !!jobId);

  // Local state for Zero mutation management
  let isLoading = false;
  let error: any = null;

  // Derived state from Zero query
  $: job = jobQuery.current || jobQuery.value || initialJob;
  $: errorMessage = getPopoverErrorMessage(error);

  // Local form state
  let localPriority = '';
  let localStartDate = '';
  let localStartTime = '';
  let localDueDate = '';
  let localDueTime = '';

  // Keep local state in sync with server data
  // Zero data structure may be different from JSON:API format
  $: {
    if (job && !isLoading) {
      // Handle both Zero format and JSON:API format during transition
      const jobData = job.attributes || job;
      localPriority = jobData.priority || 'normal';
      localStartDate = jobData.start_on || jobData.start_date || '';
      localStartTime = jobData.start_time || '';
      localDueDate = jobData.due_on || jobData.due_date || '';
      localDueTime = jobData.due_time || '';
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

  async function handleSave() {
    if (isLoading || !job?.id) return;

    // Handle both Zero format and JSON:API format during transition
    const jobData = job.attributes || job;
    const updates: any = {};
    
    // Only include changed fields
    if (localPriority !== jobData.priority) {
      updates.priority = localPriority;
    }
    if (localStartDate !== (jobData.start_on || jobData.start_date)) {
      updates.start_date = localStartDate || null;
    }
    if (localStartTime !== jobData.start_time) {
      updates.start_time = localStartTime || null;
    }
    if (localDueDate !== (jobData.due_on || jobData.due_date)) {
      updates.due_date = localDueDate || null;
    }
    if (localDueTime !== jobData.due_time) {
      updates.due_time = localDueTime || null;
    }

    // Only submit if there are changes
    if (Object.keys(updates).length > 0) {
      try {
        isLoading = true;
        error = null;
        
        await updateJob(job.id, updates);
        
        // Zero automatically updates the UI, no need for manual cache updates
        // Popover will close automatically when clicking outside
      } catch (err) {
        error = err;
        console.error('Failed to update job:', err);
      } finally {
        isLoading = false;
      }
    }
  }

  function handleCancel() {
    // Reset local state to server values
    if (job) {
      // Handle both Zero format and JSON:API format during transition
      const jobData = job.attributes || job;
      localPriority = jobData.priority || 'normal';
      localStartDate = jobData.start_on || jobData.start_date || '';
      localStartTime = jobData.start_time || '';
      localDueDate = jobData.due_on || jobData.due_date || '';
      localDueTime = jobData.due_time || '';
    }
    // Popover will close automatically when clicking outside
  }
</script>

<BasePopoverButton
  bind:popover
  title="Schedule and Priority"
  error={errorMessage}
  loading={isLoading}
  panelWidth="280px"
  panelPosition="right"
  contentPadding="20px"
>
  <svelte:fragment slot="button-content">
    <img src="/icons/calendar-add.svg" alt="Schedule" class="calendar-icon" />
  </svelte:fragment>

  <svelte:fragment slot="panel-content" let:error let:loading>
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
  </svelte:fragment>
</BasePopoverButton>

<style>
  .calendar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
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

  /* Responsive adjustments handled by BasePopoverButton */

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .cancel-button,
    .save-button {
      transition: none;
    }
  }
</style>