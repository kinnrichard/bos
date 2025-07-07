<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { onDestroy, onMount, tick } from 'svelte';
  import Portal from './Portal.svelte';
  import { 
    calculatePopoverPosition, 
    debounce,
    type PopoverPosition 
  } from '$lib/utils/popover-positioning';

  // Core popover props
  export let preferredPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  export let trigger: HTMLElement | undefined = undefined;
  export let panelWidth: string = '240px';
  export let enabled: boolean = true;

  const popover = createPopover();
  
  // Export the popover instance for parent components to control
  export { popover };

  let buttonElement: HTMLElement;
  let panelElement: HTMLElement;
  let mutationObserver: MutationObserver | null = null;

  // Portal positioning
  let position: PopoverPosition = {
    top: 0,
    left: 0,
    placement: preferredPlacement,
    arrowPosition: { top: 0, left: 0 }
  };
  let isPositioned = false;

  // Use provided trigger element or button element
  $: triggerElement = trigger || buttonElement;

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

  // Handle keyboard events
  function handleKeydown(event: KeyboardEvent) {
    if (!$popover.expanded) return;
    if (event.key === 'Escape') {
      popover.close();
    }
  }

  // Handle outside clicks
  function handleOutsideClick(event: MouseEvent) {
    if (!$popover.expanded || !enabled) return;
    if (panelElement && !panelElement.contains(event.target as Node) && 
        triggerElement && !triggerElement.contains(event.target as Node)) {
      popover.close();
    }
  }

  // Calculate position when popover opens
  $: if ($popover.expanded && triggerElement) {
    updatePositionImmediate();
  }

  // Set up content change observer when panel is mounted
  $: if ($popover.expanded && triggerElement && panelElement) {
    setupContentObserver();
    tick().then(() => updatePosition());
  }

  // Clean up observer when popover closes
  $: if (!$popover.expanded && mutationObserver) {
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
    if ($popover.expanded) {
      updatePosition();
    }
  }, 10);

  // Provide close function to slot content
  const close = () => popover.close();
</script>

<!-- Global event handlers -->
<svelte:window on:click={handleOutsideClick} on:keydown={handleKeydown} />

<!-- Trigger slot (optional - can use external trigger) -->
{#if $$slots.trigger}
  <div class="base-popover-trigger" bind:this={buttonElement}>
    <slot name="trigger" {popover} />
  </div>
{/if}

<!-- Popover Panel (rendered via Portal) -->
<Portal enabled={$popover.expanded && enabled}>
  {#if $popover.expanded && enabled}
    <!-- Separate arrow element -->
    <div 
      class="popover-arrow panel-{position.placement}"
      style="
        position: fixed;
        top: {position.arrowPosition.top}px;
        left: {position.arrowPosition.left}px;
        opacity: {isPositioned ? 1 : 0};
        transition: opacity 0.2s ease;
        z-index: 2001;
      "
    ></div>

    <div 
      class="base-popover-panel"
      use:popover.panel
      bind:this={panelElement}
      style="
        position: fixed;
        top: {position.top}px;
        left: {position.left}px;
        width: {panelWidth};
        max-width: {position.maxWidth ? position.maxWidth + 'px' : 'calc(100vw - 40px)'};
        max-height: {position.maxHeight ? position.maxHeight + 'px' : 'calc(100vh - 100px)'};
        opacity: {isPositioned ? 1 : 0};
        transition: opacity 0.2s ease;
        z-index: 2000;
      "
    >
      <slot {close} {popover} />
    </div>
  {/if}
</Portal>

<style>
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
  }

  /* Arrow styles - separate DOM elements with CSS border triangles */
  .popover-arrow {
    width: 20px;
    height: 20px;
    pointer-events: none;
  }

  /* Bottom placement (arrow points up to button) */
  .panel-bottom::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .panel-bottom::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  /* Top placement (arrow points down to button) */
  .panel-top::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid var(--border-primary);
  }

  .panel-top::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid var(--bg-secondary);
  }

  /* Left placement (arrow points right to button) */
  .panel-left::before {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 12px solid var(--border-primary);
  }

  .panel-left::after {
    content: '';
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-left: 10px solid var(--bg-secondary);
  }

  /* Right placement (arrow points left to button) */
  .panel-right::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-right: 12px solid var(--border-primary);
  }

  .panel-right::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid var(--bg-secondary);
  }

  /* Responsive adjustments handled by positioning utilities */
  @media (max-width: 768px) {
    .base-popover-panel {
      max-width: calc(100vw - 40px);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .base-popover-panel,
    .popover-arrow {
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