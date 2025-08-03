<script lang="ts">
  import FormInput from '$lib/components/ui/FormInput.svelte';
  import { formatTimeForInput, parseTimeFromInput } from '$lib/utils/date-formatting';
  import { ChevronLeft, Trash2 } from 'lucide-svelte';

  interface Props {
    title: string;
    baseDate: Date; // The date that this time is for
    value?: Date | null; // Date with time set
    onSave: (timeDate: Date | null) => void;
    onCancel: () => void;
    onRemove?: () => void;
    canRemove?: boolean;
  }

  let {
    title,
    baseDate,
    value = null,
    onSave,
    onCancel,
    onRemove,
    canRemove = false,
  }: Props = $props();

  // Time input value
  let timeInputValue = $state('');
  let selectedTime = $state<Date | null>(null);

  // Initialize from prop value
  $effect(() => {
    if (value && !isNaN(value.getTime())) {
      timeInputValue = formatTimeForInput(value);
      selectedTime = value;
    } else {
      // Default to 9:00 AM
      const defaultTime = new Date(baseDate);
      defaultTime.setHours(9, 0, 0, 0);
      timeInputValue = formatTimeForInput(defaultTime);
      selectedTime = defaultTime;
    }
  });

  // Handle time input change
  function handleTimeInputChange() {
    selectedTime = parseTimeFromInput(timeInputValue, baseDate);
  }

  // Save the time
  function handleSave() {
    if (selectedTime) {
      // Combine the base date with the selected time
      const finalDate = new Date(baseDate);
      finalDate.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        selectedTime.getSeconds(),
        0
      );
      onSave(finalDate);
    } else {
      onSave(null);
    }
  }

  // Handle remove
  function handleRemove() {
    // Set the date back to just the date without time
    const dateOnly = new Date(baseDate);
    dateOnly.setHours(0, 0, 0, 0);
    onSave(dateOnly);
    onRemove?.();
  }

  // Format display time
  function formatDisplayTime(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
</script>

<div class="time-editor">
  <!-- Toolbar -->
  <div class="time-toolbar">
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
        aria-label="Remove time"
      >
        <Trash2 size={18} />
      </button>
    {:else}
      <div class="toolbar-spacer"></div>
    {/if}
  </div>

  <!-- Content -->
  <div class="time-content">
    <!-- Time Input -->
    <div class="time-input-section">
      <label for="time-input" class="input-label">Select Time</label>
      <FormInput
        id="time-input"
        type="time"
        bind:value={timeInputValue}
        onchange={handleTimeInputChange}
        size="large"
        placeholder="Select time"
      />
    </div>

    <!-- Time Preview -->
    {#if selectedTime}
      <div class="time-preview">
        <span class="preview-label">Selected time:</span>
        <span class="preview-value">
          {formatDisplayTime(selectedTime)}
        </span>
      </div>
    {/if}

    <!-- Quick select buttons -->
    <div class="quick-select-section">
      <p class="quick-select-label">Quick select:</p>
      <div class="quick-select-grid">
        <button
          type="button"
          class="quick-select-button"
          onclick={() => {
            const date = new Date(baseDate);
            date.setHours(9, 0, 0, 0);
            selectedTime = date;
            timeInputValue = formatTimeForInput(date);
          }}
        >
          9:00 AM
        </button>
        <button
          type="button"
          class="quick-select-button"
          onclick={() => {
            const date = new Date(baseDate);
            date.setHours(12, 0, 0, 0);
            selectedTime = date;
            timeInputValue = formatTimeForInput(date);
          }}
        >
          12:00 PM
        </button>
        <button
          type="button"
          class="quick-select-button"
          onclick={() => {
            const date = new Date(baseDate);
            date.setHours(15, 0, 0, 0);
            selectedTime = date;
            timeInputValue = formatTimeForInput(date);
          }}
        >
          3:00 PM
        </button>
        <button
          type="button"
          class="quick-select-button"
          onclick={() => {
            const date = new Date(baseDate);
            date.setHours(17, 0, 0, 0);
            selectedTime = date;
            timeInputValue = formatTimeForInput(date);
          }}
        >
          5:00 PM
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="time-actions">
      <button type="button" class="action-button action-cancel" onclick={onCancel}> Cancel </button>
      <button type="button" class="action-button action-save" onclick={handleSave}> Save </button>
    </div>
  </div>
</div>

<style>
  .time-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .time-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-primary);
  }

  .toolbar-back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: default;
    transition: all 0.15s ease;
  }

  .toolbar-back-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .toolbar-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    text-align: center;
  }

  .toolbar-remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--accent-red);
    cursor: default;
    transition: all 0.15s ease;
  }

  .toolbar-remove-button:hover {
    background: rgba(255, 69, 58, 0.1);
  }

  .toolbar-spacer {
    width: 32px;
  }

  .time-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .time-input-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .time-preview {
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .preview-label {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .preview-value {
    font-size: 16px;
    color: var(--text-primary);
    font-weight: 600;
  }

  .quick-select-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .quick-select-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
  }

  .quick-select-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .quick-select-button {
    padding: 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: default;
    transition: all 0.15s ease;
  }

  .quick-select-button:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .time-actions {
    display: flex;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-primary);
    margin-top: auto;
  }

  .action-button {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: default;
    transition: all 0.15s ease;
  }

  .action-cancel {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .action-cancel:hover {
    background: var(--bg-quaternary, #4a4a4c);
  }

  .action-save {
    background: var(--accent-blue);
    color: white;
  }

  .action-save:hover {
    background: var(--accent-blue-hover);
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .time-content {
      padding: 16px;
      gap: 16px;
    }

    .time-toolbar {
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
    .action-button,
    .quick-select-button {
      transition: none;
    }
  }
</style>
