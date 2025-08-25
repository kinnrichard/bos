<script lang="ts">
  interface DateOption {
    id: string;
    value: string;
    label: string;
    icon: string;
  }

  interface Props {
    selectedOptions?: DateOption[];
    disabled?: boolean;
    active?: boolean;
    title?: string;
    emptyIcon?: string;
    emptyIconAlt?: string;
    onClick?: (e: MouseEvent) => void;
    popoverButton?: any; // For use:popover.button directive
  }

  let {
    selectedOptions = [],
    disabled = false,
    active = false,
    title = 'Due Date Filter',
    emptyIcon = '/icons/calendar.svg',
    emptyIconAlt = 'No date filter',
    onClick,
    popoverButton,
  }: Props = $props();

  // Determine button state
  const buttonState = $derived(() => {
    if (selectedOptions.length === 0) {
      return 'empty';
    } else if (selectedOptions.length === 1) {
      return 'single';
    } else {
      return 'multiple';
    }
  });

  // Should expand to pill shape?
  const shouldExpand = $derived(selectedOptions.length > 1);

  // Get display text for multiple selections
  const displayText = $derived(() => {
    if (selectedOptions.length <= 1) return '';
    return `${selectedOptions.length} filters`;
  });

  function handleClick(e: MouseEvent) {
    if (!disabled) {
      e.stopPropagation();
      onClick?.(e);
    }
  }
</script>

<button
  class="date-button"
  class:disabled
  class:active
  class:expanded={shouldExpand}
  use:popoverButton
  {title}
  {disabled}
  onclick={handleClick}
>
  {#if buttonState() === 'empty'}
    <img src={emptyIcon} alt={emptyIconAlt} class="button-icon empty" />
  {:else if buttonState() === 'single'}
    <img src={selectedOptions[0].icon} alt={selectedOptions[0].label} class="button-icon" />
  {:else}
    <div class="multiple-selection">
      <img src="/icons/calendar.svg" alt="Multiple date filters" class="button-icon" />
      <span class="count-text">{displayText()}</span>
    </div>
  {/if}
</button>

<style>
  .date-button {
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
    white-space: nowrap;
  }

  /* Expanded state when multiple items selected */
  .date-button.expanded {
    border-radius: 18px;
    width: auto;
    min-width: 36px;
    padding: 0 8px;
  }

  .date-button:hover:not(.disabled) {
    /* Match popover-button hover styles */
    background-color: #252527;
    border-color: #494a4d;
  }

  .date-button.active {
    background-color: var(--color-primary-soft, var(--bg-secondary));
    border-color: var(--color-primary, var(--border-primary));
  }

  .date-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .button-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .button-icon.empty {
    opacity: 0.4;
  }

  .multiple-selection {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .count-text {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .date-button {
      border-width: 2px;
    }
  }
</style>