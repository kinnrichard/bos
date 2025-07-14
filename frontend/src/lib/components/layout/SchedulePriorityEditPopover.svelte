<script lang="ts">
  import BasePopoverButton from '$lib/components/ui/BasePopoverButton.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import FormSelect from '$lib/components/ui/FormSelect.svelte';
  import type { PopulatedJob } from '$lib/types/job';

  let {
    jobId,
    initialJob = null
  }: {
    jobId: string;
    initialJob?: PopulatedJob | null;
  } = $props();

  let popover: any;

  // Use the initial job directly (reactive through layout store)
  const job = $derived(initialJob);

  // Local form state
  let localPriority = '';
  let localStartDate = '';
  let localStartTime = '';
  let localDueDate = '';
  let localDueTime = '';

  // Keep local state in sync with job data
  $effect(() => {
    if (job) {
      localPriority = job.priority || 'normal';
      localStartDate = job.start_date || '';
      localStartTime = job.start_time || '';
      localDueDate = job.due_date || '';
      localDueTime = job.due_time || '';
    }
  });

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
    { value: 'proactive_followup', label: 'Proactive Followup' }
  ];

  function handleSave() {
    if (!job) return;

    // Simple reactive updates - update job object directly
    if (localPriority !== job.priority) {
      job.priority = localPriority;
    }
    if (localStartDate !== job.start_date) {
      job.start_date = localStartDate || null;
    }
    if (localStartTime !== job.start_time) {
      job.start_time = localStartTime || null;
    }
    if (localDueDate !== job.due_date) {
      job.due_date = localDueDate || null;
    }
    if (localDueTime !== job.due_time) {
      job.due_time = localDueTime || null;
    }
    
    // Popover will close automatically when clicking outside
  }

  function handleCancel() {
    // Reset local state to job values
    if (job) {
      localPriority = job.priority || 'normal';
      localStartDate = job.start_date || '';
      localStartTime = job.start_time || '';
      localDueDate = job.due_date || '';
      localDueTime = job.due_time || '';
    }
    // Popover will close automatically when clicking outside
  }
</script>

<BasePopoverButton
  bind:popover
  title="Schedule and Priority"
  panelWidth="280px"
  panelPosition="right"
  contentPadding="20px"
>
  <svelte:fragment slot="button-content">
    <img src="/icons/calendar-add.svg" alt="Schedule" class="calendar-icon" />
  </svelte:fragment>

  <svelte:fragment slot="panel-content">
    <h3 class="schedule-title">Schedule & Priority</h3>

    <form class="schedule-form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <!-- Priority Section -->
      <div class="form-section">
        <label class="form-label" for="priority-select-{jobId}">Priority</label>
        <FormSelect
          id="priority-select-{jobId}"
          bind:value={localPriority}
          options={priorityOptions}
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
            size="small"
          />
        </div>

        <div class="date-time-group">
          <label class="form-label" for="start-time-{jobId}">Start Time</label>
          <FormInput
            id="start-time-{jobId}"
            type="time"
            bind:value={localStartTime}
            size="small"
          />
        </div>

        <div class="date-time-group">
          <label class="form-label" for="due-date-{jobId}">Due Date</label>
          <FormInput
            id="due-date-{jobId}"
            type="date"
            bind:value={localDueDate}
            size="small"
          />
        </div>

        <div class="date-time-group">
          <label class="form-label" for="due-time-{jobId}">Due Time</label>
          <FormInput
            id="due-time-{jobId}"
            type="time"
            bind:value={localDueTime}
            size="small"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          type="button" 
          class="cancel-button"
          onclick={handleCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          class="save-button"
        >
          Save
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