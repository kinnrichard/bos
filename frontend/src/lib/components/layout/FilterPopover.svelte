<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import '$lib/styles/popover-common.css';

  export let onFilterChange: (statuses: string[]) => void = () => {};

  let basePopover: any;
  export { basePopover as popover };

  // Status options configuration
  const statusOptions = [
    { id: 'new_task', value: 'new_task', label: 'New' },
    { id: 'in_progress', value: 'in_progress', label: 'In Progress' },
    { id: 'paused', value: 'paused', label: 'Paused' },
    { id: 'successfully_completed', value: 'successfully_completed', label: 'Completed' },
    { id: 'cancelled', value: 'cancelled', label: 'Cancelled' }
  ];

  // Start with all statuses selected (default behavior)
  let selectedStatuses: string[] = statusOptions.map(option => option.value);

  // Handle status toggle with "prevent all unchecked" logic
  function handleStatusToggle(option: { value: string; label: string }) {
    const isCurrentlySelected = selectedStatuses.includes(option.value);
    
    if (isCurrentlySelected) {
      // User wants to uncheck - check if this would make all unchecked
      const newSelected = selectedStatuses.filter(status => status !== option.value);
      
      if (newSelected.length === 0) {
        // Would make all unchecked - select all instead
        selectedStatuses = statusOptions.map(opt => opt.value);
      } else {
        // Safe to uncheck this item
        selectedStatuses = newSelected;
      }
    } else {
      // User wants to check - add to selection
      selectedStatuses = [...selectedStatuses, option.value];
    }
  }

  $: hasActiveFilters = selectedStatuses.length > 0 && selectedStatuses.length < statusOptions.length;

  // Notify parent when filters change
  $: onFilterChange(selectedStatuses);
</script>

<BasePopover 
  bind:popover={basePopover}
  preferredPlacement="bottom"
  panelWidth="max-content"
>
  <svelte:fragment slot="trigger" let:popover>
    <button 
      class="popover-button"
      use:popover.button
      title="Filter tasks"
      on:click|stopPropagation
    >
      <img 
        src={hasActiveFilters ? "/icons/filter-active.svg" : "/icons/filter-inactive.svg"} 
        alt="" 
        class="filter-icon" 
        class:active={hasActiveFilters} 
      />
    </button>
  </svelte:fragment>

  <div class="filter-content">
    <h3 class="popover-title">Show…</h3>
    
    <PopoverOptionList
      options={statusOptions}
      loading={false}
      maxHeight="min(300px, 40vh)"
      onOptionClick={handleStatusToggle}
      isSelected={(option) => selectedStatuses.includes(option.value)}
    >
      <svelte:fragment slot="option-content" let:option>
        <span class="popover-option-main-label">{option.label}</span>
        
        <div class="popover-checkmark-container">
          {#if selectedStatuses.includes(option.value)}
            <img src="/icons/checkmark.svg" alt="Selected" class="popover-checkmark-icon" />
          {/if}
        </div>
      </svelte:fragment>
    </PopoverOptionList>
  </div>
</BasePopover>

<style>
  .popover-button {
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
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
  }

  .popover-button:hover {
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

  .filter-content {
    padding: 16px;
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button {
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