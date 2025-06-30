<script lang="ts">
  import { createPopover } from 'svelte-headlessui';

  export let onFilterChange: (statuses: string[]) => void = () => {};

  let selectedStatuses: string[] = [];

  const popover = createPopover();

  const taskStatuses = [
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  function toggleStatus(status: string) {
    if (selectedStatuses.includes(status)) {
      selectedStatuses = selectedStatuses.filter(s => s !== status);
    } else {
      selectedStatuses = [...selectedStatuses, status];
    }
    onFilterChange(selectedStatuses);
  }

  function clearAllFilters() {
    selectedStatuses = [];
    onFilterChange(selectedStatuses);
  }

  $: hasActiveFilters = selectedStatuses.length > 0;
</script>

<div class="filter-popover">
  <button 
    class="filter-button"
    use:popover.button
  >
    <img src="/icons/filter.svg" alt="" class="filter-icon" />
    {#if hasActiveFilters}
      <span class="filter-badge"></span>
    {/if}
  </button>

  {#if $popover.expanded}
    <div 
      class="filter-panel"
      use:popover.panel
    >
      <div class="filter-content">
        <div class="filter-header">
          <h3 class="filter-title">Filter Tasks</h3>
          <button 
            class="clear-filters-btn"
            on:click={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            Clear All
          </button>
        </div>

        <div class="status-checkboxes">
          {#each taskStatuses as status}
            <label class="status-checkbox">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status.value)}
                on:change={() => toggleStatus(status.value)}
                class="checkbox-input"
              />
              <span class="checkbox-label">{status.label}</span>
            </label>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-popover {
    position: relative;
  }

  .filter-button {
    width: 36px;
    height: 36px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    position: relative;
  }

  .filter-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .filter-icon {
    width: 20px;
    height: 20px;
    opacity: 0.7;
  }

  .filter-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background-color: var(--accent-blue);
    border-radius: 50%;
    border: 2px solid var(--bg-black);
  }

  .filter-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 200px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  .filter-content {
    padding: 16px;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-primary);
  }

  .filter-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .clear-filters-btn {
    background: none;
    border: none;
    color: var(--accent-blue);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-md);
    transition: background-color 0.15s ease;
  }

  .clear-filters-btn:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
  }

  .clear-filters-btn:disabled {
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  .status-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 0;
  }

  .checkbox-input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent-blue);
  }

  .checkbox-label {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.2;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .filter-panel {
      width: 180px;
      right: -20px;
    }
  }
</style>