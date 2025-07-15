<script lang="ts">
  import { createPopover } from '@melt-ui/svelte';
  import Portal from './Portal.svelte';
  import { onDestroy, onMount, tick } from 'svelte';
  import { calculatePopoverPosition, type PopoverPosition } from '$lib/utils/popover-positioning';

  // Core popover props
  let {
    preferredPlacement = 'bottom' as 'top' | 'bottom' | 'left' | 'right',
    panelWidth = '240px',
    enabled = true
  } = $props();

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

  let buttonElement = $state<HTMLElement>();
  let panelElement = $state<HTMLElement>();
  
  // Arrow positioning state
  let arrowPosition: { top: number; left: number } = { top: 0, left: 0 };
  let arrowPositioned = false;

  // Disable custom arrow positioning for now
  // $: if ($open && buttonElement && panelElement) {
  //   calculateArrowPosition();
  // }

  // Reset arrow position when popover closes
  $effect(() => {
    if (!$open) {
      arrowPositioned = false;
    }
  });

  async function calculateArrowPosition() {
    // Wait for next tick to ensure panel is positioned
    await tick();
    
    if (!buttonElement || !panelElement) return;
    
    // Find the actual button element inside the wrapper
    const actualButton = buttonElement.querySelector('button') || buttonElement;
    const triggerRect = actualButton.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    
    // Calculate arrow position relative to the trigger button
    const triggerCenterX = triggerRect.left + (triggerRect.width / 2);
    const triggerCenterY = triggerRect.top + (triggerRect.height / 2);
    
    let arrowLeft: number;
    let arrowTop: number;
    
    // Debug logging
    console.log('Arrow positioning debug:', {
      placement: preferredPlacement,
      triggerRect: { top: triggerRect.top, left: triggerRect.left, width: triggerRect.width, height: triggerRect.height },
      panelRect: { top: panelRect.top, left: panelRect.left, width: panelRect.width, height: panelRect.height },
      triggerCenterY,
      triggerCenterX
    });
    
    switch (preferredPlacement) {
      case 'left':
        // Arrow points right to button - check if we should use default centering
        const panelCenterY = panelRect.top + (panelRect.height / 2);
        const distanceFromCenter = Math.abs(triggerCenterY - panelCenterY);
        
        // If trigger is close to panel center (within 20px), use centered arrow
        if (distanceFromCenter <= 20) {
          arrowLeft = panelRect.width - 1;
          arrowTop = panelRect.height / 2; // Center the arrow
          console.log('Left placement - using centered arrow:', { arrowLeft, arrowTop });
        } else {
          // Use positioned arrow when trigger is far from center
          arrowLeft = panelRect.width - 1;
          let relativeTop = triggerCenterY - panelRect.top;
          arrowTop = Math.max(12, Math.min(
            Math.max(0, relativeTop), 
            panelRect.height - 12
          ));
          console.log('Left placement - using positioned arrow:', { 
            arrowLeft, 
            arrowTop, 
            triggerCenterY, 
            panelCenterY,
            distanceFromCenter,
            relativeTop 
          });
        }
        break;
        
      case 'right':
        // Arrow points left to button
        arrowLeft = 1; // Position arrow at left edge of panel
        arrowTop = Math.max(12, Math.min(
          triggerCenterY - panelRect.top,
          panelRect.height - 12
        ));
        break;
        
      case 'bottom':
        // Arrow points up to button - position relative to panel
        arrowTop = 1; // Position arrow at top edge of panel
        arrowLeft = Math.max(12, Math.min(
          triggerCenterX - panelRect.left, // Distance from panel left to trigger center
          panelRect.width - 12 // Don't go beyond 12px from right edge
        ));
        break;
        
      case 'top':
        // Arrow points down to button
        arrowTop = panelRect.height - 1; // Position arrow at bottom edge of panel
        arrowLeft = Math.max(12, Math.min(
          triggerCenterX - panelRect.left,
          panelRect.width - 12
        ));
        break;
        
      default:
        arrowLeft = 0;
        arrowTop = 0;
    }
    
    arrowPosition = { left: arrowLeft, top: arrowTop };
    arrowPositioned = true;
    
    // Apply CSS custom properties for arrow positioning
    panelElement.style.setProperty('--arrow-left', arrowLeft + 'px');
    panelElement.style.setProperty('--arrow-top', arrowTop + 'px');
    
    console.log('Final arrow position:', { arrowLeft, arrowTop });
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
        <slot close={closePopover} />
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
    top: -9px;
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
    bottom: -9px;
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
    right: -9px;
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
    left: -9px;
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