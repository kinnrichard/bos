<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { fade } from 'svelte/transition';

  export let title: string;
  export let error: string = '';
  export let loading: boolean = false;
  export let panelWidth: string = '240px'; // Default width, can be overridden
  export let panelPosition: 'center' | 'right' = 'center'; // Panel positioning
  export let topOffset: string = '12px'; // Distance from button
  export let contentPadding: string = '16px'; // Panel content padding
  export let buttonClass: string = ''; // Additional button classes

  const popover = createPopover();

  // Export the popover instance for parent components to control
  export { popover };
</script>

<div class="base-popover">
  <button 
    type="button"
    class="popover-button {buttonClass}"
    use:popover.button
    {title}
  >
    <slot name="button-content" />
  </button>

  {#if $popover.expanded}
    <div 
      class="popover-panel"
      class:panel-center={panelPosition === 'center'}
      class:panel-right={panelPosition === 'right'}
      style:width={panelWidth}
      style:top="calc(100% + {topOffset})"
      use:popover.panel
      in:fade={{ duration: 0 }}
      out:fade={{ duration: 150 }}
    >
      <div class="panel-content" style:padding={contentPadding}>
        <slot name="panel-content" {error} {loading} />
      </div>
    </div>
  {/if}
</div>

<style>
  .base-popover {
    position: relative;
  }

  .popover-button {
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
    padding: 0;
  }

  .popover-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .popover-panel {
    position: absolute;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-popover);
  }

  .panel-center {
    left: 50%;
    transform: translateX(-50%);
  }

  .panel-right {
    right: 0;
  }

  /* Arrow/tail pointing up to the button - center positioned */
  .panel-center::before {
    content: '';
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .panel-center::after {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  /* Arrow/tail pointing up to the button - right positioned */
  .panel-right::before {
    content: '';
    position: absolute;
    top: -12px;
    right: 20px;
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .panel-right::after {
    content: '';
    position: absolute;
    top: -10px;
    right: 22px;
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  .panel-content {
    /* Padding set via style prop for flexibility */
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .popover-panel {
      max-width: calc(100vw - 40px);
    }

    .panel-right {
      right: -20px;
    }

    .panel-right::before {
      right: 40px;
    }

    .panel-right::after {
      right: 42px;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .popover-button {
      border-width: 2px;
    }
  }
</style>