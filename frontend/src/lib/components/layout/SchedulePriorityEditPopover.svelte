<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import FormSelect from '$lib/components/ui/FormSelect.svelte';
  import type { PopulatedJob } from '$lib/types/job';
  import { debugComponent } from '$lib/utils/debug';

  let {
    jobId,
    initialJob = null,
    disabled = false,
  }: {
    jobId: string;
    initialJob?: PopulatedJob | null;
    disabled?: boolean;
  } = $props();

  let basePopover = $state();

  // Use the initial job directly (reactive through layout store)
  const job = $derived(initialJob);

  // Local form state
  let localPriority = $state('');
  let localStartDate = $state('');
  let localStartTime = $state('');
  let localDueDate = $state('');
  let localDueTime = $state('');

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

  // Priority options (ordered by priority level - highest to lowest)
  const priorityOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'very_high', label: 'Very High' },
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low' },
    { value: 'proactive_followup', label: 'Proactive Followup' },
  ];

  async function handleSave() {
    if (!job) return;

    // Collect all changes into single update object
    const updates: Record<string, unknown> = {};

    if (localPriority !== job.priority) updates.priority = localPriority;
    if (localStartDate !== job.start_date) updates.start_date = localStartDate || null;
    if (localStartTime !== job.start_time) updates.start_time = localStartTime || null;
    if (localDueDate !== job.due_date) updates.due_date = localDueDate || null;
    if (localDueTime !== job.due_time) updates.due_time = localDueTime || null;

    if (Object.keys(updates).length > 0) {
      try {
        // Use ActiveRecord pattern - Zero.js handles optimistic updates and server sync
        const { Job } = await import('$lib/models/job');
        await Job.update(job.id, updates);
      } catch (error) {
        debugComponent.error('Job update failed', { error, jobId: job.id, updates });
        // TODO: Show error toast to user
      }
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

<BasePopover bind:popover={basePopover} preferredPlacement="bottom" panelWidth="280px" {disabled}>
  {#snippet trigger({ popover })}
    <button
      class="popover-button"
      class:disabled
      use:popover.button
      title={disabled ? 'Disabled' : 'Schedule and Priority'}
      {disabled}
      onclick={disabled ? undefined : (e) => e.stopPropagation()}
    >
      <img src="/icons/calendar-add.svg" alt="Schedule" class="calendar-icon" />
    </button>
  {/snippet}

  {#snippet children({ close: _close })}
    <div style="padding: 20px;">
      <h3 class="schedule-title">Schedule & Priority</h3>

      <form
        class="schedule-form"
        onsubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
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
            <FormInput id="due-date-{jobId}" type="date" bind:value={localDueDate} size="small" />
          </div>

          <div class="date-time-group">
            <label class="form-label" for="due-time-{jobId}">Due Time</label>
            <FormInput id="due-time-{jobId}" type="time" bind:value={localDueTime} size="small" />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button type="button" class="cancel-button" onclick={handleCancel}> Cancel </button>
          <button type="submit" class="save-button"> Save </button>
        </div>
      </form>
    </div>
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

  .popover-button:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .popover-button:disabled,
  .popover-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

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

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button,
    .cancel-button,
    .save-button {
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
