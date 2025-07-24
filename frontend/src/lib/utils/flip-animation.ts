/**
 * FLIP Animation Utility
 * 
 * Implements the FLIP (First, Last, Invert, Play) technique for smooth,
 * performant animations when DOM elements change position.
 */

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationOptions {
  duration?: number;
  easing?: string;
  stagger?: number;
  onComplete?: () => void;
}

export class FlipAnimator {
  private positions = new Map<string, Position>();
  private preDragPositions = new Map<string, Position>();
  private animationFrame: number | null = null;
  private isAnimating = false;

  /**
   * Capture current positions of elements
   */
  capturePositions(elements: HTMLElement[], getKey: (el: HTMLElement) => string) {
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const key = getKey(element);
      this.positions.set(key, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      });
    });
  }

  /**
   * Capture pre-drag positions from ghost elements during multi-drag
   */
  capturePreDragPositions(elements: HTMLElement[], getKey: (el: HTMLElement) => string) {
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const key = getKey(element);
      this.preDragPositions.set(key, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      });
    });
  }

  /**
   * Animate elements from their previous positions to current positions
   */
  animate(
    elements: HTMLElement[], 
    getKey: (el: HTMLElement) => string,
    options: AnimationOptions = {}
  ) {
    if (this.isAnimating) return;

    const {
      duration = 300,
      easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
      stagger = 0,
      onComplete
    } = options;

    // First: Capture current positions
    const currentPositions = new Map<string, { position: Position; element: HTMLElement }>();
    elements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const key = getKey(element);
      currentPositions.set(key, {
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        element
      });
    });

    // Last: Get previous positions
    const animations: Array<{
      element: HTMLElement;
      deltaX: number;
      deltaY: number;
      index: number;
    }> = [];

    currentPositions.forEach((current, key) => {
      // Use pre-drag position if available (for multi-drag), otherwise use regular previous position
      const preDragPos = this.preDragPositions.get(key);
      const previous = preDragPos || this.positions.get(key);
      
      if (previous) {
        const deltaX = previous.x - current.position.x;
        const deltaY = previous.y - current.position.y;
        
        // Only animate if there's a significant change
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          if (preDragPos) {
            console.log(`[FLIP] Task ${key} using pre-drag position: from (${previous.x}, ${previous.y}) to (${current.position.x}, ${current.position.y})`);
          }
          animations.push({
            element: current.element,
            deltaX,
            deltaY,
            index: animations.length
          });
        }
      }
    });

    if (animations.length === 0) {
      this.capturePositions(elements, getKey);
      onComplete?.();
      return;
    }

    this.isAnimating = true;
    
    // Mark container as animating if available
    const container = elements[0]?.parentElement;
    if (container) {
      container.dataset.flipActive = 'true';
    }

    // Invert: Apply transforms to move elements to their old positions
    animations.forEach(({ element, deltaX, deltaY }) => {
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      element.style.transition = 'none';
    });

    // Force browser to apply the transforms
    void document.body.offsetHeight;

    // Play: Animate back to final positions
    this.animationFrame = requestAnimationFrame(() => {
      animations.forEach(({ element, index }) => {
        // Mark element as animating
        element.dataset.flipAnimating = 'true';
        
        setTimeout(() => {
          element.style.transform = '';
          element.style.transition = `transform ${duration}ms ${easing}`;
        }, index * stagger);
      });

      // Cleanup after animation
      setTimeout(() => {
        animations.forEach(({ element }) => {
          element.style.transform = '';
          element.style.transition = '';
          element.dataset.flipAnimating = 'false';
        });
        // Clear container animation state
        if (container) {
          container.dataset.flipActive = 'false';
        }
        // Clear pre-drag positions after animation completes
        this.preDragPositions.clear();
        this.isAnimating = false;
        this.capturePositions(elements, getKey);
        onComplete?.();
      }, duration + (animations.length * stagger));
    });
  }

  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Cancel any ongoing animation
   */
  cancel() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isAnimating = false;
  }

  /**
   * Clear stored positions
   */
  clear() {
    this.positions.clear();
    this.preDragPositions.clear();
    this.cancel();
  }

  /**
   * Clear pre-drag positions only
   */
  clearPreDragPositions() {
    this.preDragPositions.clear();
  }
}

/**
 * Helper to create a debounced animator
 */
export function createDebouncedAnimator(delay: number = 50) {
  const animator = new FlipAnimator();
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return {
    animator,
    animateDebounced(
      elements: HTMLElement[],
      getKey: (el: HTMLElement) => string,
      options?: AnimationOptions
    ) {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        animator.animate(elements, getKey, options);
        timeout = null;
      }, delay);
    },
    cancel() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      animator.cancel();
    }
  };
}