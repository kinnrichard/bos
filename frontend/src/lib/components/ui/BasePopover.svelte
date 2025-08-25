<script lang="ts">
  import { createPopover } from '@melt-ui/svelte';
  import Portal from './Portal.svelte';
  import { onDestroy, onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  // import { calculatePopoverPosition, type PopoverPosition } from '$lib/utils/popover-positioning';
  import { debugComponent } from '$lib/utils/debug';
  import { registerPopover } from '$lib/stores/popover-state';

  // Enhanced popover props with new options
  let {
    preferredPlacement = 'bottom' as 'top' | 'bottom' | 'left' | 'right',
    panelWidth = '240px',
    panelMaxHeight,
    panelMinWidth,
    offset = 8,
    showArrow = true,
    closeOnClickOutside = true,
    closeOnEscape = true,
    animationDuration = 200,
    className = '',
    arrowClassName = '', // eslint-disable-line @typescript-eslint/no-unused-vars
    enabled = true,
    trigger,
    children,
  }: {
    preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
    panelWidth?: string;
    panelMaxHeight?: string;
    panelMinWidth?: string;
    offset?: number;
    showArrow?: boolean;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    animationDuration?: number;
    className?: string;
    arrowClassName?: string;
    enabled?: boolean;
    trigger?: import('svelte').Snippet<
      [{ popover: { close: () => void; expanded: boolean; button: unknown } }]
    >;
    children?: import('svelte').Snippet<[{ close: () => void }]>;
  } = $props();

  // Create the Melt UI popover with enhanced configuration
  const {
    elements: { trigger: meltTrigger, content },
    states: { open },
  } = createPopover({
    positioning: {
      placement: preferredPlacement,
      gutter: offset,
      offset: { mainAxis: 4 },
    },
    disableFocusTrap: false,
    closeOnOutsideClick: closeOnClickOutside,
    preventScroll: false,
    portal: null, // Use portal for proper event handling
  });

  let buttonElement = $state<HTMLElement>();
  let panelElement = $state<HTMLElement>();

  // Arrow positioning state
  let arrowPosition = $state<{ top: string; left: string }>({ top: '50%', left: '50%' });
  let arrowPositioned = $state(false);

  // Disable custom arrow positioning for now
  // $effect(() => {
  //   if ($open && showArrow && buttonElement && panelElement) {
  //     calculateArrowPosition();
  //   }
  // });

  // Reset arrow position when popover closes
  $effect(() => {
    if (!$open) {
      arrowPositioned = false;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function calculateArrowPosition() {
    if (!buttonElement || !panelElement || !showArrow) return;

    await tick();
    await new Promise(resolve => requestAnimationFrame(resolve));

    // Find the actual trigger button - be more thorough in searching
    const actualButton = buttonElement.querySelector('button') || 
                        buttonElement.querySelector('[role="button"]') || 
                        buttonElement.querySelector('.task-action-button') ||
                        buttonElement;

    const triggerRect = actualButton.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();

    if (preferredPlacement === 'left' || preferredPlacement === 'right') {
      // Calculate where the trigger center should be relative to the panel
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;
      const panelTop = panelRect.top;
      const panelHeight = panelRect.height;
      
      // Calculate the relative position within the panel
      const relativeY = triggerCenterY - panelTop;
      
      // Ensure arrow stays within reasonable bounds (20px from edges)
      const minY = 20;
      const maxY = panelHeight - 20;
      const clampedY = Math.max(minY, Math.min(maxY, relativeY));
      const percentY = (clampedY / panelHeight) * 100;
      
      const finalArrowTop = `${percentY}%`;
    
      // Set the CSS custom property
      panelElement.style.setProperty('--arrow-top', finalArrowTop);
      
      // Also try setting it on the root for debugging
      document.documentElement.style.setProperty('--debug-arrow-top', finalArrowTop);
      
    } else if (preferredPlacement === 'top' || preferredPlacement === 'bottom') {
      // Handle horizontal arrow positioning
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      const relativeX = triggerCenterX - panelRect.left;
      
      const minX = 20;
      const maxX = panelRect.width - 20;
      const clampedX = Math.max(minX, Math.min(maxX, relativeX));
      const percentX = (clampedX / panelRect.width) * 100;
      
      panelElement.style.setProperty('--arrow-left', `${percentX}%`);
      console.log('Horizontal arrow positioned at:', `${percentX}%`);
    }

    arrowPositioned = true;
    console.log('=== End Arrow Debug ===');
  }

  // Enhanced outside click handler with configurable behavior
  function handleOutsideClick(event: MouseEvent) {
    if (!$open || !enabled || !closeOnClickOutside) return;

    const target = event.target as Node;
    if (!target) return;

    // Check if click is outside both panel and trigger
    if (
      panelElement &&
      !panelElement.contains(target) &&
      buttonElement &&
      !buttonElement.contains(target)
    ) {
      open.set(false);
    }
  }

  // Escape key handler
  function handleKeydown(event: KeyboardEvent) {
    if (!$open || !enabled || !closeOnEscape) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      open.set(false);
    }
  }

  // Set up event listeners
  onMount(() => {
    if (closeOnClickOutside) {
      window.addEventListener('click', handleOutsideClick, true);
    }
    if (closeOnEscape) {
      window.addEventListener('keydown', handleKeydown, true);
    }
  });

  onDestroy(() => {
    window.removeEventListener('click', handleOutsideClick, true);
    window.removeEventListener('keydown', handleKeydown, true);
  });

  // Provide close function to slot content
  const closePopover = () => open.set(false);

  // Register with global popover state when open
  let unregisterPopover: (() => void) | null = null;

  $effect(() => {
    if ($open && enabled) {
      // Register this popover as open
      unregisterPopover = registerPopover();
      
      // Calculate dynamic arrow positioning
      if (panelElement && buttonElement && showArrow) {
        tick().then(() => {
          calculateArrowPosition();
        });
      }
    } else if (unregisterPopover) {
      // Unregister when closing
      unregisterPopover();
      unregisterPopover = null;
    }
  });

  // Clean up on destroy
  onDestroy(() => {
    if (unregisterPopover) {
      unregisterPopover();
    }
  });
</script>

<div class="base-popover-container">
  {#if trigger}
    <!-- Use trigger snippet with Melt trigger action -->
    <div class="base-popover-trigger" bind:this={buttonElement}>
      {@render trigger({
        popover: {
          close: closePopover,
          expanded: $open,
          button: meltTrigger,
        },
      })}
    </div>
  {/if}
</div>

<!-- Render popover content in Portal for proper event isolation -->
<Portal enabled={$open && enabled}>
  {#if $open && enabled}
    <div
      use:content
      bind:this={panelElement}
      class="base-popover-panel panel-{preferredPlacement} {className}"
      class:has-arrow={showArrow && arrowPositioned}
      style="
        width: {panelWidth};
        min-width: {panelMinWidth || 'auto'};
        max-width: calc(100vw - 40px);
        max-height: {panelMaxHeight || 'calc(100vh - 100px)'};
        --arrow-left: {arrowPosition.left};
        --arrow-top: {arrowPosition.top};
      "
      transition:fade|global={{ duration: animationDuration }}
    >
      {#if showArrow !== false}
        <!-- Arrow will be added via CSS pseudo-elements -->
      {/if}
      <div class="base-popover-inner">
        <div class="popover-content-wrapper">
          {@render children?.({ close: closePopover })}
        </div>
      </div>
    </div>
  {/if}
</Portal>

<style>
  .base-popover-container {
    display: flex;
    align-items: center; /* This centers children vertically */
  }

  .base-popover-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .base-popover-panel {
    /* Panel is now just a positioning container for arrows */
    z-index: var(--z-popover, 2000);
    position: relative;
  }

  /* Moving away the panel triangle object to the icon button */
  .base-popover-panel.panel-left {
    transform: translateX(-5px);
  }

  /* Moving away the panel triangle object to the icon button */
  .base-popover-panel.panel-bottom {
    transform: translateY(5px);
  }

  .base-popover-inner {
    /* All visual styling moved here */
    background-color: var(--bg-secondary);
    box-shadow:
      inset 0 0 0 1px var(--border-primary),
      var(--shadow-xl);
    border-radius: var(--radius-lg);
    overflow: hidden; /* Clip content to rounded corners */
    width: 100%;
    height: 100%;
  }

  .popover-content-wrapper {
    width: 100%;
    max-height: calc(100vh - 100px); /* Match parent's default max-height */
    overflow-y: auto; /* Enable scrolling */
    overflow-x: hidden;
    overscroll-behavior: contain; /* Prevent scroll chaining */
  }

  /* Scrollbar styling */
  .popover-content-wrapper::-webkit-scrollbar {
    width: 6px;
  }

  .popover-content-wrapper::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }

  .popover-content-wrapper::-webkit-scrollbar-thumb {
    background-color: var(--border-secondary);
    border-radius: 3px;
  }

  .popover-content-wrapper::-webkit-scrollbar-thumb:hover {
    background-color: var(--border-primary);
  }

  /* CSS Arrow styles - using ::before and ::after pseudo-elements */

  /* Bottom placement (arrow points up to button) */
  .panel-bottom::before {
    content: '';
    position: absolute;
    top: -12px;
    left: var(--arrow-left, 50%);
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
    left: var(--arrow-left, 50%);
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
    z-index: 2;
  }

  .panel-top::before {
    content: '';
    position: absolute;
    bottom: -12px;
    left: var(--arrow-left, 50%);
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
    left: var(--arrow-left, 50%);
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
    top: var(--arrow-top, 50%);
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
    top: var(--arrow-top, 50%);
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
    top: var(--arrow-top, 50%);
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
    top: var(--arrow-top, 50%);
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
