<script lang="ts">
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import TechnicianAvatarGroup from './TechnicianAvatarGroup.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
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
    // Not Assigned option (icon rendered via iconContent snippet)
    {
      id: 'technician:not_assigned',
      value: 'technician:not_assigned',
      label: 'Not Assigned',
    },
    // Divider
    { id: 'divider', value: 'divider', label: '', divider: true },
    // Technician options with user data for avatar display
    ...technicians.map((technician) => ({
      id: `technician:${technician.id}`,
      value: `technician:${technician.id}`,
      label: technician.name || technician.email || `User ${technician.id}`,
      user: technician, // Include for avatar display in iconContent snippet
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
      class:expanded={selectedTechnicians.length > 1 ||
        (isNotAssignedSelected && selectedTechnicians.length > 0)}
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
        <img
          src="/icons/questionmark.circle.fill.svg"
          alt="Not assigned"
          class="not-assigned-avatar"
        />
      {:else if buttonState() === 'mixed'}
        <div class="avatars-mixed">
          <TechnicianAvatarGroup
            technicians={selectedTechnicians}
            maxDisplay={selectedTechnicians.length <= 2 ? 2 : 1}
            size="xs"
            showNames={false}
          />
          <img
            src="/icons/questionmark.circle.fill.svg"
            alt="Not assigned"
            class="not-assigned-avatar overlap"
          />
        </div>
      {:else}
        <TechnicianAvatarGroup
          technicians={selectedTechnicians}
          maxDisplay={selectedTechnicians.length <= 3 ? 3 : 2}
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
      iconPosition="left"
      multiple={true}
      {selected}
      onSelect={handleSelect}
      onClose={close}
    >
      {#snippet iconContent({ option })}
        {#if option.value === 'technician:not_assigned'}
          <img src="/icons/questionmark.circle.fill.svg" alt="Not assigned" class="menu-icon" />
        {:else if option.user}
          <UserAvatar user={option.user} size="xs" />
        {/if}
      {/snippet}
    </PopoverMenu>
  {/snippet}
</BasePopover>

<style>
  .technician-filter-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    width: 36px;
    height: 36px;
  }

  /* Expanded state when multiple technicians selected */
  .technician-filter-button.expanded {
    border-radius: 18px;
    width: auto;
    min-width: 36px;
    padding: 0 6px;
  }

  .technician-filter-button:hover:not(.disabled) {
    /* Match popover-button hover styles */
    background-color: #252527;
    border-color: #494a4d;
  }

  .technician-filter-button.active {
    background-color: var(--color-primary-soft, var(--bg-secondary));
    border-color: var(--color-primary, var(--border-primary));
  }

  .technician-filter-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .button-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  .button-icon.empty {
    opacity: 0.4;
  }

  .not-assigned-avatar {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }

  .not-assigned-avatar.overlap {
    margin-left: -6px;
  }

  .avatars-mixed {
    display: flex;
    align-items: center;
    flex-direction: row-reverse;
  }

  .avatars-mixed :global(.technician-avatar-group) {
    z-index: 2;
  }

  .menu-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: contain;
  }
</style>
