<script lang="ts">
  import GenericFilterPopover from '$lib/components/ui/GenericFilterPopover.svelte';
  import { clientTypeFilter, clientTypeOptions } from '$lib/stores/clientsSearch.svelte';

  interface Props {
    disabled?: boolean;
  }

  let { disabled = false }: Props = $props();

  // Update the store when selection changes
  function handleFilterChange(newSelection: string[]) {
    clientTypeFilter.setSelected(newSelection);
  }
</script>

<GenericFilterPopover
  title="Filter Clients"
  options={clientTypeOptions}
  selected={clientTypeFilter.selected}
  onFilterChange={handleFilterChange}
  {disabled}
  showAllSelectedByDefault={true}
  preventAllUnchecked={true}
/>