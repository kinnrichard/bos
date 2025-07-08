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
    elements: { trigger: meltTrigger, content },
    states: { open }
  } = createPopover({
    positioning: {
      placement: preferredPlacement,
      gutter: 8,
      offset: { mainAxis: 4 }
    },
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
      class="base-popover-panel panel-{preferredPlacement}"
      style="
        width: {panelWidth};
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px);
      "
    >
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
    /* Remove overflow: hidden to allow arrows to extend outside panel */
    z-index: 2000;
  }

  .popover-content-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden; /* Apply overflow to content wrapper instead of panel */
    border-radius: var(--radius-lg); /* Maintain rounded corners on content */
  }

  /* CSS Arrow styles - using ::before and ::after pseudo-elements */
  
  /* Bottom placement (arrow points up to button) */
  .panel-bottom::before {
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
    z-index: 1;
  }

  .panel-bottom::after {
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
    z-index: 2;
  }

  /* Top placement (arrow points down to button) */
  .panel-top::before {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid var(--border-primary);
    z-index: 1;
  }

  .panel-top::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid var(--bg-secondary);
    z-index: 2;
  }

  /* Left placement (arrow points right to button) */
  .panel-left::before {
    content: '';
    position: absolute;
    right: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 12px solid var(--border-primary);
    z-index: 1;
  }

  .panel-left::after {
    content: '';
    position: absolute;
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-left: 10px solid var(--bg-secondary);
    z-index: 2;
  }

  /* Right placement (arrow points left to button) */
  .panel-right::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-right: 12px solid var(--border-primary);
    z-index: 1;
  }

  .panel-right::after {
    content: '';
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid var(--bg-secondary);
    z-index: 2;
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