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
    { id: 'due_date:no_due_date', value: 'due_date:no_due_date', label: 'No Due Date', icon: '/icons/questionmark.circle.fill.svg', isNoDueDate: true },
    { id: 'divider', value: 'divider', label: '', divider: true },
    { id: 'due_date:overdue', value: 'due_date:overdue', label: 'Overdue', icon: '/icons/calendar.badge.exclamation.svg', isOverdue: true },
    { id: 'due_date:today', value: 'due_date:today', label: 'Due Today', icon: '/icons/0.calendar.svg' },
    { id: 'due_date:tomorrow', value: 'due_date:tomorrow', label: 'Due Tomorrow', icon: '/icons/1.calendar.svg' },
    { id: 'due_date:this_week', value: 'due_date:this_week', label: 'This Week', icon: '/icons/7.calendar.svg' },
    { id: 'due_date:this_month', value: 'due_date:this_month', label: 'This Month', icon: '/icons/30.calendar.svg' },
  ];

  // Determine effective selection based on query param or props (single value only)
  const effectiveSelection = $derived(() => {
    const dueDateParam = currentUrl.searchParams.get('due_date');

    if (!dueDateParam) return selected.slice(0, 1); // Take only first item if multiple

    // For single select, only take the first value
    const firstValue = dueDateParam.split(',')[0];
    return [`due_date:${firstValue}`];
  });

  // Parse selected date filter (single value)
  const selectedDateFilter = $derived(
    effectiveSelection().find((id) => id.startsWith('due_date:'))
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
      // If clicking the currently selected item, deselect it
      newSelection = [];
    } else {
      // Replace current selection with new single selection
      newSelection = [value];
    }

    // Build new URL with appropriate query params
    const url = new URL(currentUrl);

    if (newSelection.length === 0) {
      // No selection, remove due_date param
      url.searchParams.delete('due_date');
    } else {
      // Single selection - use single value without the due_date: prefix
      const filterValue = newSelection[0].replace('due_date:', '');
      url.searchParams.set('due_date', filterValue);
    }

    // Navigate to the new URL
    await goto(url.toString());

    // Also update the filter store for non-query-param handling
    onFilterChange(newSelection);
  }

  const hasActiveFilters = $derived(effectiveSelection().length > 0);
  
  // Get selected option for display (single option)
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
      multiple={false}
      selected={effectiveSelection()}
      onSelect={handleSelect}
    >
      {#snippet iconContent({ option })}
        {#if option.icon}
          <img 
            src={option.icon} 
            alt={option.label} 
            class="menu-icon"
          />
        {/if}
      {/snippet}
    </PopoverMenu>
  {/snippet}
</BasePopover>

<style>
  .menu-icon {
    width: 50px;
    height: 50px;
    object-fit: contain;
  }
</style>