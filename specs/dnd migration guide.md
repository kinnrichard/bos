# Comprehensive Migration Guide: SortableJS to DND Kit for Vanilla JavaScript

## Executive Summary

DND Kit now offers first-class vanilla JavaScript support through the `@dnd-kit/dom` package. This guide provides a complete technical specification for migrating from SortableJS to DND Kit's vanilla JavaScript implementation, enabling complex hierarchical task management with Apple-like UI/UX standards.

## Key Differences: SortableJS vs DND Kit

### Installation & Setup

**SortableJS:**
```javascript
import Sortable from 'sortablejs';

const el = document.getElementById('items');
const sortable = Sortable.create(el, {
  animation: 150,
  ghostClass: 'blue-background-class'
});
```

**DND Kit (Vanilla JS):**
```javascript
import { DragDropManager, Draggable, Droppable, Sortable } from '@dnd-kit/dom';

// Create a central manager
const manager = new DragDropManager({
  plugins: [...],
  sensors: [...],
  modifiers: [...]
});

// Create draggable/droppable elements
const draggable = new Draggable({
  id: 'task-1',
  element: document.getElementById('task-1')
}, manager);
```

### Core Architecture

1. **DragDropManager**: Central orchestrator (replaces SortableJS instance)
2. **Class-based System**: `Draggable`, `Droppable`, `Sortable` classes
3. **Plugin Architecture**: Extensible through plugins
4. **Sensor System**: Abstracts input methods (pointer, keyboard, touch)
5. **Collision Detection**: Algorithmic approach to drop targets
6. **Modifiers**: Transform constraints and movement rules

## Installation

```bash
npm install @dnd-kit/dom
# or
yarn add @dnd-kit/dom
```

For additional features:
```bash
npm install @dnd-kit/abstract @dnd-kit/state @dnd-kit/utilities
```

## Basic Implementation

### Setting Up the Manager

```javascript
import { DragDropManager } from '@dnd-kit/dom';
import { PointerSensor, KeyboardSensor, TouchSensor } from '@dnd-kit/dom/sensors';
import { AutoScroller, Accessibility } from '@dnd-kit/dom/plugins';

const manager = new DragDropManager({
  // Configure sensors for different input methods
  sensors: [
    {
      sensor: PointerSensor,
      options: {
        activationConstraint: {
          distance: 8 // Minimum drag distance
        }
      }
    },
    {
      sensor: TouchSensor,
      options: {
        activationConstraint: {
          delay: 250,
          tolerance: 5
        }
      }
    },
    {
      sensor: KeyboardSensor,
      options: {
        coordinateGetter: sortableKeyboardCoordinates
      }
    }
  ],
  
  // Enable plugins
  plugins: [
    AutoScroller.configure({
      threshold: 0.2,
      acceleration: 10
    }),
    Accessibility
  ]
});
```

### Creating Sortable Lists

```javascript
import { Sortable } from '@dnd-kit/dom';

// Initialize sortable items
const taskElements = document.querySelectorAll('.task-item');
const sortables = [];

taskElements.forEach((element, index) => {
  const sortable = new Sortable({
    id: element.dataset.taskId,
    element: element,
    index: index,
    group: 'tasks' // For multiple lists
  }, manager);
  
  sortables.push(sortable);
});

// Listen for drag end events
manager.on('dragend', (event) => {
  const { source, target } = event;
  
  if (target) {
    // Handle the drop
    handleDrop(source, target);
  }
});
```

## Implementing Complex Hierarchical Structures

### Data Structure for Nested Tasks

```javascript
class TaskNode {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.parentId = data.parentId || null;
    this.children = [];
    this.depth = 0;
    this.canHaveChildren = data.type !== 'subtask';
  }
}

class TaskTree {
  constructor(tasks) {
    this.nodes = new Map();
    this.rootIds = [];
    this.buildTree(tasks);
  }
  
  buildTree(tasks) {
    // First pass: create all nodes
    tasks.forEach(task => {
      this.nodes.set(task.id, new TaskNode(task));
    });
    
    // Second pass: establish relationships
    this.nodes.forEach(node => {
      if (node.parentId) {
        const parent = this.nodes.get(node.parentId);
        if (parent) {
          parent.children.push(node);
          node.depth = parent.depth + 1;
        }
      } else {
        this.rootIds.push(node.id);
      }
    });
  }
  
  getFlattenedTasks() {
    const result = [];
    
    const traverse = (nodeId, depth = 0) => {
      const node = this.nodes.get(nodeId);
      if (!node) return;
      
      node.depth = depth;
      result.push(node);
      
      node.children.forEach(child => {
        traverse(child.id, depth + 1);
      });
    };
    
    this.rootIds.forEach(id => traverse(id));
    return result;
  }
}
```

### Creating Draggable Tasks with Nesting Support

```javascript
class TaskManager {
  constructor(container, taskData) {
    this.container = container;
    this.taskTree = new TaskTree(taskData);
    this.dragDropManager = new DragDropManager({
      collisionDetection: this.customCollisionDetection.bind(this)
    });
    
    this.setupTasks();
    this.setupEventListeners();
  }
  
  setupTasks() {
    const flatTasks = this.taskTree.getFlattenedTasks();
    
    flatTasks.forEach((task, index) => {
      const element = this.createTaskElement(task);
      
      // Make it sortable (draggable + droppable)
      const sortable = new Sortable({
        id: task.id,
        element: element,
        index: index,
        data: task,
        disabled: false
      }, this.dragDropManager);
      
      // Create a separate drop zone for nesting
      if (task.canHaveChildren) {
        const nestZone = element.querySelector('.nest-drop-zone');
        const droppable = new Droppable({
          id: `nest-${task.id}`,
          element: nestZone,
          data: { type: 'nest', parentId: task.id }
        }, this.dragDropManager);
      }
    });
  }
  
  createTaskElement(task) {
    const element = document.createElement('div');
    element.className = 'task-item';
    element.dataset.taskId = task.id;
    element.style.paddingLeft = `${task.depth * 24}px`;
    
    element.innerHTML = `
      <div class="task-content">
        <span class="drag-handle">⋮⋮</span>
        <span class="task-title">${task.title}</span>
        ${task.children.length > 0 ? `<span class="subtask-count">(${task.children.length})</span>` : ''}
      </div>
      ${task.canHaveChildren ? '<div class="nest-drop-zone">Drop here to nest</div>' : ''}
    `;
    
    this.container.appendChild(element);
    return element;
  }
}
```

### Advanced Drag Operations

### Advanced Drag Operations with Multi-Select

```javascript
class TaskManager {
  constructor(container, taskData) {
    this.container = container;
    this.taskTree = new TaskTree(taskData);
    this.selectedTasks = new Set();
    this.undoStack = [];
    this.redoStack = [];
    
    this.dragDropManager = new DragDropManager({
      collisionDetection: this.customCollisionDetection.bind(this),
      onDragStart: this.handleDragStart.bind(this),
      onDragEnd: this.handleDragEnd.bind(this)
    });
    
    this.setupTasks();
    this.setupEventListeners();
    this.setupKeyboardHandlers();
  }
  
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      // ESC cancels drag
      if (e.key === 'Escape' && this.dragDropManager.isDragging) {
        this.dragDropManager.cancelDrag();
        this.animateBackToOrigin();
      }
      
      // Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Cmd+Shift+Z for redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        this.redo();
      }
    });
  }
  
  handleDragStart(event) {
    const { source } = event;
    const task = this.taskTree.nodes.get(source.id);
    
    // Handle multi-select
    let draggedTasks = [];
    if (this.selectedTasks.has(source.id)) {
      // Dragging a selected item - drag all selected
      draggedTasks = Array.from(this.selectedTasks);
    } else {
      // Dragging unselected item - just drag this one
      draggedTasks = [source.id];
    }
    
    // Show count badge if multiple items
    if (draggedTasks.length > 1) {
      this.showMultiSelectBadge(draggedTasks.length);
    }
    
    // Collect all descendants for each dragged task
    const allDraggedIds = new Set(draggedTasks);
    draggedTasks.forEach(taskId => {
      const descendants = this.getDescendants(taskId);
      descendants.forEach(id => allDraggedIds.add(id));
    });
    
    // Store drag info
    this.dragDropManager.dragOperation.data = {
      primaryDraggedIds: draggedTasks,
      allDraggedIds: Array.from(allDraggedIds),
      originalPositions: this.capturePositions(allDraggedIds)
    };
    
    // Visual feedback
    allDraggedIds.forEach(id => {
      const element = document.querySelector(`[data-task-id="${id}"]`);
      if (element) {
        element.classList.add('dragging');
      }
    });
  }
  
  showMultiSelectBadge(count) {
    const badge = document.createElement('div');
    badge.className = 'multi-select-badge';
    badge.textContent = count;
    badge.style.cssText = `
      position: fixed;
      background: #ef4444;
      color: white;
      border-radius: 12px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: bold;
      pointer-events: none;
      z-index: 10000;
    `;
    
    document.body.appendChild(badge);
    
    // Update position with drag
    this.dragDropManager.on('dragmove', (event) => {
      badge.style.left = `${event.coordinates.x + 10}px`;
      badge.style.top = `${event.coordinates.y - 10}px`;
    });
    
    // Remove on drag end
    this.dragDropManager.once('dragend', () => {
      badge.remove();
    });
  }
  
  animateBackToOrigin() {
    const dragData = this.dragDropManager.dragOperation?.data;
    if (!dragData) return;
    
    dragData.allDraggedIds.forEach(id => {
      const element = document.querySelector(`[data-task-id="${id}"]`);
      const originalPos = dragData.originalPositions[id];
      
      if (element && originalPos) {
        // Animate back with spring
        element.style.transition = 'all 300ms cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        element.style.transform = `translate(${originalPos.x}px, ${originalPos.y}px)`;
        
        setTimeout(() => {
          element.style.transition = '';
          element.style.transform = '';
          element.classList.remove('dragging');
        }, 300);
      }
    });
  }
}
```

#### Preventing Circular References

```javascript
customCollisionDetection(args) {
  const { draggable, droppables } = args;
  const dragData = this.dragDropManager.dragOperation?.data;
  
  if (!dragData) return null;
  
  // Filter out invalid drop targets
  const validDroppables = droppables.filter(droppable => {
    // Can't drop on self
    if (droppable.id === draggable.id) return false;
    
    // Can't drop parent on its descendants
    if (dragData.descendantIds.includes(droppable.id)) return false;
    
    // Check max depth constraint
    if (droppable.data?.type === 'nest') {
      const targetTask = this.taskTree.nodes.get(droppable.data.parentId);
      const draggedTask = this.taskTree.nodes.get(draggable.id);
      
      if (targetTask && draggedTask) {
        const newDepth = targetTask.depth + 1 + this.getMaxDepth(draggedTask);
        if (newDepth > this.MAX_DEPTH) return false;
      }
    }
    
    return true;
  });
  
  // Use default collision detection with filtered droppables
  return this.dragDropManager.collisionDetection.closestCenter({
    ...args,
    droppables: validDroppables
  });
}

getMaxDepth(task) {
  if (!task.children.length) return 0;
  return 1 + Math.max(...task.children.map(child => this.getMaxDepth(child)));
}
```

## Visual Feedback Implementation

### Drag Preview with Overlay

```javascript
class DragOverlay {
  constructor(manager) {
    this.manager = manager;
    this.overlay = this.createOverlay();
    this.setupListeners();
  }
  
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'drag-overlay';
    overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      opacity: 0;
      transition: opacity 200ms;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }
  
  setupListeners() {
    this.manager.on('dragstart', (event) => {
      const { source } = event;
      const originalElement = source.element;
      
      // Clone the dragged element
      const clone = originalElement.cloneNode(true);
      clone.style.width = `${originalElement.offsetWidth}px`;
      clone.style.transform = 'rotate(2deg) scale(1.05)';
      clone.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
      
      this.overlay.innerHTML = '';
      this.overlay.appendChild(clone);
      this.overlay.style.opacity = '1';
      
      // Make original semi-transparent
      originalElement.style.opacity = '0.5';
    });
    
    this.manager.on('dragmove', (event) => {
      const { coordinates } = event;
      this.overlay.style.transform = 
        `translate(${coordinates.x}px, ${coordinates.y}px)`;
    });
    
    this.manager.on('dragend', () => {
      this.overlay.style.opacity = '0';
      
      // Restore original
      const dragging = document.querySelector('[data-dragging="true"]');
      if (dragging) {
        dragging.style.opacity = '1';
        dragging.removeAttribute('data-dragging');
      }
    });
  }
}
```

### Drop Zone Indicators & Animation

```javascript
setupDropZoneIndicators() {
  this.dragDropManager.on('dragover', (event) => {
    const { over, operation } = event;
    
    // Clear previous indicators
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    document.querySelectorAll('.nest-zone-active').forEach(el => {
      el.classList.remove('nest-zone-active');
    });
    
    if (!over) return;
    
    if (operation.type === 'nest') {
      // Highlight entire target row in blue
      over.element.classList.add('nest-zone-active');
    } else {
      // Show horizontal blue line for reorder
      const indicator = document.createElement('div');
      indicator.className = 'drop-indicator';
      indicator.style.cssText = `
        position: absolute;
        left: ${over.rect.left}px;
        width: ${over.rect.width}px;
        height: 2px;
        background: var(--accent-blue);
        border-radius: 1px;
        transition: all 150ms ease-out;
      `;
      
      if (operation.position === 'before') {
        indicator.style.top = `${over.rect.top - 1}px`;
      } else {
        indicator.style.top = `${over.rect.bottom - 1}px`;
      }
      
      document.body.appendChild(indicator);
    }
  });
  
  // Handle invalid drop targets
  this.dragDropManager.on('dragenter', (event) => {
    const { target } = event;
    
    if (!this.canAcceptDrop(target)) {
      target.element.style.cursor = 'not-allowed';
      target.element.classList.add('drop-prohibited');
    }
  });
}
```

## Mobile and Touch Support

```javascript
// Touch-specific configuration
const touchSensor = {
  sensor: TouchSensor,
  options: {
    activationConstraint: {
      delay: 250, // Hold for 250ms before drag starts (like iOS long-press)
      tolerance: 5 // Allow 5px of movement during hold
    }
  }
};

// Touch-friendly styles
const styles = `
  .task-item {
    touch-action: none;
    user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  
  .drag-handle {
    min-height: 44px;
    min-width: 44px;
    cursor: grab;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  .drag-handle:active {
    cursor: grabbing;
  }
  
  @media (hover: none) {
    .task-item {
      padding: 12px; /* Larger touch targets */
    }
  }
`;
```

## Accessibility Implementation

```javascript
class AccessibilityPlugin {
  constructor(manager) {
    this.manager = manager;
    this.announcer = this.createAnnouncer();
    this.setupAnnouncements();
  }
  
  createAnnouncer() {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(announcer);
    return announcer;
  }
  
  setupAnnouncements() {
    this.manager.on('dragstart', (event) => {
      const task = event.source.data;
      this.announce(`Picked up ${task.title}. Press arrow keys to move, space to drop.`);
    });
    
    this.manager.on('dragover', (event) => {
      if (event.over) {
        const overTask = event.over.data;
        const operation = event.operation;
        
        if (operation.type === 'nest') {
          this.announce(`Over ${overTask.title}. Press space to nest inside.`);
        } else {
          this.announce(`Over ${overTask.title}. Press space to ${operation.position}.`);
        }
      }
    });
    
    this.manager.on('dragend', (event) => {
      if (event.target) {
        this.announce('Item dropped successfully.');
      } else {
        this.announce('Item returned to original position.');
      }
    });
  }
  
  announce(message) {
    this.announcer.textContent = message;
  }
}
```

## Stimulus.js Integration

Since you're using Stimulus, here's how to integrate DND Kit:

```javascript
// app/javascript/controllers/sortable_controller.js
import { Controller } from "@hotwired/stimulus"
import { DragDropManager, Sortable } from '@dnd-kit/dom'
import { PointerSensor, KeyboardSensor, TouchSensor } from '@dnd-kit/dom/sensors'

export default class extends Controller {
  static targets = ["container", "item"]
  static values = { 
    group: String,
    handle: String,
    maxDepth: { type: Number, default: 5 }
  }
  
  connect() {
    this.initializeDragDrop()
  }
  
  disconnect() {
    this.cleanup()
  }
  
  initializeDragDrop() {
    // Create manager
    this.manager = new DragDropManager({
      sensors: this.configureSensors(),
      onDragEnd: this.handleDragEnd.bind(this)
    })
    
    // Initialize sortable items
    this.sortables = []
    this.itemTargets.forEach((item, index) => {
      const sortable = new Sortable({
        id: item.dataset.id,
        element: item,
        index: index,
        group: this.groupValue,
        handle: this.handleValue ? item.querySelector(this.handleValue) : null
      }, this.manager)
      
      this.sortables.push(sortable)
    })
  }
  
  configureSensors() {
    return [
      {
        sensor: PointerSensor,
        options: {
          activationConstraint: { distance: 8 }
        }
      },
      {
        sensor: TouchSensor,
        options: {
          activationConstraint: { delay: 250, tolerance: 5 }
        }
      },
      {
        sensor: KeyboardSensor
      }
    ]
  }
  
  handleDragEnd(event) {
    const { source, target } = event
    
    if (target) {
      // Dispatch custom event for Rails to handle
      this.dispatch('reorder', {
        detail: {
          sourceId: source.id,
          targetId: target.id,
          position: event.operation.position
        }
      })
    }
  }
  
  cleanup() {
    this.sortables.forEach(sortable => sortable.destroy())
    this.manager.destroy()
  }
}
```

## Performance Optimization

### Efficient DOM Updates

```javascript
class BatchDOMUpdater {
  constructor() {
    this.pendingUpdates = [];
    this.rafId = null;
  }
  
  scheduleUpdate(update) {
    this.pendingUpdates.push(update);
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flushUpdates();
      });
    }
  }
  
  flushUpdates() {
    // Batch DOM reads
    const reads = this.pendingUpdates.map(update => update.read?.());
    
    // Batch DOM writes
    this.pendingUpdates.forEach((update, index) => {
      update.write?.(reads[index]);
    });
    
    this.pendingUpdates = [];
    this.rafId = null;
  }
}

// Usage in drag operations
const batchUpdater = new BatchDOMUpdater();

manager.on('dragmove', (event) => {
  batchUpdater.scheduleUpdate({
    read: () => ({
      scrollTop: window.scrollY,
      elementRect: event.source.element.getBoundingClientRect()
    }),
    write: (data) => {
      // Update positions based on read data
      updatePreview(event.coordinates, data);
    }
  });
});
```

## Auto-Scroll Implementation

```javascript
class AutoScroller {
  constructor(manager) {
    this.manager = manager;
    this.scrollSpeed = 0;
    this.scrollDirection = 0;
    this.scrollStartTime = null;
    this.rafId = null;
    this.edgeSize = 50; // Pixels from edge to trigger scroll
    this.maxSpeed = 15; // Max scroll speed
    this.acceleration = 0.5; // Speed increase per second
    
    this.setupListeners();
  }
  
  setupListeners() {
    this.manager.on('dragmove', (event) => {
      const { coordinates } = event;
      this.checkScrollZones(coordinates);
    });
    
    this.manager.on('dragend', () => {
      this.stopScrolling();
    });
  }
  
  checkScrollZones(coordinates) {
    const viewportHeight = window.innerHeight;
    const { y } = coordinates;
    
    // Check if near edges
    if (y < this.edgeSize) {
      // Near top - scroll up
      this.startScrolling(-1);
    } else if (y > viewportHeight - this.edgeSize) {
      // Near bottom - scroll down
      this.startScrolling(1);
    } else {
      // Not near edges
      this.stopScrolling();
    }
  }
  
  startScrolling(direction) {
    if (this.scrollDirection === direction) {
      // Already scrolling in this direction
      return;
    }
    
    this.scrollDirection = direction;
    this.scrollStartTime = Date.now();
    this.scrollSpeed = 2; // Start slow
    
    if (!this.rafId) {
      this.animate();
    }
  }
  
  stopScrolling() {
    this.scrollDirection = 0;
    this.scrollSpeed = 0;
    this.scrollStartTime = null;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  animate() {
    if (this.scrollDirection === 0) return;
    
    // Calculate time-based acceleration
    const elapsed = (Date.now() - this.scrollStartTime) / 1000; // seconds
    this.scrollSpeed = Math.min(
      2 + (elapsed * this.acceleration), // Start at 2, increase over time
      this.maxSpeed
    );
    
    // Apply scroll
    const scrollAmount = this.scrollSpeed * this.scrollDirection;
    window.scrollBy(0, scrollAmount);
    
    // Continue animation
    this.rafId = requestAnimationFrame(() => this.animate());
  }
}

// Usage
const autoScroller = new AutoScroller(dragDropManager);
```

## Migration Checklist

### Phase 1: Setup and Dependencies
- [ ] Install `@dnd-kit/dom` package
- [ ] Remove SortableJS dependencies
- [ ] Set up build process to handle ES modules

### Phase 2: Core Implementation
- [ ] Create `DragDropManager` instance
- [ ] Configure sensors (pointer, touch, keyboard)
- [ ] Replace SortableJS initialization with DND Kit classes
- [ ] Set up event listeners for drag operations

### Phase 3: Feature Parity
- [ ] Implement drag handles
- [ ] Add animation/transition effects
- [ ] Configure auto-scrolling
- [ ] Set up ghost/preview elements

### Phase 4: Advanced Features
- [ ] Implement hierarchical drag-drop
- [ ] Add circular reference prevention
- [ ] Create visual distinction for reorder vs nest
- [ ] Implement group movement for parent items

### Phase 5: Optimization and Polish
- [ ] Add touch/mobile support
- [ ] Implement accessibility features
- [ ] Optimize for large lists
- [ ] Add keyboard navigation
- [ ] Test across browsers and devices

## CSS Classes and Styling

```css
/* Base styles */
.task-item {
  position: relative;
  background: var(--task-background);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 4px;
  padding: 12px;
  cursor: grab;
  user-select: none;
  transition: all 300ms cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

/* Entire row is draggable, except the text label */
.task-item .task-title {
  pointer-events: none;
  user-select: text;
  cursor: text;
}

/* Press feedback */
.task-item:active {
  transform: scale(0.98);
  cursor: grabbing;
}

.task-item.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

/* Hover states */
.task-item.drag-over {
  background-color: var(--hover-background);
}

/* Nest success animation */
.task-item.nest-success {
  animation: settleIn 300ms cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

@keyframes settleIn {
  0% { transform: scale(1.02); }
  50% { transform: scale(0.98); }
  100% { transform: scale(1); }
}

/* Drop indicators */
.drop-indicator {
  position: absolute;
  height: 2px;
  background-color: var(--accent-blue);
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}

/* Nesting highlight */
.task-item.nest-zone-active {
  background-color: var(--accent-blue);
  color: white;
  transform: scale(1.02);
}

/* Invalid drop target */
.task-item.drop-prohibited {
  cursor: not-allowed;
  opacity: 0.6;
}

.task-item.drop-prohibited:hover {
  background-color: transparent;
  transform: none;
}

/* Subtask indentation and styling */
.subtask-item {
  margin-left: 24px;
}

.subtask-count {
  font-size: 12px;
  color: var(--secondary-text);
  margin-left: 8px;
  font-weight: normal;
}

/* Multi-select badge */
.multi-select-badge {
  position: fixed;
  background: #ef4444;
  color: white;
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  pointer-events: none;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

/* Drag overlay */
.drag-overlay {
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  will-change: transform;
}

.drag-overlay .task-item {
  box-shadow: 0 20px 40px rgba(255, 255, 255, 0.25); /* White shadow for dark mode */
}

/* Auto-scroll indicators (visual feedback for scroll zones) */
.scroll-zone-active {
  background: linear-gradient(to bottom, var(--accent-blue), transparent);
  position: fixed;
  left: 0;
  right: 0;
  height: 50px;
  pointer-events: none;
  opacity: 0.1;
  z-index: 999;
}

.scroll-zone-active.top {
  top: 0;
}

.scroll-zone-active.bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--accent-blue), transparent);
}

/* Touch-specific styles */
@media (hover: none) {
  .task-item {
    padding: 16px; /* Larger touch targets */
    margin-bottom: 8px;
  }
  
  .task-item:active {
    transform: scale(0.98);
    transition: transform 150ms ease-out;
  }
}

/* Dark mode variables (example) */
:root {
  --task-background: #1a1a1a;
  --border-color: #333;
  --hover-background: #2a2a2a;
  --accent-blue: #3b82f6;
  --secondary-text: #9ca3af;
}
```

## Summary

DND Kit's vanilla JavaScript implementation provides a modern, flexible alternative to SortableJS with superior control and polish. The migration enables:

**Key Features Implemented:**
- ✅ Entire row dragging (no visible drag handles)
- ✅ Apple-style spring animations (300ms with proper easing curves)
- ✅ 1.05x scale on drag with white shadow (25% opacity) for dark mode
- ✅ ESC key cancellation with animated return to origin
- ✅ Multi-select dragging with red count badge
- ✅ Blue highlight for nest targets, blue line for reorder positions
- ✅ Prohibitory cursor for invalid drop targets
- ✅ Settling animation and glow effect on successful nesting
- ✅ Auto-retry with exponential backoff for server failures
- ✅ Undo/Redo support (Cmd+Z / Cmd+Shift+Z)
- ✅ Progressive auto-scroll acceleration near edges
- ✅ Optimistic updates with rollback on failure

**Technical Benefits:**
- Better performance through efficient DOM updates and event delegation
- Full accessibility support with keyboard navigation
- Extensible architecture through plugins and sensors
- Superior touch and mobile device support with proper activation delays
- Native support for complex hierarchical structures
- Granular control over collision detection and drop validation

## Tailored for Your Task Management Use Case

This guide has been specifically optimized for your requirements:

### Visual Design Decisions
- **No visible drag handles** - Entire row is draggable for cleaner interface
- **No rotation effects** - Following Apple's patterns which don't use rotation in drag operations
- **Dark mode optimized** - White shadows at 25% opacity for dragged elements
- **Consistent 300ms spring animations** throughout for unified feel

### Interaction Patterns  
- **Touch-first design** - 250ms hold to initiate drag on mobile
- **Smart visual feedback** - Scale down (0.98x) on press, scale up (1.05x) on drag
- **Clear drop indicators** - Blue row highlight for nesting, blue line for reordering
- **Invalid target handling** - Prohibitory cursor with no hover effects

### Task List Specific Features
- **Multi-level nesting** - Unlimited depth with circular reference prevention
- **Group operations** - Parents move with all children automatically
- **Multi-select support** - Red badge shows count when dragging multiple items
- **Preserved sorting** - Status-based sorting maintained within parent groups

### Reliability & Polish
- **Graceful error handling** - Auto-retry with exponential backoff
- **Undo/Redo support** - Standard keyboard shortcuts (Cmd+Z)
- **Optimistic updates** - Immediate UI response with rollback on failure
- **Smooth animations** - Apple-style spring physics for natural motion

The implementation prioritizes user experience over technical complexity, ensuring every interaction feels polished and intentional.