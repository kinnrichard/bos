<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import TechnicianAvatarGroup from './TechnicianAvatarGroup.svelte';
  import { ReactiveUser } from '$lib/models/reactive-user';
  import '$lib/styles/popover-common.css';

  interface Props {
    selected: string[];
    onFilterChange: (selected: string[]) => void;
    disabled?: boolean;
  }

  let { selected = [], onFilterChange, disabled = false }: Props = $props();

  // Query for all users that can be assigned as technicians
  // Note: Using all() and filtering client-side since where() doesn't support array filters
  const usersQuery = ReactiveUser.all().orderBy('name', 'asc').all();

  // Filter to only include users who can be technicians
  const allUsers = $derived(usersQuery.data || []);
  const technicians = $derived(
    Array.isArray(allUsers)
      ? allUsers.filter(
          (user) => user.role === 'technician' || user.role === 'admin' || user.role === 'owner'
        )
      : []
  );

  // Parse selected technicians
  const selectedTechnicianIds = $derived(
    selected
      .filter((id) => id.startsWith('technician:') && id !== 'technician:not_assigned')
      .map((id) => id.replace('technician:', ''))
  );

  const isNotAssignedSelected = $derived(selected.includes('technician:not_assigned'));

  const selectedTechnicians = $derived(
    technicians.filter((tech) => selectedTechnicianIds.includes(tech.id))
  );

  // Create filter options with icons
  const menuOptions = $derived([
    // Title
    { id: 'title', value: 'title', label: 'Filter by Technician', header: true },
    // Not Assigned option with icon
    {
      id: 'technician:not_assigned',
      value: 'technician:not_assigned',
      label: 'Not Assigned',
      icon: '/icons/questionmark.circle.fill.svg',
      iconType: 'svg' as const,
    },
    // Divider
    { id: 'divider', value: 'divider', label: '', divider: true },
    // Technician options with person icon
    ...technicians.map((technician) => ({
      id: `technician:${technician.id}`,
      value: `technician:${technician.id}`,
      label: technician.name || technician.email || `User ${technician.id}`,
      icon: '/icons/person.fill.svg',
      iconType: 'svg' as const,
      user: technician, // Include for potential avatar display
    })),
  ]);

  function handleSelect(value: string | undefined) {
    if (!value || value === 'title' || value === 'divider') return;

    const isCurrentlySelected = selected.includes(value);
    let newSelection: string[];

    if (isCurrentlySelected) {
      // Remove from selection
      newSelection = selected.filter((id) => id !== value);
    } else {
      // Add to selection
      newSelection = [...selected, value];
    }

    onFilterChange(newSelection);
  }

  // Determine button visual state
  const buttonState = $derived(() => {
    if (selected.length === 0) {
      return 'empty';
    } else if (isNotAssignedSelected && selectedTechnicianIds.length === 0) {
      return 'not-assigned';
    } else if (isNotAssignedSelected && selectedTechnicianIds.length > 0) {
      return 'mixed';
    } else {
      return 'technicians';
    }
  });

  const hasActiveFilters = $derived(selected.length > 0);
</script>

<BasePopover preferredPlacement="bottom" panelWidth="max-content">
  {#snippet trigger({ popover })}
    <button
      class="technician-filter-button"
      class:disabled
      class:active={hasActiveFilters}
      use:popover.button
      as
      any
      title={disabled ? 'Disabled' : 'Filter by Technician'}
      {disabled}
      onclick={disabled ? undefined : (e: MouseEvent) => e.stopPropagation()}
    >
      {#if buttonState() === 'empty'}
        <img src="/icons/person.fill.svg" alt="No technician filter" class="button-icon empty" />
      {:else if buttonState() === 'not-assigned'}
        <img src="/icons/questionmark.circle.fill.svg" alt="Not assigned" class="button-icon" />
      {:else if buttonState() === 'mixed'}
        <div class="mixed-indicator">
          <img
            src="/icons/questionmark.circle.fill.svg"
            alt="Mixed selection"
            class="button-icon"
          />
          <span class="count">+{selectedTechnicianIds.length}</span>
        </div>
      {:else}
        <TechnicianAvatarGroup
          technicians={selectedTechnicians}
          maxDisplay={2}
          size="xs"
          showNames={false}
        />
      {/if}
    </button>
  {/snippet}

  {#snippet children({ close })}
    <PopoverMenu
      options={menuOptions}
      showCheckmarks={true}
      showIcons={true}
      multiple={true}
      {selected}
      onSelect={handleSelect}
      onClose={close}
    />
  {/snippet}
</BasePopover>

<style>
  .technician-filter-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    height: 32px;
    min-width: 32px;
  }

  .technician-filter-button:hover:not(.disabled) {
    background: var(--color-background-hover);
    border-color: var(--color-border-hover);
  }

  .technician-filter-button.active {
    background: var(--color-primary-soft);
    border-color: var(--color-primary);
  }

  .technician-filter-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .button-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  .button-icon.empty {
    opacity: 0.4;
  }

  .mixed-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mixed-indicator .count {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary);
    background: var(--color-background-secondary);
    padding: 2px 4px;
    border-radius: 4px;
    line-height: 1;
  }
</style>
