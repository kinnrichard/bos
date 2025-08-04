<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import BasePopover from '$lib/components/ui/BasePopover.svelte';
  import PopoverMenu from '$lib/components/ui/PopoverMenu.svelte';
  import TechnicianButton from '$lib/components/ui/TechnicianButton.svelte';
  import UserAvatar from '$lib/components/ui/UserAvatar.svelte';
  import { ReactiveUser } from '$lib/models/reactive-user';
  import { getCurrentUser } from '$lib/auth/current-user';
  import '$lib/styles/popover-common.css';

  interface Props {
    selected: string[];
    onFilterChange: (selected: string[]) => void;
    disabled?: boolean;
  }

  let { selected = [], onFilterChange, disabled = false }: Props = $props();
  
  const currentUser = getCurrentUser();
  const currentPath = $derived($page.url.pathname);

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

  // Determine effective selection based on semantic route or props
  const effectiveSelection = $derived(() => {
    const filter = currentPath.match(/\/jobs\/(mine|not-mine|not-assigned)/)?.[1];
    
    if (!filter) return selected;
    
    switch (filter) {
      case 'mine':
        return currentUser ? [`technician:${currentUser.id}`] : [];
      case 'not-mine':
        // All technicians except current user
        return currentUser 
          ? technicians.filter(t => t.id !== currentUser.id).map(t => `technician:${t.id}`)
          : [];
      case 'not-assigned':
        return ['technician:not_assigned'];
      default:
        return selected;
    }
  });

  // Parse selected technicians
  const selectedTechnicianIds = $derived(
    effectiveSelection()
      .filter((id) => id.startsWith('technician:') && id !== 'technician:not_assigned')
      .map((id) => id.replace('technician:', ''))
  );

  const isNotAssignedSelected = $derived(effectiveSelection().includes('technician:not_assigned'));

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

  async function handleSelect(value: string | undefined) {
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

    // Check for semantic route navigation
    if (currentUser) {
      // Navigate to /jobs/mine if only current user is selected
      if (newSelection.length === 1 && newSelection[0] === `technician:${currentUser.id}`) {
        await goto('/jobs/mine');
        return;
      }
      
      // Navigate to /jobs/not-assigned if only not_assigned is selected
      if (newSelection.length === 1 && newSelection[0] === 'technician:not_assigned') {
        await goto('/jobs/not-assigned');
        return;
      }
      
      // Navigate to /jobs/not-mine if all technicians except current user are selected
      const technicianSelections = newSelection.filter(id => 
        id.startsWith('technician:') && id !== 'technician:not_assigned'
      );
      const selectedTechIds = technicianSelections.map(id => id.replace('technician:', ''));
      const allOtherTechIds = technicians
        .filter(t => t.id !== currentUser.id)
        .map(t => t.id);
      
      if (selectedTechIds.length === allOtherTechIds.length &&
          selectedTechIds.every(id => allOtherTechIds.includes(id))) {
        await goto('/jobs/not-mine');
        return;
      }
    }
    
    // If on a semantic route and changing filters, go back to /jobs
    if (currentPath.match(/\/jobs\/(mine|not-mine|not-assigned)/)) {
      await goto('/jobs');
      // Small delay to let navigation complete
      setTimeout(() => onFilterChange(newSelection), 50);
    } else {
      onFilterChange(newSelection);
    }
  }

  const hasActiveFilters = $derived(effectiveSelection().length > 0);
</script>

<BasePopover preferredPlacement="bottom" panelWidth="max-content">
  {#snippet trigger({ popover })}
    <TechnicianButton
      technicians={selectedTechnicians}
      showNotAssigned={isNotAssignedSelected}
      {disabled}
      active={hasActiveFilters}
      title={disabled ? 'Disabled' : 'Filter by Technician'}
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
  .menu-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: contain;
  }
</style>
