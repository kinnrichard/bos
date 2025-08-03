<script lang="ts">
  import Calendar from '$lib/components/ui/Calendar.svelte';
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import {
    formatDisplayDate,
    formatDateForInput,
    formatTimeForInput,
    combineDateAndTime,
    parseDateFromInput,
    parseTimeFromInput,
  } from '$lib/utils/date-formatting';
  import { ChevronLeft, Trash2 } from 'lucide-svelte';

  interface Props {
    title: string;
    value?: Date | string | number | null;
    onSave: (date: Date | null) => void;
    onCancel: () => void;
    onRemove?: () => void;
    timeSet?: boolean;
    onTimeSetChange?: (set: boolean) => void;
    canRemove?: boolean;
    placeholder?: string;
  }

  let {
    title,
    value = null,
    onSave,
    onCancel,
    onRemove,
    timeSet = false,
    onTimeSetChange,
    canRemove = false,
    placeholder = 'Select date',
  }: Props = $props();

  // Convert value to Date object
  let selectedDate = $state<Date | null>(null);
  let selectedTime = $state<Date | null>(null);
  let includeTime = $state(timeSet);

  // Date input values
  let dateInputValue = $state('');
  let timeInputValue = $state('');

  // Initialize from prop value
  $effect(() => {
    if (value) {
      let dateObj: Date;

      if (typeof value === 'string') {
        dateObj = new Date(value);
      } else if (typeof value === 'number') {
        dateObj = new Date(value);
      } else {
        dateObj = value;
      }

      if (!isNaN(dateObj.getTime())) {
        selectedDate = dateObj;
        selectedTime = dateObj;
        dateInputValue = formatDateForInput(dateObj);
        timeInputValue = formatTimeForInput(dateObj);
      }
    } else {
      selectedDate = null;
      selectedTime = null;
      dateInputValue = '';
      timeInputValue = '';
    }

    includeTime = timeSet;
  });

  // Handle calendar date selection
  function handleCalendarChange(date: Date | null) {
    selectedDate = date;
    if (date) {
      dateInputValue = formatDateForInput(date);
    } else {
      dateInputValue = '';
    }
  }

  // Handle date input change
  function handleDateInputChange() {
    const parsed = parseDateFromInput(dateInputValue);
    selectedDate = parsed;
  }

  // Handle time input change
  function handleTimeInputChange() {
    if (timeInputValue && selectedDate) {
      selectedTime = parseTimeFromInput(timeInputValue, selectedDate);
    }
  }

  // Handle time checkbox change
  function handleTimeCheckboxChange() {
    includeTime = !includeTime;
    onTimeSetChange?.(includeTime);

    if (!includeTime) {
      timeInputValue = '';
      selectedTime = null;
    }
  }

  // Save the date/time combination
  function handleSave() {
    if (!selectedDate) {
      onSave(null);
      return;
    }

    let finalDate: Date;

    if (includeTime && selectedTime) {
      finalDate = combineDateAndTime(selectedDate, selectedTime) || selectedDate;
    } else {
      // Use start of day if no time
      finalDate = new Date(selectedDate);
      finalDate.setHours(0, 0, 0, 0);
    }

    onSave(finalDate);
  }

  // Handle remove
  function handleRemove() {
    onRemove?.();
  }
</script>

<div class="datetime-editor">
  <!-- Toolbar -->
  <div class="datetime-toolbar">
    <button
      class="toolbar-back-button"
      onclick={onCancel}
      type="button"
      aria-label="Back to schedule menu"
    >
      <ChevronLeft size={20} />
    </button>

    <h3 class="toolbar-title">{title}</h3>

    {#if canRemove}
      <button
        class="toolbar-remove-button"
        onclick={handleRemove}
        type="button"
        aria-label="Remove {title.toLowerCase()}"
      >
        <Trash2 size={18} />
      </button>
    {:else}
      <div class="toolbar-spacer"></div>
    {/if}
  </div>

  <!-- Content -->
  <div class="datetime-content">
    <!-- Calendar -->
    <div class="calendar-section">
      <Calendar
        value={selectedDate}
        onValueChange={handleCalendarChange}
        placeholder={new Date()}
        className="schedule-calendar"
      />
    </div>

    <!-- Date Input (backup/manual entry) -->
    <div class="date-input-section">
      <label for="date-input" class="input-label">Date</label>
      <FormInput
        id="date-input"
        type="date"
        bind:value={dateInputValue}
        onchange={handleDateInputChange}
        size="small"
        {placeholder}
      />
    </div>

    <!-- Time Section -->
    <div class="time-section">
      <div class="time-checkbox-row">
        <input
          type="checkbox"
          id="include-time"
          bind:checked={includeTime}
          onchange={handleTimeCheckboxChange}
          class="time-checkbox"
        />
        <label for="include-time" class="time-checkbox-label"> Include specific time </label>
      </div>

      {#if includeTime}
        <div class="time-input-section">
          <label for="time-input" class="input-label">Time</label>
          <FormInput
            id="time-input"
            type="time"
            bind:value={timeInputValue}
            onchange={handleTimeInputChange}
            size="small"
            placeholder="12:00"
          />
        </div>
      {/if}
    </div>

    <!-- Preview -->
    {#if selectedDate}
      <div class="date-preview">
        <span class="preview-label">Selected:</span>
        <span class="preview-value">
          {formatDisplayDate(selectedDate)}
          {#if includeTime && selectedTime}
            at {formatTimeForInput(selectedTime)}
          {/if}
        </span>
      </div>
    {/if}

    <!-- Actions -->
    <div class="datetime-actions">
      <button type="button" class="action-button action-cancel" onclick={onCancel}> Cancel </button>
      <button type="button" class="action-button action-save" onclick={handleSave}> Save </button>
    </div>
  </div>
</div>

<style>
  .datetime-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary);
  }

  /* Toolbar */
  .datetime-toolbar {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-primary);
  }

  .toolbar-back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    margin-right: 12px;
  }

  .toolbar-back-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .toolbar-title {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .toolbar-remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--text-danger, #ef4444);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-remove-button:hover {
    background: var(--bg-danger, rgba(239, 68, 68, 0.1));
  }

  .toolbar-spacer {
    width: 36px;
  }

  /* Content */
  .datetime-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .calendar-section {
    display: flex;
    justify-content: center;
  }

  :global(.schedule-calendar) {
    border: none;
    box-shadow: none;
    background: transparent;
  }

  /* Inputs */
  .date-input-section,
  .time-input-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .input-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Time Section */
  .time-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .time-checkbox-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .time-checkbox {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-blue);
  }

  .time-checkbox-label {
    font-size: 14px;
    color: var(--text-primary);
    cursor: pointer;
    user-select: none;
  }

  /* Preview */
  .date-preview {
    padding: 12px 16px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .preview-value {
    font-size: 14px;
    color: var(--text-primary);
    font-weight: 500;
  }

  /* Actions */
  .datetime-actions {
    display: flex;
    gap: 12px;
    margin-top: auto;
    padding-top: 20px;
  }

  .action-button {
    flex: 1;
    padding: 12px 20px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid;
  }

  .action-cancel {
    background: var(--bg-tertiary);
    border-color: var(--border-primary);
    color: var(--text-secondary);
  }

  .action-cancel:hover {
    background: var(--bg-quaternary);
    color: var(--text-primary);
  }

  .action-save {
    background: var(--accent-blue);
    border-color: var(--accent-blue);
    color: white;
  }

  .action-save:hover {
    background: var(--accent-blue-dark, #0066cc);
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .datetime-content {
      padding: 16px;
      gap: 16px;
    }

    .datetime-toolbar {
      padding: 12px 16px;
    }

    .toolbar-title {
      font-size: 16px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .toolbar-back-button,
    .toolbar-remove-button,
    .action-button {
      transition: none;
    }
  }
</style>
