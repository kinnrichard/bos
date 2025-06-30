<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import FilterSection from './FilterSection.svelte';

  export let onFilterChange: (filters: any) => void = () => {};

  let filters = {
    status: [],
    priority: [],
    assignee: [],
    client: [],
    dateRange: null
  };

  const popover = createPopover();

  function handleFilterUpdate(section: string, values: any) {
    filters = { ...filters, [section]: values };
    onFilterChange(filters);
  }

  function clearAllFilters() {
    filters = {
      status: [],
      priority: [],
      assignee: [],
      client: [],
      dateRange: null
    };
    onFilterChange(filters);
  }

  function applyFilters() {
    onFilterChange(filters);
    popover.close();
  }

  $: hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== null
  );
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
          <h3 class="filter-title">Filter Jobs</h3>
          <button 
            class="clear-filters-btn"
            on:click={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            Clear All
          </button>
        </div>

        <div class="filter-sections">
          <FilterSection
            title="Status"
            type="checkbox"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            selectedValues={filters.status}
            onUpdate={(values) => handleFilterUpdate('status', values)}
          />

          <FilterSection
            title="Priority"
            type="checkbox"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
            selectedValues={filters.priority}
            onUpdate={(values) => handleFilterUpdate('priority', values)}
          />

          <FilterSection
            title="Assignee"
            type="search"
            placeholder="Search assignees..."
            selectedValues={filters.assignee}
            onUpdate={(values) => handleFilterUpdate('assignee', values)}
          />

          <FilterSection
            title="Client"
            type="search"
            placeholder="Search clients..."
            selectedValues={filters.client}
            onUpdate={(values) => handleFilterUpdate('client', values)}
          />
        </div>

        <div class="filter-footer">
          <button 
            class="apply-filters-btn"
            on:click={applyFilters}
          >
            Apply Filters
          </button>
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
    width: 320px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
    max-height: 80vh;
    overflow-y: auto;
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

  .filter-sections {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .filter-footer {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border-primary);
  }

  .apply-filters-btn {
    width: 100%;
    background-color: var(--accent-blue);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .apply-filters-btn:hover {
    background-color: var(--accent-blue-hover);
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .filter-panel {
      width: 280px;
      right: -20px;
    }
  }

  @media (max-width: 480px) {
    .filter-panel {
      width: 260px;
      right: -40px;
    }
  }
</style>