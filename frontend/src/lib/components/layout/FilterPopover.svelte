<script lang="ts">
  import BasePopoverButton from '$lib/components/ui/BasePopoverButton.svelte';

  export let onFilterChange: (statuses: string[]) => void = () => {};

  let popover: any;

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

  // Type-safe event handler for checkbox changes
  function createCheckboxHandler(setValue: (val: boolean) => void, currentValue: boolean) {
    return (e: Event) => {
      const target = e.target as HTMLInputElement;
      handleCheckboxChange(target.checked, setValue, currentValue);
    };
  }

  $: hasActiveFilters = selectedStatuses.length > 0 && selectedStatuses.length < 5;

  // Notify parent when filters change
  $: onFilterChange(selectedStatuses);
</script>

<BasePopoverButton
  bind:popover
  title="Filter tasks"
  panelWidth="150px"
  panelPosition="center"
  contentPadding="16px"
>
  <svelte:fragment slot="button-content">
    <img src={hasActiveFilters ? "/icons/filter-active.svg" : "/icons/filter-inactive.svg"} alt="" class="filter-icon" class:active={hasActiveFilters} />
  </svelte:fragment>

  <svelte:fragment slot="panel-content">
    <h3 class="filter-title">Show…</h3>

    <div class="status-checkboxes">
      <label class="status-checkbox">
        <input 
          type="checkbox" 
          checked={newTaskChecked} 
          on:change={createCheckboxHandler((val) => newTaskChecked = val, newTaskChecked)}
          class="checkbox-input" 
        />
        <span class="checkbox-label">New</span>
      </label>
      <label class="status-checkbox">
        <input 
          type="checkbox" 
          checked={inProgressChecked} 
          on:change={createCheckboxHandler((val) => inProgressChecked = val, inProgressChecked)}
          class="checkbox-input" 
        />
        <span class="checkbox-label">In Progress</span>
      </label>
      <label class="status-checkbox">
        <input 
          type="checkbox" 
          checked={pausedChecked} 
          on:change={createCheckboxHandler((val) => pausedChecked = val, pausedChecked)}
          class="checkbox-input" 
        />
        <span class="checkbox-label">Paused</span>
      </label>
      <label class="status-checkbox">
        <input 
          type="checkbox" 
          checked={completedChecked} 
          on:change={createCheckboxHandler((val) => completedChecked = val, completedChecked)}
          class="checkbox-input" 
        />
        <span class="checkbox-label">Completed</span>
      </label>
      <label class="status-checkbox">
        <input 
          type="checkbox" 
          checked={cancelledChecked} 
          on:change={createCheckboxHandler((val) => cancelledChecked = val, cancelledChecked)}
          class="checkbox-input" 
        />
        <span class="checkbox-label">Cancelled</span>
      </label>
    </div>
  </svelte:fragment>
</BasePopoverButton>

<style>
  .filter-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .filter-icon.active {
    opacity: 1;
  }

  .filter-title {
    color: var(--text-primary);
    margin: 0 0 12px 0;
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

  /* Responsive adjustments are handled by BasePopoverButton */
</style>