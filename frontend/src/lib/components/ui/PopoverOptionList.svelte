<script lang="ts">
  export let options: Array<{
    id: string;
    [key: string]: any;
  }>;
  export let selectedIds: Set<string> = new Set();
  export let loading: boolean = false;
  export let maxHeight: string = 'min(400px, 50vh)';
  export let onOptionClick: (option: any, selected: boolean) => void;

  // Whether to show checkmarks for selected items
  export let showCheckmarks: boolean = true;
  
  // Whether this is a single-select list (like job status) vs multi-select (like technicians)
  export let singleSelect: boolean = false;
  
  // For single-select, which option is currently selected
  export let currentSelection: string = '';

  function handleOptionClick(option: any) {
    if (loading) return;
    
    const isSelected = singleSelect 
      ? option.id === currentSelection
      : selectedIds.has(option.id);
    
    onOptionClick(option, !isSelected);
  }

  function isOptionSelected(option: any): boolean {
    return singleSelect 
      ? option.id === currentSelection
      : selectedIds.has(option.id);
  }
</script>

<div class="option-list" style:max-height={maxHeight}>
  {#each options as option}
    <button 
      type="button"
      class="option-item"
      class:selected={isOptionSelected(option)}
      class:single-select={singleSelect}
      disabled={loading}
      aria-pressed={isOptionSelected(option)}
      on:click={() => handleOptionClick(option)}
    >
      <div class="option-content">
        <slot name="option-content" {option} selected={isOptionSelected(option)} />
      </div>
      
      {#if showCheckmarks}
        <div class="checkmark-area">
          {#if isOptionSelected(option)}
            <img 
              src="/icons/checkmark.svg" 
              alt="Selected" 
              class="checkmark-icon"
              class:white-checkmark={singleSelect && isOptionSelected(option)}
            />
          {/if}
        </div>
      {/if}
    </button>
  {/each}
</div>

<style>
  .option-list {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .option-item {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    transition: background-color 0.15s ease;
    text-align: left;
    width: 100%;
    cursor: pointer;
  }

  .option-item:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
  }

  .option-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Single-select styling (like job status) */
  .option-item.single-select.selected {
    background-color: var(--accent-blue);
    color: white;
  }

  .option-item.single-select.selected:hover {
    background-color: var(--accent-blue-hover);
  }

  .option-content {
    flex: 1;
    display: flex;
    align-items: center;
    min-width: 0; /* Allow content to shrink */
  }

  .checkmark-area {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 14px;
  }

  .checkmark-icon {
    width: 14px;
    height: 14px;
  }

  .white-checkmark {
    filter: brightness(0) invert(1); /* Make white for blue backgrounds */
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .option-item {
      transition: none;
    }
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .option-list {
      max-height: min(300px, 40vh);
    }
  }
</style>