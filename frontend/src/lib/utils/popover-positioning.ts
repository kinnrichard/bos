export interface PopoverPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
  arrowPosition: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
  maxHeight?: number;
  maxWidth?: number;
}

export interface PopoverDimensions {
  width: number;
  height: number;
}

export interface TriggerElement {
  element: HTMLElement;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

const POPOVER_OFFSET = 8; // Distance between trigger and popover
const ARROW_SIZE = 12; // Arrow width/height
const VIEWPORT_PADDING = 20; // Minimum distance from viewport edge

/**
 * Calculate the optimal position for a popover relative to a trigger element
 */
export function calculatePopoverPosition(
  trigger: TriggerElement,
  popoverDimensions: PopoverDimensions
): PopoverPosition {
  const triggerRect = trigger.element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const { width: popoverWidth, height: popoverHeight } = popoverDimensions;
  
  // Calculate available space in each direction
  const spaceTop = triggerRect.top;
  const spaceBottom = viewportHeight - triggerRect.bottom;
  const spaceLeft = triggerRect.left;
  const spaceRight = viewportWidth - triggerRect.right;
  
  // Try preferred placement first, then fallback to best fit
  const preferredPlacement = trigger.preferredPlacement || 'left';
  let placement = preferredPlacement;
  
  // Check if preferred placement fits, otherwise find best alternative
  if (preferredPlacement === 'left' && spaceLeft < popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
    if (spaceRight >= popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'right';
    } else if (spaceBottom >= popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'bottom';
    } else if (spaceTop >= popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'top';
    }
  } else if (preferredPlacement === 'right' && spaceRight < popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
    if (spaceLeft >= popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'left';
    } else if (spaceBottom >= popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'bottom';
    } else if (spaceTop >= popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'top';
    }
  } else if (preferredPlacement === 'top' && spaceTop < popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
    if (spaceBottom >= popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'bottom';
    } else if (spaceLeft >= popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'left';
    } else if (spaceRight >= popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'right';
    }
  } else if (preferredPlacement === 'bottom' && spaceBottom < popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
    if (spaceTop >= popoverHeight + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'top';
    } else if (spaceLeft >= popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'left';
    } else if (spaceRight >= popoverWidth + POPOVER_OFFSET + VIEWPORT_PADDING) {
      placement = 'right';
    }
  }
  
  return calculatePositionForPlacement(triggerRect, popoverDimensions, placement);
}

/**
 * Calculate position and arrow placement for a specific placement direction
 */
function calculatePositionForPlacement(
  triggerRect: DOMRect,
  popoverDimensions: PopoverDimensions,
  placement: 'top' | 'bottom' | 'left' | 'right'
): PopoverPosition {
  const { width: popoverWidth, height: popoverHeight } = popoverDimensions;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let top: number;
  let left: number;
  let arrowPosition: PopoverPosition['arrowPosition'] = {};
  let maxHeight: number | undefined;
  let maxWidth: number | undefined;
  
  switch (placement) {
    case 'left':
      left = triggerRect.left - popoverWidth - POPOVER_OFFSET;
      top = triggerRect.top + (triggerRect.height / 2) - (popoverHeight / 2);
      
      // Constrain to viewport
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
        maxWidth = triggerRect.left - POPOVER_OFFSET - VIEWPORT_PADDING;
      }
      
      if (top < VIEWPORT_PADDING) {
        top = VIEWPORT_PADDING;
      } else if (top + popoverHeight > viewportHeight - VIEWPORT_PADDING) {
        top = viewportHeight - popoverHeight - VIEWPORT_PADDING;
      }
      
      // Calculate arrow position (pointing right) - center arrow on trigger button
      const triggerCenter = triggerRect.top + (triggerRect.height / 2);
      const arrowTop = triggerCenter - top - 10; // Subtract half arrow height (20px / 2)
      const clampedArrowTop = Math.max(5, Math.min(popoverHeight - 25, arrowTop));
      
      // Position arrow slightly inside the right edge of the popover
      const arrowLeftPos = left + popoverWidth - 5; // 5px inward from right edge
      
      // Use absolute positioning for arrow top (not relative to popover)
      const arrowAbsoluteTop = triggerCenter - 10; // Center arrow on trigger
      
      
      arrowPosition = {
        top: `${arrowAbsoluteTop}px`,
        left: `${arrowLeftPos}px`
      };
      break;
      
    case 'right':
      left = triggerRect.right + POPOVER_OFFSET;
      top = triggerRect.top + (triggerRect.height / 2) - (popoverHeight / 2);
      
      // Constrain to viewport
      if (left + popoverWidth > viewportWidth - VIEWPORT_PADDING) {
        maxWidth = viewportWidth - left - VIEWPORT_PADDING;
      }
      
      if (top < VIEWPORT_PADDING) {
        top = VIEWPORT_PADDING;
      } else if (top + popoverHeight > viewportHeight - VIEWPORT_PADDING) {
        top = viewportHeight - popoverHeight - VIEWPORT_PADDING;
      }
      
      // Calculate arrow position (pointing left)
      const triggerCenterRight = triggerRect.top + (triggerRect.height / 2);
      const arrowTopRight = triggerCenterRight - top;
      const clampedArrowTopRight = Math.max(10, Math.min(popoverHeight - 20, arrowTopRight));
      arrowPosition = {
        top: `${clampedArrowTopRight}px`,
        left: `-${ARROW_SIZE}px`
      };
      break;
      
    case 'top':
      top = triggerRect.top - popoverHeight - POPOVER_OFFSET;
      left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2);
      
      // Constrain to viewport
      if (top < VIEWPORT_PADDING) {
        top = VIEWPORT_PADDING;
        maxHeight = triggerRect.top - POPOVER_OFFSET - VIEWPORT_PADDING;
      }
      
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      } else if (left + popoverWidth > viewportWidth - VIEWPORT_PADDING) {
        left = viewportWidth - popoverWidth - VIEWPORT_PADDING;
      }
      
      // Calculate arrow position (pointing down)
      const triggerCenterTop = triggerRect.left + (triggerRect.width / 2);
      const arrowLeft = triggerCenterTop - left;
      arrowPosition = {
        left: `${Math.max(10, Math.min(popoverWidth - 10, arrowLeft))}px`,
        bottom: `-${ARROW_SIZE}px`
      };
      break;
      
    case 'bottom':
      top = triggerRect.bottom + POPOVER_OFFSET;
      left = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2);
      
      // Constrain to viewport
      if (top + popoverHeight > viewportHeight - VIEWPORT_PADDING) {
        maxHeight = viewportHeight - top - VIEWPORT_PADDING;
      }
      
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
      } else if (left + popoverWidth > viewportWidth - VIEWPORT_PADDING) {
        left = viewportWidth - popoverWidth - VIEWPORT_PADDING;
      }
      
      // Calculate arrow position (pointing up)
      const triggerCenterBottom = triggerRect.left + (triggerRect.width / 2);
      const arrowLeftBottom = triggerCenterBottom - left;
      arrowPosition = {
        left: `${Math.max(10, Math.min(popoverWidth - 10, arrowLeftBottom))}px`,
        top: `-${ARROW_SIZE}px`
      };
      break;
  }
  
  return {
    top,
    left,
    placement,
    arrowPosition,
    maxHeight,
    maxWidth
  };
}

/**
 * Get the appropriate arrow SVG path for a given placement
 */
export function getArrowPath(placement: 'top' | 'bottom' | 'left' | 'right'): string {
  switch (placement) {
    case 'left':
      return 'M0 0 L0 20 L12 10 Z'; // Points right
    case 'right':
      return 'M12 0 L12 20 L0 10 Z'; // Points left
    case 'top':
      return 'M0 0 L20 0 L10 12 Z'; // Points down
    case 'bottom':
      return 'M0 12 L20 12 L10 0 Z'; // Points up
    default:
      return 'M0 0 L0 20 L12 10 Z';
  }
}

/**
 * Debounced position update for scroll/resize events
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}