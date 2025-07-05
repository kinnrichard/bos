<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { onDestroy, onMount, tick } from 'svelte';
  import Portal from './Portal.svelte';
  import { 
    calculatePopoverPosition, 
    getArrowPath, 
    debounce,
    type PopoverPosition 
  } from '$lib/utils/popover-positioning';

  // Props matching BasePopoverButton API
  export let title: string;
  export let error: string = '';
  export let loading: boolean = false;
  export let panelWidth: string = '240px';
  export let panelPosition: 'center' | 'right' = 'center';
  export let topOffset: string = '12px';
  export let contentPadding: string = '16px';
  export let buttonClass: string = '';

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
    placement: 'bottom', // Default to bottom for better compatibility with existing behavior
    arrowPosition: {}
  };
  let isPositioned = false;

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
    if (!$popover.expanded) return;
    if (panelElement && !panelElement.contains(event.target as Node) && !buttonElement.contains(event.target as Node)) {
      popover.close();
    }
  }

  // Calculate position when popover opens
  $: if ($popover.expanded && buttonElement) {
    updatePositionImmediate();
  }

  // Set up content change observer when panel is mounted
  $: if ($popover.expanded && buttonElement && panelElement) {
    setupContentObserver();
    tick().then(() => updatePosition());
  }

  // Clean up observer when popover closes
  $: if (!$popover.expanded && mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  function updatePositionImmediate() {
    if (!buttonElement) return;
    
    // Convert panelWidth to number for calculations
    let estimatedWidth = 240;
    if (panelWidth.endsWith('px')) {
      estimatedWidth = parseInt(panelWidth.replace('px', ''));
    } else if (panelWidth === 'max-content') {
      estimatedWidth = 300; // Reasonable estimate
    }

    // Use estimated dimensions for immediate positioning
    const estimatedDimensions = { width: estimatedWidth, height: 200 };
    
    // Convert panelPosition to preferred placement
    let preferredPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    if (panelPosition === 'center') {
      preferredPlacement = 'bottom';
    } else if (panelPosition === 'right') {
      preferredPlacement = 'bottom';
    }

    const newPosition = calculatePopoverPosition(
      { element: buttonElement, preferredPlacement },
      estimatedDimensions
    );
    
    position = newPosition;
    isPositioned = true;
  }

  function updatePosition() {
    if (!buttonElement || !panelElement) return;
    
    // Use actual panel dimensions for precise positioning
    const panelRect = panelElement.getBoundingClientRect();
    const actualDimensions = { 
      width: panelRect.width || 240, 
      height: panelRect.height || 200 
    };
    
    // Convert panelPosition to preferred placement
    let preferredPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    if (panelPosition === 'center') {
      preferredPlacement = 'bottom';
    } else if (panelPosition === 'right') {
      preferredPlacement = 'bottom';
    }

    const newPosition = calculatePopoverPosition(
      { element: buttonElement, preferredPlacement },
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
</script>

<!-- Global event handlers -->
<svelte:window on:click={handleOutsideClick} on:keydown={handleKeydown} />

<div class="base-popover">
  <button 
    type="button"
    class="popover-button {buttonClass}"
    use:popover.button
    bind:this={buttonElement}
    {title}
    on:click|stopPropagation
  >
    <slot name="button-content" />
  </button>
</div>

<!-- Popover Panel (rendered via Portal) -->
<Portal enabled={$popover.expanded}>
  {#if $popover.expanded}
    <!-- Arrow pointing to button -->
    <div 
      class="popover-arrow" 
      style="
        top: {position.arrowPosition.top || 'auto'}; 
        left: {position.arrowPosition.left || 'auto'}; 
        right: {position.arrowPosition.right || 'auto'}; 
        bottom: {position.arrowPosition.bottom || 'auto'};
        opacity: {isPositioned ? 1 : 0};
      "
    >
      {#if position.placement === 'left' || position.placement === 'right'}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="20" viewBox="0 0 12 20">
          <path
            d={getArrowPath(position.placement)}
            fill="var(--bg-secondary)"
            stroke="var(--border-primary)"
            stroke-width="1"
            stroke-linejoin="miter"
          />
          <!-- Cover the connecting border -->
          {#if position.placement === 'left'}
            <path d="M0 0 L0 20" stroke="var(--bg-secondary)" stroke-width="2" />
          {:else}
            <path d="M12 0 L12 20" stroke="var(--bg-secondary)" stroke-width="2" />
          {/if}
        </svg>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
          <path
            d={getArrowPath(position.placement)}
            fill="var(--bg-secondary)"
            stroke="var(--border-primary)"
            stroke-width="1"
            stroke-linejoin="miter"
          />
          <!-- Cover the connecting border -->
          {#if position.placement === 'top'}
            <path d="M0 0 L20 0" stroke="var(--bg-secondary)" stroke-width="2" />
          {:else}
            <path d="M0 12 L20 12" stroke="var(--bg-secondary)" stroke-width="2" />
          {/if}
        </svg>
      {/if}
    </div>

    <div 
      class="popover-panel"
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
      <div class="panel-content" style="padding: {contentPadding};">
        <slot name="panel-content" {error} {loading} />
      </div>
    </div>
  {/if}
</Portal>

<style>
  .base-popover {
    position: relative;
    display: inline-block;
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
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
  }

  .popover-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .popover-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
  }

  /* Arrow styles - positioned via portal with dynamic placement */
  .popover-arrow {
    position: fixed;
    pointer-events: none;
    z-index: 2001; /* Higher than panel's z-index */
    transition: opacity 0.2s ease;
    width: 20px;
    height: 20px;
    overflow: visible;
  }
  
  .popover-arrow svg {
    filter: drop-shadow(1px 0 1px var(--border-primary));
    display: block;
    overflow: visible;
    width: 100%;
    height: 100%;
  }

  .panel-content {
    /* Padding set via style prop for flexibility */
  }

  /* Responsive adjustments handled by positioning utilities */
  @media (max-width: 768px) {
    .popover-panel {
      max-width: calc(100vw - 40px);
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-button {
      transition: none;
    }
    
    .popover-panel {
      transition: none;
    }
    
    .popover-arrow {
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