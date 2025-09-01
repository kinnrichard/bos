<script lang="ts">
  import GenericFilterPopover from '$lib/components/ui/GenericFilterPopover.svelte';
  import { jobFilter, jobFilterOptions } from '$lib/stores/jobFilter.svelte';

  interface Props {
    disabled?: boolean;
    selected?: string[];
    onFilterChange?: (selection: string[]) => void;
  }

  let { 
    disabled = false, 
    selected = jobFilter.selected,
    onFilterChange = (newSelection: string[]) => jobFilter.setSelected(newSelection)
  }: Props = $props();

  const hasActiveFilters = $derived(selected.length > 0);
  const filterCount = $derived(selected.length);
</script>

<div class="job-filter-container">
  <GenericFilterPopover
    title={null}
    options={jobFilterOptions}
    {selected}
    {onFilterChange}
    {disabled}
    showAllSelectedByDefault={false}
    preventAllUnchecked={false}
    showIcons={true}
    iconPosition="left"
  />
  
  <!-- Visual indicator overlay -->
  {#if hasActiveFilters}
    <div class="filter-indicator">
      {filterCount}
    </div>
  {/if}
</div>

<style>
  .job-filter-container {
    position: relative;
    display: inline-block;
  }

  .filter-indicator {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #0969da;
    color: white;
    border-radius: 50%;
    min-width: 16px;
    height: 16px;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
  }
</style>