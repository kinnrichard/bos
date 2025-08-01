<script lang="ts" generics="T extends { id: string; value: string; label: string }">
  /* eslint-disable no-undef */
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import '$lib/styles/popover-common.css';

  interface Props<T extends { id: string; value: string; label: string }> {
    title: string;
    options: T[];
    selected: string[];
    onFilterChange: (selected: string[]) => void;
    disabled?: boolean;
    showAllSelectedByDefault?: boolean;
    preventAllUnchecked?: boolean;
    showDeletedToggle?: boolean;
    deletedLabel?: string;
    showDeleted?: boolean;
    onDeletedToggle?: (showDeleted: boolean) => void;
  }

  let {
    title,
    options,
    selected = $bindable([]),
    onFilterChange,
    disabled = false,
    showAllSelectedByDefault = true,
    preventAllUnchecked = true,
    showDeletedToggle = false,
    deletedLabel = 'Deleted',
    showDeleted = $bindable(false),
    onDeletedToggle = () => {}
  } = $props<Props<T>>();

  let basePopover: { open: boolean } | null = $state(null);

  // Initialize selected with all options if showAllSelectedByDefault is true
  $effect(() => {
    if (showAllSelectedByDefault && selected.length === 0) {
      selected = options.map(opt => opt.value);
    }
  });

  // Build menu options with title
  const menuOptions = $derived([
    { id: 'title', value: 'title', label: title, header: true },
    ...options,
    ...(showDeletedToggle ? [
      { id: 'separator', divider: true },
      { id: 'deleted', value: 'deleted', label: deletedLabel }
    ] : [])
  ]);

  // Handle option toggle with optional "prevent all unchecked" logic
  function handleOptionToggle(option: typeof options[0], event?: MouseEvent) {
    // Easter egg: Option-click for exclusive selection or toggle to all
    if (event?.altKey) {
      // Check if already exclusively selected - if so, select all
      if (selected.length === 1 && selected.includes(option.value)) {
        selected = options.map(opt => opt.value);
      } else {
        // Otherwise, select only this option
        selected = [option.value];
      }
      return;
    }

    const isCurrentlySelected = selected.includes(option.value);

    if (isCurrentlySelected) {
      // User wants to uncheck
      const newSelected = selected.filter(value => value !== option.value);

      if (preventAllUnchecked && newSelected.length === 0) {
        // Would make all unchecked - select all instead
        selected = options.map(opt => opt.value);
      } else {
        // Safe to uncheck this item
        selected = newSelected;
      }
    } else {
      // User wants to check - add to selection
      selected = [...selected, option.value];
    }
  }

  // Compute if filters are active (not all selected or deleted toggle is on)
  const hasActiveFilters = $derived(
    (selected.length > 0 && selected.length < options.length) || 
    showDeleted
  );

  // Compute all selected values for PopoverMenu
  const allSelectedValues = $derived([
    ...selected,
    ...(showDeleted ? ['deleted'] : [])
  ]);

  // Notify parent when filters change
  $effect(() => {
    onFilterChange(selected);
  });

  // Notify parent when deleted toggle changes
  $effect(() => {
    onDeletedToggle(showDeleted);
  });

  function handleSelect(value: string | undefined, _option: { id: string; value: string; label: string }) {
    if (!value || value === 'title') return;

    if (value === 'deleted') {
      showDeleted = !showDeleted;
    } else {
      // It's a regular option
      const regularOption = options.find(opt => opt.value === value);
      if (regularOption) {
        handleOptionToggle(regularOption, new MouseEvent('click'));
      }
    }
  }
</script>

<BasePopover
  bind:popover={basePopover}
  preferredPlacement="bottom"
  panelWidth="max-content"
  {disabled}
>
  {#snippet trigger({ popover })}
    <button
      class="popover-button"
      class:disabled
      use:popover.button
      title={disabled ? 'Disabled' : `Filter ${title.toLowerCase()}`}
      {disabled}
      onclick={disabled ? undefined : (e: MouseEvent) => e.stopPropagation()}
    >
      <img
        src={hasActiveFilters ? '/icons/filter-active.svg' : '/icons/filter-inactive.svg'}
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
      selected={allSelectedValues}
      onSelect={handleSelect}
      onClose={close}
    />
  {/snippet}
</BasePopover>

<style>
  /* Base .popover-button styles are imported from popover-common.css */

  .filter-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .filter-icon.active {
    opacity: 1;
  }

  /* Accessibility improvements and high contrast support are imported from popover-common.css */
</style>