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

/**
 * Svelte action for SortableJS integration
 * Based on the working Rails sortable controller patterns
 */
export function sortable(node: HTMLElement, options: SortableActionOptions = {}) {
  let sortableInstance: Sortable;
  
  // Default configuration matching the Rails implementation
  const defaultOptions: Options = {
    animation: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    dataIdAttr: 'data-task-id',
    handle: undefined, // Allow dragging from anywhere on the element
    disabled: false,
    multiDrag: true,
    multiDragKey: 'ctrl',
    selectedClass: 'sortable-selected',
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
      if (evt.item) {
        evt.item.style.opacity = '0.5';
      }
    },
    onUnchoose: function(evt) {
      if (evt.item) {
        evt.item.style.opacity = '1';
      }
    }
  };

  function initSortable() {
    // Merge default options with user options
    const mergedOptions: Options = {
      ...defaultOptions,
      ...options,
      // Ensure callbacks are properly bound
      onStart: (evt) => {
        addDropIndicator();
        options.onStart?.(evt);
      },
      onEnd: (evt) => {
        removeDropIndicator();
        if (evt.item) {
          evt.item.style.opacity = '1';
        }
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

  function addDropIndicator() {
    // Create blue drop line indicator similar to Rails implementation
    if (!document.querySelector('.sortable-drop-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'sortable-drop-indicator';
      indicator.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #007AFF, #0099FF);
        border-radius: 2px;
        opacity: 0;
        transition: opacity 150ms ease;
        box-shadow: 0 1px 4px rgba(0, 122, 255, 0.4);
        pointer-events: none;
        z-index: 1000;
        display: none;
      `;
      document.body.appendChild(indicator);
    }
  }

  function removeDropIndicator() {
    const indicator = document.querySelector('.sortable-drop-indicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
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
      removeDropIndicator();
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

// Helper function to show drop indicator at specific position
export function showDropIndicator(targetElement: HTMLElement, position: 'top' | 'bottom') {
  const indicator = document.querySelector('.sortable-drop-indicator') as HTMLElement;
  if (!indicator) return;

  const rect = targetElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  indicator.style.left = rect.left + scrollLeft + 'px';
  indicator.style.width = rect.width + 'px';
  indicator.style.top = (position === 'top' ? rect.top : rect.bottom) + scrollTop + 'px';
  indicator.style.display = 'block';
  indicator.style.opacity = '1';
}

// Helper function to hide drop indicator
export function hideDropIndicator() {
  const indicator = document.querySelector('.sortable-drop-indicator') as HTMLElement;
  if (indicator) {
    indicator.style.opacity = '0';
    setTimeout(() => {
      indicator.style.display = 'none';
    }, 150);
  }
}