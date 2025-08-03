<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import DateTimeEditor from './DateTimeEditor.svelte';
  import type { PopulatedJob } from '$lib/types/job';
  import { formatDisplayDate, validateDateRange } from '$lib/utils/date-formatting';
  import { debugComponent } from '$lib/utils/debug';
  import { slide } from 'svelte/transition';
  import '$lib/styles/popover-common.css';

  interface Props {
    jobId: string;
    initialJob?: PopulatedJob | null;
    disabled?: boolean;
  }

  let {
    jobId: _jobId, // eslint-disable-line @typescript-eslint/no-unused-vars
    initialJob = null,
    disabled = false,
  }: Props = $props();

  // Component state
  let basePopover = $state();
  let currentView = $state<'menu' | 'start-date' | 'due-date' | 'followup-date'>('menu');
  let editingFollowupId = $state<string | null>(null);

  // Derive job data
  const job = $derived(initialJob);
  const startDate = $derived(job?.starts_at ? new Date(job.starts_at) : null);
  const dueDate = $derived(job?.due_at ? new Date(job.due_at) : null);
  const followupDates = $derived(job?.scheduledDateTimes || []);

  // Create menu options
  const menuOptions = $derived([
    // Start Date
    {
      id: 'start-date',
      value: 'start-date',
      label: startDate ? `Start: ${formatDisplayDate(startDate)}` : 'Set start date',
      icon: '/icons/calendar.svg',
    },

    // Due Date
    {
      id: 'due-date',
      value: 'due-date',
      label: dueDate ? `Due: ${formatDisplayDate(dueDate)}` : 'Set due date',
      icon: '/icons/calendar-with-badge.svg',
    },

    // Separator and followup dates if they exist
    ...(followupDates.length > 0
      ? [
          {
            id: 'followup-separator',
            divider: true,
          },
          ...followupDates.map((followup, index) => ({
            id: `followup-${followup.id}`,
            value: `followup-${followup.id}`,
            label: followup.scheduled_at
              ? `Followup: ${formatDisplayDate(followup.scheduled_at)}`
              : `Followup ${index + 1}`,
            icon: '/icons/calendar.svg',
          })),
        ]
      : []),

    // Add followup option
    {
      id: 'add-followup-separator',
      divider: true,
    },
    {
      id: 'add-followup',
      value: 'add-followup',
      label: 'Add followup date',
      icon: '/icons/plus.svg',
    },
  ]);

  // Handle menu option selection
  function handleMenuSelect(value: string) {
    if (value === 'start-date') {
      currentView = 'start-date';
    } else if (value === 'due-date') {
      currentView = 'due-date';
    } else if (value === 'add-followup') {
      currentView = 'followup-date';
      editingFollowupId = null;
    } else if (value.startsWith('followup-')) {
      const followupId = value.replace('followup-', '');
      editingFollowupId = followupId;
      currentView = 'followup-date';
    }
  }

  // Handle back to menu
  function handleBackToMenu() {
    currentView = 'menu';
    editingFollowupId = null;
  }

  // Handle start date save
  async function handleStartDateSave(date: Date | null) {
    if (!job) return;

    try {
      const updates: Record<string, unknown> = {
        starts_at: date ? date.toISOString() : null,
        start_time_set: date ? true : false,
      };

      // Validate date range
      if (date && dueDate) {
        const validation = validateDateRange(date, dueDate);
        if (!validation.isValid) {
          // TODO: Show error toast
          debugComponent.error('Date validation failed', validation.error);
          return;
        }
      }

      const { Job } = await import('$lib/models/job');
      await Job.update(job.id, updates);

      currentView = 'menu';
    } catch (error) {
      debugComponent.error('Failed to update start date', { error, jobId: job.id });
    }
  }

  // Handle due date save
  async function handleDueDateSave(date: Date | null) {
    if (!job) return;

    try {
      const updates: Record<string, unknown> = {
        due_at: date ? date.toISOString() : null,
        due_time_set: date ? true : false,
      };

      // Validate date range
      if (date && startDate) {
        const validation = validateDateRange(startDate, date);
        if (!validation.isValid) {
          // TODO: Show error toast
          debugComponent.error('Date validation failed', validation.error);
          return;
        }
      }

      const { Job } = await import('$lib/models/job');
      await Job.update(job.id, updates);

      currentView = 'menu';
    } catch (error) {
      debugComponent.error('Failed to update due date', { error, jobId: job.id });
    }
  }

  // Handle followup date save
  async function handleFollowupDateSave(date: Date | null) {
    if (!job) return;

    try {
      if (editingFollowupId) {
        // Update existing followup
        if (date) {
          const { ScheduledDateTime } = await import('$lib/models/scheduled-date-time');
          await ScheduledDateTime.update(editingFollowupId, {
            scheduled_at: date.toISOString(),
            scheduled_time_set: true,
          });
        } else {
          // Remove followup
          await handleFollowupRemove();
          return;
        }
      } else if (date) {
        // Create new followup
        const { ScheduledDateTime } = await import('$lib/models/scheduled-date-time');
        await ScheduledDateTime.create({
          schedulable_type: 'Job',
          schedulable_id: job.id,
          scheduled_type: 'followup',
          scheduled_at: date.toISOString(),
          scheduled_time_set: true,
        });
      }

      currentView = 'menu';
      editingFollowupId = null;
    } catch (error) {
      debugComponent.error('Failed to update followup date', {
        error,
        jobId: job.id,
        editingFollowupId,
      });
    }
  }

  // Handle followup remove
  async function handleFollowupRemove() {
    if (!editingFollowupId) return;

    try {
      const { ScheduledDateTime } = await import('$lib/models/scheduled-date-time');
      await ScheduledDateTime.destroy(editingFollowupId);

      currentView = 'menu';
      editingFollowupId = null;
    } catch (error) {
      debugComponent.error('Failed to remove followup date', {
        error,
        followupId: editingFollowupId,
      });
    }
  }

  // Get editing followup data
  const editingFollowup = $derived(
    editingFollowupId ? followupDates.find((f) => f.id === editingFollowupId) || null : null
  );

  // Get followup value and time set properly
  const followupValue = $derived(editingFollowup?.scheduled_at || null);
  const followupTimeSet = $derived(editingFollowup?.scheduled_time_set || false);
</script>

<BasePopover
  bind:popover={basePopover}
  preferredPlacement="bottom"
  panelWidth="320px"
  {disabled}
  closeOnClickOutside={currentView === 'menu'}
>
  {#snippet trigger({ popover })}
    <button
      class="popover-button"
      class:disabled
      use:popover.button
      title={disabled ? 'Disabled' : 'Schedule'}
      {disabled}
      onclick={disabled ? undefined : (e) => e.stopPropagation()}
    >
      <img src="/icons/calendar-add.svg" alt="Schedule" class="calendar-icon" />
    </button>
  {/snippet}

  {#snippet children({ close: _close })}
    <div class="schedule-popover-container">
      {#if currentView === 'menu'}
        <div class="schedule-menu" transition:slide={{ duration: 200, axis: 'x' }}>
          <div class="schedule-header">
            <h3 class="schedule-title">Schedule</h3>
          </div>

          <PopoverMenu
            options={menuOptions}
            onSelect={handleMenuSelect}
            showIcons={true}
            showCheckmarks={false}
            className="schedule-menu-inner"
          />
        </div>
      {:else if currentView === 'start-date'}
        <div class="schedule-editor" transition:slide={{ duration: 200, axis: 'x' }}>
          <DateTimeEditor
            title="Start Date"
            value={startDate}
            timeSet={job?.start_time_set || false}
            onSave={handleStartDateSave}
            onCancel={handleBackToMenu}
            onRemove={startDate ? () => handleStartDateSave(null) : undefined}
            canRemove={!!startDate}
            placeholder="Select start date"
          />
        </div>
      {:else if currentView === 'due-date'}
        <div class="schedule-editor" transition:slide={{ duration: 200, axis: 'x' }}>
          <DateTimeEditor
            title="Due Date"
            value={dueDate}
            timeSet={job?.due_time_set || false}
            onSave={handleDueDateSave}
            onCancel={handleBackToMenu}
            onRemove={dueDate ? () => handleDueDateSave(null) : undefined}
            canRemove={!!dueDate}
            placeholder="Select due date"
          />
        </div>
      {:else if currentView === 'followup-date'}
        <div class="schedule-editor" transition:slide={{ duration: 200, axis: 'x' }}>
          <DateTimeEditor
            title={editingFollowup ? 'Edit Followup' : 'Add Followup'}
            value={followupValue}
            timeSet={followupTimeSet}
            onSave={handleFollowupDateSave}
            onCancel={handleBackToMenu}
            onRemove={editingFollowup ? handleFollowupRemove : undefined}
            canRemove={!!editingFollowup}
            placeholder="Select followup date"
          />
        </div>
      {/if}
    </div>
  {/snippet}
</BasePopover>

<style>
  /* Component-specific styling only - shared .popover-button styles in popover-common.css */
  .calendar-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .schedule-popover-container {
    position: relative;
    width: 100%;
    height: 500px; /* Fixed height for smooth transitions */
    overflow: hidden;
  }

  .schedule-menu,
  .schedule-editor {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .schedule-header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--border-primary);
  }

  .schedule-title {
    color: var(--text-primary);
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  :global(.schedule-menu-inner) {
    padding: 8px 4px;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .schedule-popover-container {
      height: 450px;
    }

    .schedule-header {
      padding: 12px 16px 8px;
    }

    .schedule-title {
      font-size: 15px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .schedule-menu,
    .schedule-editor {
      transition: none;
    }
  }
</style>
