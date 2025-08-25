<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import DateButton from '$lib/components/ui/DateButton.svelte';
  import '$lib/styles/popover-common.css';

  interface Props {
    selected: string[];
    onFilterChange: (selected: string[]) => void;
    disabled?: boolean;
  }

  let { selected = [], onFilterChange, disabled = false }: Props = $props();

  const currentUrl = $derived($page.url);

  // Date filter options
  const dateOptions = [
    { id: 'due_date:overdue', value: 'due_date:overdue', label: 'Overdue', icon: '/icons/calendar-with-badge.svg', isOverdue: true },
    { id: 'due_date:today', value: 'due_date:today', label: 'Due Today', icon: '/icons/calendar-with-badge.svg' },
    { id: 'due_date:tomorrow', value: 'due_date:tomorrow', label: 'Due Tomorrow', icon: '/icons/calendar-with-badge.svg' },
    { id: 'due_date:this_week', value: 'due_date:this_week', label: 'This Week', icon: '/icons/calendar-with-badge.svg' },
    { id: 'due_date:next_week', value: 'due_date:next_week', label: 'Next Week', icon: '/icons/calendar-with-badge.svg' },
    { id: 'due_date:this_month', value: 'due_date:this_month', label: 'This Month', icon: '/icons/calendar-with-badge.svg' },
    { id: 'due_date:no_due_date', value: 'due_date:no_due_date', label: 'No Due Date', icon: '/icons/calendar-with-badge.svg', isNoDueDate: true },
  ];

  // Determine effective selection based on query param or props
  const effectiveSelection = $derived(() => {
    const dueDateParam = currentUrl.searchParams.get('due_date');

    if (!dueDateParam) return selected;

    // Parse comma-separated values
    return dueDateParam.split(',').map((value) => `due_date:${value}`);
  });

  // Parse selected date filters
  const selectedDateFilters = $derived(
    effectiveSelection().filter((id) => id.startsWith('due_date:'))
  );

  // Create filter options with icons
  const menuOptions = $derived([
    // Title
    { id: 'title', value: 'title', label: 'Filter by Due Date', header: true },
    ...dateOptions,
  ]);

  async function handleSelect(value: string | undefined) {
    if (!value || value === 'title') return;

    const isCurrentlySelected = effectiveSelection().includes(value);
    let newSelection: string[];

    if (isCurrentlySelected) {
      // Remove from selection
      newSelection = effectiveSelection().filter((id) => id !== value);
    } else {
      // Add to selection
      newSelection = [...effectiveSelection(), value];
    }

    // Build new URL with appropriate query params
    const url = new URL(currentUrl);

    if (newSelection.length === 0) {
      // No selection, remove due_date param
      url.searchParams.delete('due_date');
    } else {
      // Custom selection - use comma-separated values without the due_date: prefix
      const filterValues = newSelection.map((id) => id.replace('due_date:', ''));
      url.searchParams.set('due_date', filterValues.join(','));
    }

    // Navigate to the new URL
    await goto(url.toString());

    // Also update the filter store for non-query-param handling
    onFilterChange(newSelection);
  }

  const hasActiveFilters = $derived(effectiveSelection().length > 0);
  
  // Get selected options for display
  const selectedOptions = $derived(
    dateOptions.filter(option => effectiveSelection().includes(option.value))
  );
</script>

<BasePopover preferredPlacement="bottom" panelWidth="max-content">
  {#snippet trigger({ popover })}
    <DateButton
      selectedOptions={selectedOptions}
      {disabled}
      active={hasActiveFilters}
      title={disabled ? 'Disabled' : 'Filter by Due Date'}
      popoverButton={popover.button as any}
    />
  {/snippet}

  {#snippet children({ close })}
    <PopoverMenu
      options={menuOptions}
      showCheckmarks={true}
      showIcons={true}
      iconPosition="left"
      multiple={true}
      selected={effectiveSelection()}
      onSelect={handleSelect}
      onClose={close}
    >
      {#snippet iconContent({ option })}
        {#if option.icon}
          <img 
            src={option.icon} 
            alt={option.label} 
            class="menu-icon"
            class:overdue={option.isOverdue}
            class:no-due-date={option.isNoDueDate}
          />
        {/if}
      {/snippet}
    </PopoverMenu>
  {/snippet}
</BasePopover>

<style>
  .menu-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: contain;
  }

  .menu-icon.overdue {
    filter: hue-rotate(0deg) saturate(1.5) brightness(1.2);
    /* Tint the calendar icon reddish for overdue items */
    color: #ef4444;
  }

  .menu-icon.no-due-date {
    opacity: 0.6;
    /* Make it slightly faded for "no due date" */
  }
</style>