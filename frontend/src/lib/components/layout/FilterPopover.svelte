<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';

  export let onFilterChange: (statuses: string[]) => void = () => {};

  const popover = createPopover();

  // Individual boolean variables as source of truth
  let newTaskChecked = true;
  let inProgressChecked = true;
  let pausedChecked = true;
  let completedChecked = true;
  let cancelledChecked = true;

  let selectedStatuses: string[] = [];

  // Derive selectedStatuses from the boolean variables
  $: selectedStatuses = [
    newTaskChecked && 'new_task',
    inProgressChecked && 'in_progress', 
    pausedChecked && 'paused',
    completedChecked && 'successfully_completed',
    cancelledChecked && 'cancelled'
  ].filter(Boolean) as string[];

  // Handle the "uncheck last item" case with event handlers on each checkbox
  function handleCheckboxChange(checked: boolean, setValue: (val: boolean) => void, currentValue: boolean) {
    if (!checked && currentValue) {
      // User is unchecking this item - check if this would make all unchecked
      // We need to temporarily apply this change to see what the result would be
      setValue(false);
      
      // Check if all are now unchecked
      if (!newTaskChecked && !inProgressChecked && !pausedChecked && !completedChecked && !cancelledChecked) {
        // Select all instead
        newTaskChecked = true;
        inProgressChecked = true;
        pausedChecked = true;
        completedChecked = true;
        cancelledChecked = true;
      }
    } else {
      setValue(checked);
    }
  }

  $: hasActiveFilters = selectedStatuses.length > 0 && selectedStatuses.length < 5;

  // Notify parent when filters change
  $: onFilterChange(selectedStatuses);
</script>

<div class="filter-popover">
  <button 
    class="filter-button"
    use:popover.button
  >
    <img src={hasActiveFilters ? "/icons/filter-active.svg" : "/icons/filter.svg"} alt="" class="filter-icon" class:active={hasActiveFilters} />
  </button>

  {#if $popover.expanded}
    <div 
      class="filter-panel"
      use:popover.panel
      in:fade={{ duration: 0 }}
      out:fade={{ duration: 150 }}
    >
      <div class="filter-content">
          <h3 class="filter-title">Show…</h3>

        <div class="status-checkboxes">
          <label class="status-checkbox">
            <input 
              type="checkbox" 
              checked={newTaskChecked} 
              on:change={(e) => handleCheckboxChange(e.target.checked, (val) => newTaskChecked = val, newTaskChecked)}
              class="checkbox-input" 
            />
            <span class="checkbox-label">New</span>
          </label>
          <label class="status-checkbox">
            <input 
              type="checkbox" 
              checked={inProgressChecked} 
              on:change={(e) => handleCheckboxChange(e.target.checked, (val) => inProgressChecked = val, inProgressChecked)}
              class="checkbox-input" 
            />
            <span class="checkbox-label">In Progress</span>
          </label>
          <label class="status-checkbox">
            <input 
              type="checkbox" 
              checked={pausedChecked} 
              on:change={(e) => handleCheckboxChange(e.target.checked, (val) => pausedChecked = val, pausedChecked)}
              class="checkbox-input" 
            />
            <span class="checkbox-label">Paused</span>
          </label>
          <label class="status-checkbox">
            <input 
              type="checkbox" 
              checked={completedChecked} 
              on:change={(e) => handleCheckboxChange(e.target.checked, (val) => completedChecked = val, completedChecked)}
              class="checkbox-input" 
            />
            <span class="checkbox-label">Completed</span>
          </label>
          <label class="status-checkbox">
            <input 
              type="checkbox" 
              checked={cancelledChecked} 
              on:change={(e) => handleCheckboxChange(e.target.checked, (val) => cancelledChecked = val, cancelledChecked)}
              class="checkbox-input" 
            />
            <span class="checkbox-label">Cancelled</span>
          </label>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-popover {
    position: relative;
  }

  .filter-button {
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
    position: relative;
  }

  .filter-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .filter-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .filter-icon.active {
    opacity: 1;
  }

  .filter-panel {
    position: absolute;
    top: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    width: 150px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  /* Arrow/tail pointing up to the button */
  .filter-panel::before {
    content: '';
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .filter-panel::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  .filter-content {
    padding: 16px;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-primary);
  }

  .filter-title {
    color: var(--text-primary);
    margin: 0;
  }

  .status-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .status-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    width: fit-content;
  }

  .checkbox-input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-blue);
  }

  .checkbox-label {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.2;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .filter-panel {
      width: 140px;
    }
  }
</style>