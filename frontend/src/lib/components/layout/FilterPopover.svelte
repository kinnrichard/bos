<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import PopoverMenuSeparator from '$lib/components/ui/PopoverMenuSeparator.svelte';

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

  // Build menu options with title and separator
  const menuOptions = $derived([
    { id: 'title', value: 'title', label: 'Filter Tasks', header: true },
    ...statusOptions,
    { id: 'separator', divider: true },
    { id: 'deleted', value: 'deleted', label: 'Deleted' }
  ]);

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
  
  // Compute selected values for PopoverMenu
  let selectedValues = $derived(
    showDeleted 
      ? [...selectedStatuses, 'deleted']
      : selectedStatuses
  );

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

  // Handle deleted option click
  function handleDeletedClick(option: any, event?: MouseEvent) {
    toggleDeleted();
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
    <PopoverMenu
      options={menuOptions}
      showCheckmarks={true}
      showIcons={false}
      multiple={true}
      selected={selectedValues}
      onSelect={(value, option) => {
        if (value === 'deleted') {
          toggleDeleted();
        } else if (value) {
          const event = new MouseEvent('click');
          handleStatusToggle(option, event);
        }
      }}
      onClose={close}
    />
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