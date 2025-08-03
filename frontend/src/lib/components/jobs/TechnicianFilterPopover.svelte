<script lang="ts">
  import GenericFilterPopover from '$lib/components/ui/GenericFilterPopover.svelte';
  import { ReactiveUser } from '$lib/models/reactive-user';

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
  const technicians = $derived(
    usersQuery.data?.filter(
      (user) => user.role === 'technician' || user.role === 'admin' || user.role === 'owner'
    ) || []
  );

  // Create filter options with "Not Assigned" option and all technicians
  const technicianFilterOptions = $derived([
    // Not Assigned option
    {
      id: 'technician:not_assigned',
      value: 'technician:not_assigned',
      label: 'Not Assigned',
    },
    // Divider
    { id: 'divider', value: 'divider', label: '', divider: true },
    // Technician options
    ...technicians.map((technician) => ({
      id: `technician:${technician.id}`,
      value: `technician:${technician.id}`,
      label: technician.name || technician.email || `User ${technician.id}`,
    })),
  ]);

  function handleFilterChange(newSelection: string[]) {
    onFilterChange(newSelection);
  }
</script>

<GenericFilterPopover
  title={null}
  options={technicianFilterOptions}
  {selected}
  onFilterChange={handleFilterChange}
  {disabled}
  showAllSelectedByDefault={false}
  preventAllUnchecked={false}
/>
