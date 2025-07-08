<script lang="ts">
  import { createPopover } from '@melt-ui/svelte';
  import Portal from './Portal.svelte';
  import { onDestroy, onMount } from 'svelte';

  // Core popover props
  export let preferredPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  export const trigger: HTMLElement | undefined = undefined; // External reference only
  export let panelWidth: string = '240px';
  export let enabled: boolean = true;

  // Create the Melt UI popover
  const {
    elements: { trigger: meltTrigger, content, arrow },
    states: { open }
  } = createPopover({
    positioning: {
      placement: preferredPlacement,
      gutter: 8,
      offset: { mainAxis: 4 }
    },
    arrowSize: 8,
    disableFocusTrap: false,
    closeOnOutsideClick: true,
    preventScroll: false,
    portal: null // Use portal for proper event handling
  });

  // Export a popover-like API for compatibility with existing code
  export let popover: any = {
    subscribe: () => () => {},
    close: () => {},
    expanded: false
  };

  let buttonElement: HTMLElement;
  let panelElement: HTMLElement;

  // Update the exported popover object to provide compatibility
  $: {
    popover = {
      subscribe: (callback: (state: { expanded: boolean }) => void) => {
        return open.subscribe((isOpen) => {
          callback({ expanded: isOpen });
        });
      },
      close: () => {
        open.set(false);
      },
      expanded: $open
    };
  }

  // Fallback outside click handler in case Melt UI's doesn't work
  function handleOutsideClick(event: MouseEvent) {
    if (!$open || !enabled) return;
    
    const target = event.target as Node;
    if (!target) return;
    
    // Check if click is outside both panel and trigger
    if (panelElement && !panelElement.contains(target) && 
        buttonElement && !buttonElement.contains(target)) {
      open.set(false);
    }
  }

  // Set up fallback outside click listener
  onMount(() => {
    window.addEventListener('click', handleOutsideClick, true);
  });

  onDestroy(() => {
    window.removeEventListener('click', handleOutsideClick, true);
  });

  // Provide close function to slot content
  const closePopover = () => open.set(false);
</script>

<div class="base-popover-container">
  {#if $$slots.trigger}
    <!-- Use slot trigger with Melt trigger action -->
    <div class="base-popover-trigger" bind:this={buttonElement}>
      <slot name="trigger" popover={{
        subscribe: popover.subscribe,
        close: closePopover,
        expanded: $open,
        button: meltTrigger
      }} />
    </div>
  {/if}
</div>

<!-- Render popover content in Portal for proper event isolation -->
<Portal enabled={$open && enabled}>
  {#if $open && enabled}
    <div 
      use:content
      bind:this={panelElement}
      class="base-popover-panel"
      style="
        width: {panelWidth};
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px);
      "
    >
      <!-- Melt UI arrow -->
      <div use:arrow class="popover-arrow"></div>
      
      <div class="popover-content-wrapper">
        <slot close={closePopover} popover={{
          subscribe: popover.subscribe,
          close: closePopover,
          expanded: $open
        }} />
      </div>
    </div>
  {/if}
</Portal>

<style>
  .base-popover-container {
    display: inline-block;
  }

  .base-popover-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .base-popover-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
    z-index: 2000;
  }

  .popover-content-wrapper {
    width: 100%;
    height: 100%;
  }

  .popover-arrow {
    position: absolute;
    z-index: 2001;
  }

  /* Arrow styles will be handled by Melt UI positioning */
  :global(.popover-arrow svg) {
    fill: var(--bg-secondary);
    stroke: var(--border-primary);
    stroke-width: 1px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .base-popover-panel {
      max-width: calc(100vw - 40px);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .base-popover-panel {
      transition: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .base-popover-panel {
      border-width: 2px;
    }
  }
</style>