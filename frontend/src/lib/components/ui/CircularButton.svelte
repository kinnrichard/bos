<script lang="ts">
  import { POPOVER_CONSTANTS } from '$lib/utils/popover-constants';

  export let size: 'small' | 'normal' | 'large' = 'normal';
  export let variant: 'default' | 'avatar' | 'primary' = 'default';
  export let disabled: boolean = false;
  export let title: string = '';
  export let onclick: (() => void) | undefined = undefined;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let ariaLabel: string = '';
  export let ariaPressed: boolean | undefined = undefined;
  export let ariaExpanded: boolean | undefined = undefined;

  // Size configurations
  const sizeConfig = {
    small: { width: 28, height: 28, iconSize: 16 },
    normal: { width: 36, height: 36, iconSize: 20 },
    large: { width: 44, height: 44, iconSize: 24 }
  };

  const config = $derived(sizeConfig[size]);
  
  // Dynamic sizing for special cases (like technician assignment)
  export let dynamicWidth: boolean = false;
  export let minWidth: number | undefined = undefined;
  export let borderRadius: number | string | undefined = undefined;
  export let customClass: string = '';

  function handleClick(event: MouseEvent) {
    if (!disabled && onclick) {
      onclick();
    }
  }
</script>

<button 
  {type}
  class="circular-button {variant} {size} {customClass}"
  class:dynamic-width={dynamicWidth}
  class:disabled
  {disabled}
  {title}
  aria-label={ariaLabel || title}
  aria-pressed={ariaPressed}
  aria-expanded={ariaExpanded}
  style:width={dynamicWidth ? 'auto' : `${config.width}px`}
  style:height={`${config.height}px`}
  style:min-width={minWidth ? `${minWidth}px` : dynamicWidth ? `${config.width}px` : undefined}
  style:border-radius={borderRadius ? (typeof borderRadius === 'string' ? borderRadius : `${borderRadius}px`) : '50%'}
  on:click={handleClick}
>
  <slot {config} />
</button>

<style>
  .circular-button {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    position: relative;
    padding: 0;
    font-family: inherit;
  }

  /* Size variants handled by style props - no CSS needed */

  /* Variant styles */
  .circular-button.default:hover:not(:disabled) {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .circular-button.avatar {
    background-color: var(--accent-red);
    border: none;
    border-radius: 18px; /* Slightly rounded for avatar style */
  }

  .circular-button.avatar:hover:not(:disabled) {
    opacity: 0.9;
  }

  .circular-button.primary {
    background-color: var(--accent-blue);
    border-color: var(--accent-blue);
    color: white;
  }

  .circular-button.primary:hover:not(:disabled) {
    background-color: var(--accent-blue-dark, #0066cc);
  }

  /* Dynamic width for special cases */
  .circular-button.dynamic-width {
    width: auto !important;
    padding: 0 6px;
  }

  /* Disabled state */
  .circular-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Content styling */
  .circular-button :global(.icon) {
    opacity: 0.7;
    transition: opacity 0.15s ease;
  }

  .circular-button:hover:not(:disabled) :global(.icon) {
    opacity: 1;
  }

  .circular-button :global(.emoji) {
    font-size: 16px;
    line-height: 1;
  }

  .circular-button.small :global(.emoji) {
    font-size: 14px;
  }

  .circular-button.large :global(.emoji) {
    font-size: 18px;
  }

  /* Avatar specific styling */
  .circular-button.avatar :global(.initials) {
    color: white;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
  }

  .circular-button.small.avatar :global(.initials) {
    font-size: 11px;
  }

  .circular-button.normal.avatar :global(.initials) {
    font-size: 13px;
  }

  .circular-button.large.avatar :global(.initials) {
    font-size: 15px;
  }

  /* Responsive adjustments */
  /* Mobile styles handled by existing responsive design */

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .circular-button {
      border-width: 2px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .circular-button {
      transition: none;
    }
  }
</style>