<script lang="ts">
  import { createPopover } from '@melt-ui/svelte';
  import Portal from './Portal.svelte';
  import { 
    calculatePopoverPosition, 
    debounce,
    type PopoverPosition 
  } from '$lib/utils/popover-positioning';
  import { onDestroy, onMount, tick } from 'svelte';

  // Core popover props
  export let preferredPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  export let trigger: HTMLElement | undefined = undefined;
  export let panelWidth: string = '240px';
  export let enabled: boolean = true;

  // Create the Melt UI popover
  const {
    elements: { trigger: meltTrigger, content, arrow, close: meltClose },
    states: { open }
  } = createPopover({
    positioning: {
      placement: preferredPlacement,
      gutter: 5,
      offset: { mainAxis: 4 }
    },
    arrowSize: 8,
    disableFocusTrap: false,
    closeOnOutsideClick: true,
    preventScroll: false
  });

  // Export a popover-like API for compatibility with existing code
  export let popover: any = {
    subscribe: () => () => {},
    close: () => {},
    expanded: false
  };

  let buttonElement: HTMLElement;
  let panelElement: HTMLElement;
  let mutationObserver: MutationObserver | null = null;

  // Portal positioning - for custom positioning if needed
  let position: PopoverPosition = {
    top: 0,
    left: 0,
    placement: preferredPlacement,
    arrowPosition: { top: 0, left: 0 }
  };
  let isPositioned = false;

  // Use provided trigger element or button element
  $: triggerElement = trigger || buttonElement;

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

  // Set up scroll and resize listeners
  onMount(() => {
    window.addEventListener('scroll', debouncedUpdatePosition, true);
    window.addEventListener('resize', debouncedUpdatePosition);
  });

  onDestroy(() => {
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    window.removeEventListener('scroll', debouncedUpdatePosition, true);
    window.removeEventListener('resize', debouncedUpdatePosition);
  });

  // Calculate position when popover opens (if custom positioning is needed)
  $: if ($open && triggerElement && panelElement) {
    updatePositionImmediate();
    setupContentObserver();
    tick().then(() => updatePosition());
  }

  // Clean up observer when popover closes
  $: if (!$open && mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  function updatePositionImmediate() {
    if (!triggerElement) return;
    
    // Convert panelWidth to number for calculations
    let estimatedWidth = 240;
    if (panelWidth.endsWith('px')) {
      estimatedWidth = parseInt(panelWidth.replace('px', ''));
    } else if (panelWidth === 'max-content') {
      estimatedWidth = 300; // Reasonable estimate
    }

    // Use estimated dimensions for immediate positioning
    const estimatedDimensions = { width: estimatedWidth, height: 200 };

    const newPosition = calculatePopoverPosition(
      { element: triggerElement, preferredPlacement },
      estimatedDimensions
    );
    
    position = newPosition;
    isPositioned = true;
  }

  function updatePosition() {
    if (!triggerElement || !panelElement) return;
    
    // Use actual panel dimensions for precise positioning
    const panelRect = panelElement.getBoundingClientRect();
    const actualDimensions = { 
      width: panelRect.width || 240, 
      height: panelRect.height || 200 
    };

    const newPosition = calculatePopoverPosition(
      { element: triggerElement, preferredPlacement },
      actualDimensions
    );
    
    position = newPosition;
  }

  function setupContentObserver() {
    if (!panelElement || mutationObserver) return;
    
    // Create observer to watch for content changes
    mutationObserver = new MutationObserver((mutations) => {
      const hasContentChange = mutations.some(mutation => 
        mutation.type === 'childList' || 
        mutation.type === 'characterData' ||
        (mutation.type === 'attributes' && mutation.attributeName === 'style')
      );
      
      if (hasContentChange) {
        debouncedUpdatePosition();
      }
    });
    
    // Start observing changes to the panel content
    mutationObserver.observe(panelElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  const debouncedUpdatePosition = debounce(() => {
    if ($open) {
      updatePosition();
    }
  }, 10);

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

  {#if $open && enabled}
    <!-- Use Melt UI content without Portal to avoid conflicts -->
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
      <!-- Optional arrow -->
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
</div>

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