<script lang="ts">
  export let options: Array<{
    id: string;
    [key: string]: any;
  }>;
  export let loading: boolean = false;
  export let maxHeight: string = 'min(400px, 50vh)';
  export let onOptionClick: (option: any) => void;

  function handleOptionClick(option: any) {
    if (loading) return;
    onOptionClick(option);
  }
</script>

<div class="option-list" style:max-height={maxHeight}>
  {#each options as option}
    <button 
      type="button"
      class="option-item"
      disabled={loading}
      on:click={() => handleOptionClick(option)}
    >
      <slot name="option-content" {option} />
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
    min-height: 31px;
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