<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverOptionList from '$lib/components/ui/PopoverOptionList.svelte';
  import '$lib/styles/popover-common.css';

  interface Props {
    onFilterChange?: (statuses: string[]) => void;
    onDeletedToggle?: (showDeleted: boolean) => void;
  }

  let { onFilterChange = () => {}, onDeletedToggle = () => {} }: Props = $props();

  let basePopover: any = $state();

  // Reactive state for showing deleted tasks using Svelte 5 $state
  let showDeleted = $state(false);

  // Status options configuration
  const statusOptions = [
    { id: 'new_task', value: 'new_task', label: 'New' },
    { id: 'in_progress', value: 'in_progress', label: 'In Progress' },
    { id: 'paused', value: 'paused', label: 'Paused' },
    { id: 'successfully_completed', value: 'successfully_completed', label: 'Completed' },
    { id: 'cancelled', value: 'cancelled', label: 'Cancelled' }
  ];

  // Start with all statuses selected (default behavior)
  let selectedStatuses: string[] = $state(statusOptions.map(option => option.value));

  // Handle status toggle with "prevent all unchecked" logic
  function handleStatusToggle(option: { value: string; label: string }, event?: MouseEvent) {
    // Easter egg: Option-click for exclusive selection or toggle to all
    if (event?.altKey) {
      // Check if already exclusively selected - if so, select all
      if (selectedStatuses.length === 1 && selectedStatuses.includes(option.value)) {
        selectedStatuses = statusOptions.map(opt => opt.value);
      } else {
        // Otherwise, select only this option
        selectedStatuses = [option.value];
      }
      return;
    }
    
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

  // Use $derived for computed values in Svelte 5
  let hasActiveFilters = $derived(selectedStatuses.length > 0 && selectedStatuses.length < statusOptions.length || showDeleted);

  // Use $effect to notify parent when filters change
  $effect(() => {
    onFilterChange(selectedStatuses);
  });
  
  // Use $effect to notify parent when deleted toggle changes  
  $effect(() => {
    onDeletedToggle(showDeleted);
  });

  // Toggle deleted task visibility
  function toggleDeleted() {
    showDeleted = !showDeleted;
  }
</script>

<BasePopover 
  bind:popover={basePopover}
  preferredPlacement="bottom"
  panelWidth="max-content"
>
  {#snippet trigger({ popover })}
    <button 
      class="popover-button"
      use:popover.button
      title="Filter tasks"
      onclick={(e) => e.stopPropagation()}
    >
      <img 
        src={hasActiveFilters ? "/icons/filter-active.svg" : "/icons/filter-inactive.svg"} 
        alt="" 
        class="filter-icon" 
        class:active={hasActiveFilters} 
      />
    </button>
  {/snippet}

  {#snippet children({ close })}
    <div class="filter-content">
    <h3 class="popover-title">Show…</h3>
    
    <PopoverOptionList
      options={statusOptions}
      loading={false}
      maxHeight="min(300px, 40vh)"
      onOptionClick={handleStatusToggle}
      isSelected={(option) => selectedStatuses.includes(option.value)}
    >
      {#snippet optionContent({ option })}
        <span class="popover-option-main-label">{option.label}</span>
        
        <div class="popover-checkmark-container">
          {#if selectedStatuses.includes(option.value)}
            <img src="/icons/checkmark.svg" alt="Selected" class="popover-checkmark-icon" />
          {/if}
        </div>
      {/snippet}
    </PopoverOptionList>
    
    <!-- Deleted tasks toggle -->
    <div class="filter-separator"></div>
    <div class="deleted-filter-option">
      <button 
        class="deleted-toggle-button"
        onclick={toggleDeleted}
        title="Toggle visibility of deleted tasks"
      >
        <span class="popover-option-main-label">Deleted</span>
        
        <div class="popover-checkmark-container">
          {#if showDeleted}
            <img src="/icons/checkmark.svg" alt="Selected" class="popover-checkmark-icon" />
          {/if}
        </div>
      </button>
    </div>
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

  .filter-separator {
    border-top: 1px solid var(--border-secondary);
    margin: 12px 0;
  }

  .deleted-filter-option {
    margin-top: 8px;
  }

  .deleted-toggle-button {
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .deleted-toggle-button:hover {
    background-color: var(--bg-secondary);
  }

  .deleted-indicator {
    margin-top: 8px;
    padding: 6px 12px;
    background-color: var(--accent-orange-bg);
    border: 1px solid var(--accent-orange);
    border-radius: 4px;
    text-align: center;
  }

  .deleted-indicator-text {
    font-size: 12px;
    color: var(--accent-orange);
    font-weight: 500;
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