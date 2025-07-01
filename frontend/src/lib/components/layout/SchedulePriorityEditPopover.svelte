<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';
  import { useJobQuery, useUpdateJobMutation } from '$lib/api/hooks/jobs';
  import type { PopulatedJob } from '$lib/types/job';

  export let jobId: string;
  export let initialJob: PopulatedJob | null = null;

  const popover = createPopover();
  
  const jobQuery = useJobQuery(jobId);
  const updateJobMutation = useUpdateJobMutation();

  // Derived state from TanStack Query cache
  $: job = $jobQuery.data || initialJob;
  $: isLoading = $updateJobMutation.isPending;
  $: error = $updateJobMutation.error;

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

<div class="schedule-priority-popover">
  <button 
    type="button"
    class="calendar-button"
    use:popover.button
    title="Edit schedule and priority"
  >
    <img src="/icons/calendar-add.svg" alt="Schedule" class="calendar-icon" />
  </button>

  {#if $popover.expanded}
    <div 
      class="schedule-panel"
      use:popover.panel
      in:fade={{ duration: 0 }}
      out:fade={{ duration: 150 }}
    >
      <div class="schedule-content">
        <h3 class="schedule-title">Schedule & Priority</h3>
        
        {#if error}
          <div class="error-message">
            Failed to update - please try again
          </div>
        {/if}

        <form class="schedule-form" on:submit|preventDefault={handleSave}>
          <!-- Priority Section -->
          <div class="form-section">
            <label class="form-label" for="priority-select-{jobId}">Priority</label>
            <select 
              id="priority-select-{jobId}"
              bind:value={localPriority}
              disabled={isLoading}
              class="form-select"
            >
              {#each priorityOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Schedule Section -->
          <div class="form-section">
            <h4 class="section-title">Schedule</h4>
            
            <div class="date-time-group">
              <label class="form-label" for="start-date-{jobId}">Start Date</label>
              <input 
                id="start-date-{jobId}"
                type="date"
                bind:value={localStartDate}
                disabled={isLoading}
                class="form-input"
              />
            </div>

            <div class="date-time-group">
              <label class="form-label" for="start-time-{jobId}">Start Time</label>
              <input 
                id="start-time-{jobId}"
                type="time"
                bind:value={localStartTime}
                disabled={isLoading}
                class="form-input"
              />
            </div>

            <div class="date-time-group">
              <label class="form-label" for="due-date-{jobId}">Due Date</label>
              <input 
                id="due-date-{jobId}"
                type="date"
                bind:value={localDueDate}
                disabled={isLoading}
                class="form-input"
              />
            </div>

            <div class="date-time-group">
              <label class="form-label" for="due-time-{jobId}">Due Time</label>
              <input 
                id="due-time-{jobId}"
                type="time"
                bind:value={localDueTime}
                disabled={isLoading}
                class="form-input"
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
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  .schedule-priority-popover {
    position: relative;
  }

  .calendar-button {
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
  }

  .calendar-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .calendar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .schedule-panel {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 280px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  /* Arrow/tail pointing up to the button */
  .schedule-panel::before {
    content: '';
    position: absolute;
    top: -12px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .schedule-panel::after {
    content: '';
    position: absolute;
    top: -10px;
    right: 22px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  .schedule-content {
    padding: 20px;
  }

  .schedule-title {
    color: var(--text-primary);
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .error-message {
    color: var(--accent-red);
    font-size: 12px;
    margin-bottom: 12px;
    text-align: center;
    padding: 8px;
    background-color: var(--bg-error, rgba(239, 68, 68, 0.1));
    border-radius: 6px;
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

  .form-input,
  .form-select {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    color: var(--text-primary);
    transition: border-color 0.15s ease;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: var(--accent-blue);
  }

  .form-input:disabled,
  .form-select:disabled {
    opacity: 0.6;
    pointer-events: none;
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
    .schedule-panel {
      width: 260px;
      right: -20px;
    }

    .schedule-panel::before {
      right: 40px;
    }

    .schedule-panel::after {
      right: 42px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .calendar-button,
    .form-input,
    .form-select,
    .cancel-button,
    .save-button {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .calendar-button {
      border-width: 2px;
    }

    .form-input,
    .form-select {
      border-width: 2px;
    }
  }
</style>