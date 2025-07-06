import Sortable, { type SortableEvent, type Options, type MoveEvent } from 'sortablejs';

export interface SortableActionOptions extends Partial<Options> {
  onSort?: (event: SortableEvent) => void;
  onStart?: (event: SortableEvent) => void;
  onEnd?: (event: SortableEvent) => void;
  onAdd?: (event: SortableEvent) => void;
  onUpdate?: (event: SortableEvent) => void;
  onRemove?: (event: SortableEvent) => void;
  onMove?: (evt: MoveEvent, originalEvent: Event) => boolean | void | -1 | 1;
}

export type DropZoneInfo = {
  mode: 'reorder' | 'nest';
  position?: 'above' | 'below';
  targetElement: HTMLElement;
};

/**
 * Svelte action for SortableJS integration
 * Based on the working Rails sortable controller patterns
 */
export function sortable(node: HTMLElement, options: SortableActionOptions = {}) {
  let sortableInstance: Sortable;
  let currentDropZone: DropZoneInfo | null = null;
  
  // Default configuration matching the Rails implementation
  const defaultOptions: Options = {
    animation: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ghostClass: 'task-ghost', // Match component configuration
    chosenClass: 'task-chosen', // Match component configuration  
    dragClass: 'task-dragging', // Match component configuration
    dataIdAttr: 'data-task-id',
    handle: undefined, // Allow dragging from anywhere on the element
    disabled: false,
    multiDrag: true,
    multiDragKey: 'ctrl',
    selectedClass: 'task-selected-for-drag', // Match component configuration
    fallbackTolerance: 0,
    emptyInsertThreshold: 5,
    scroll: true,
    scrollSensitivity: 30,
    scrollSpeed: 10,
    bubbleScroll: true,
    // Custom drag image styling
    setData: function (dataTransfer, dragEl) {
      dataTransfer.setData('Text', dragEl.textContent || '');
    },
    // Clean ghost styling
    onChoose: function(evt) {
      // Removed opacity change to prevent dimming when clicking task rows
    },
    onUnchoose: function(evt) {
      if (evt.item) {
        evt.item.style.opacity = '1';
      }
    }
  };

  // Drop zone detection based on cursor position within target task
  function detectDropZone(moveEvent: MoveEvent, originalEvent: Event): DropZoneInfo | null {
    const mouseEvent = originalEvent as MouseEvent;
    const targetElement = moveEvent.related;
    
    if (!targetElement || !mouseEvent) return null;

    const rect = targetElement.getBoundingClientRect();
    const relativeY = mouseEvent.clientY - rect.top;
    const heightRatio = relativeY / rect.height;

    // Drop zones based on Rails logic:
    // Top 30% = reorder above
    // Bottom 30% = reorder below  
    // Middle 40% = nest as subtask
    if (heightRatio <= 0.3) {
      return {
        mode: 'reorder',
        position: 'above',
        targetElement
      };
    } else if (heightRatio >= 0.7) {
      return {
        mode: 'reorder',
        position: 'below',
        targetElement
      };
    } else {
      return {
        mode: 'nest',
        targetElement
      };
    }
  }

  function initSortable() {
    // Merge default options with user options
    const mergedOptions: Options = {
      ...defaultOptions,
      ...options,
      // Ensure callbacks are properly bound
      onStart: (evt) => {
        options.onStart?.(evt);
      },
      onEnd: (evt) => {
        if (evt.item) {
          evt.item.style.opacity = '1';
        }
        // Clear drop zone detection
        currentDropZone = null;
        options.onEnd?.(evt);
      },
      onSort: options.onSort,
      onAdd: options.onAdd,
      onUpdate: options.onUpdate,
      onRemove: options.onRemove,
      onMove: options.onMove
    };

    sortableInstance = Sortable.create(node, mergedOptions);
  }


  function updateOptions(newOptions: SortableActionOptions) {
    if (sortableInstance) {
      // Update the sortable instance with new options
      Object.assign(sortableInstance.options, newOptions);
    }
  }

  // Initialize
  initSortable();

  return {
    update(newOptions: SortableActionOptions) {
      updateOptions(newOptions);
    },
    destroy() {
      if (sortableInstance) {
        sortableInstance.destroy();
      }
    }
  };
}

// Helper function to get multi-selected items
export function getMultiSelectedItems(sortableInstance: Sortable): HTMLElement[] {
  if (!sortableInstance) return [];
  
  // SortableJS stores multi-selected items in the multiDrag plugin
  const selected = document.querySelectorAll('.sortable-selected');
  return Array.from(selected) as HTMLElement[];
}

// Visual feedback functions for drop zones
export function addDropIndicator(targetElement: HTMLElement, position: 'above' | 'below') {
  removeDropIndicator();
  
  const indicator = document.createElement('div');
  indicator.className = 'sortable-drop-indicator';
  indicator.style.cssText = `
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #007AFF, #0099FF);
    border-radius: 2px;
    opacity: 1;
    box-shadow: 0 1px 4px rgba(0, 122, 255, 0.4);
    pointer-events: none;
    z-index: 1000;
  `;
  
  const rect = targetElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  indicator.style.left = rect.left + scrollLeft + 'px';
  indicator.style.width = rect.width + 'px';
  indicator.style.top = (position === 'above' ? rect.top : rect.bottom) + scrollTop + 'px';
  
  document.body.appendChild(indicator);
}

export function addNestHighlight(targetElement: HTMLElement) {
  removeNestHighlight();
  targetElement.classList.add('sortable-nest-target');
}

export function removeDropIndicator() {
  const indicator = document.querySelector('.sortable-drop-indicator');
  if (indicator) {
    indicator.remove();
  }
}

export function removeNestHighlight() {
  const highlighted = document.querySelector('.sortable-nest-target');
  if (highlighted) {
    highlighted.classList.remove('sortable-nest-target');
  }
  
  const invalid = document.querySelector('.sortable-nest-invalid');
  if (invalid) {
    invalid.classList.remove('sortable-nest-invalid');
  }
}

export function clearAllVisualFeedback() {
  removeDropIndicator();
  removeNestHighlight();
}

