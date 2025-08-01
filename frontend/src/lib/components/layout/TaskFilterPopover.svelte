<script lang="ts">
  import GenericFilterPopover from '$lib/components/ui/GenericFilterPopover.svelte';
  import { taskStatusFilter, taskStatusOptions } from '$lib/stores/taskFilter.svelte';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  // Update the store when selection changes
  function handleFilterChange(newSelection: string[]) {
    taskStatusFilter.setSelected(newSelection);
  }

  function handleDeletedToggle(showDeleted: boolean) {
    taskStatusFilter.setShowDeleted(showDeleted);
  }
</script>

<GenericFilterPopover
  title="Filter Tasks"
  options={taskStatusOptions}
  selected={taskStatusFilter.selected}
  onFilterChange={handleFilterChange}
  {disabled}
  showAllSelectedByDefault={true}
  preventAllUnchecked={true}
  showDeletedToggle={true}
  deletedLabel="Deleted"
  showDeleted={taskStatusFilter.showDeleted}
  onDeletedToggle={handleDeletedToggle}
/>