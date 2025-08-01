<script lang="ts">
  interface Option {
    value: string;
    label: string;
    icon?: string;
  }

  interface Props {
    id?: string;
    options: Option[];
    value: string;
    onchange?: (value: string) => void;
    disabled?: boolean;
    fullWidth?: boolean;
    size?: 'small' | 'normal' | 'large';
    variant?: 'default' | 'minimal';
    ariaLabel?: string;
  }

  let {
    id,
    options,
    value,
    onchange,
    disabled = false,
    fullWidth = false,
    size = 'normal',
    variant = 'default',
    ariaLabel = 'Select option',
  }: Props = $props();

  function handleOptionClick(optionValue: string) {
    if (disabled || optionValue === value) return;
    onchange?.(optionValue);
  }

  function handleKeydown(event: KeyboardEvent, optionValue: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOptionClick(optionValue);
    }
  }

  const sizeConfig = {
    small: { fontSize: '12px', padding: '6px 12px', gap: '4px' },
    normal: { fontSize: '13px', padding: '8px 16px', gap: '6px' },
    large: { fontSize: '14px', padding: '10px 20px', gap: '8px' },
  };

  const config = $derived(sizeConfig[size]);
</script>

<div
  {id}
  class="segmented-control {size} {variant}"
  class:full-width={fullWidth}
  class:disabled
  role="radiogroup"
  aria-label={ariaLabel}
  style:gap={config.gap}
>
  {#each options as option (option.value)}
    <button
      type="button"
      class="segmented-option"
      class:selected={value === option.value}
      {disabled}
      role="radio"
      aria-checked={value === option.value}
      aria-label={option.label}
      style:font-size={config.fontSize}
      style:padding={config.padding}
      onclick={() => handleOptionClick(option.value)}
      onkeydown={(e) => handleKeydown(e, option.value)}
    >
      {#if option.icon}
        <span class="option-icon">{option.icon}</span>
      {/if}
      <span class="option-label">{option.label}</span>
    </button>
  {/each}
</div>

<style>
  .segmented-control {
    display: inline-flex;
    background-color: var(--bg-tertiary, #3a3a3c);
    border-radius: 8px;
    padding: 2px;
    border: 1px solid var(--border-primary, #48484a);
  }

  .segmented-control.full-width {
    width: 100%;
  }

  .segmented-control.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .segmented-option {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--text-secondary, #c7c7cc);
    cursor: pointer;
    transition: all 0.15s ease;
    font-weight: 500;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .full-width .segmented-option {
    flex: 1;
  }

  .segmented-option:hover:not(.selected) {
    background-color: var(--bg-quaternary, #48484a);
    color: var(--text-primary, #f2f2f7);
  }

  .segmented-option.selected {
    background-color: var(--bg-primary, #1c1c1d);
    color: var(--text-primary, #f2f2f7);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .segmented-option:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-blue, #00a3ff);
  }

  .segmented-option:active {
    transform: scale(0.98);
  }

  .option-icon {
    font-size: 1.1em;
    margin-right: 6px;
  }

  .option-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Variant styles */
  .segmented-control.minimal {
    background-color: transparent;
    border: none;
    padding: 0;
    gap: 4px;
  }

  .segmented-control.minimal .segmented-option {
    border: 1px solid var(--border-primary, #48484a);
  }

  .segmented-control.minimal .segmented-option.selected {
    border-color: var(--accent-blue, #00a3ff);
    background-color: var(--accent-blue, #00a3ff);
    color: white;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .segmented-control {
      border-width: 2px;
    }

    .segmented-option:focus {
      box-shadow: 0 0 0 3px var(--accent-blue, #00a3ff);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .segmented-option {
      transition: none;
    }

    .segmented-option:active {
      transform: none;
    }
  }
</style>
