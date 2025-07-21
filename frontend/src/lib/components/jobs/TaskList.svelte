<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { taskFilter, shouldShowTask, taskFilterCapabilities } from '$lib/stores/taskFilter.svelte';
  import { TaskHierarchyManager } from '$lib/services/TaskHierarchyManager';
  import type { HierarchicalTask, RenderedTaskItem, BaseTask } from '$lib/services/TaskHierarchyManager';
  import { taskSelection, taskSelectionActions } from '$lib/stores/taskSelection.svelte';
  import { focusActions } from '$lib/stores/focusManager.svelte';
  import { Task as TaskModel } from '$lib/models/task';
  import { nativeDrag, clearAllVisualFeedback } from '$lib/utils/native-drag-action';
  import type { DragSortEvent, DragMoveEvent } from '$lib/utils/native-drag-action';
  import { calculateRelativePositionFromTarget } from '$lib/utils/position-calculator';
  import { ClientActsAsList as RailsClientActsAsList } from '$lib/utils/client-acts-as-list';
  import type { Task, DropZoneInfo, PositionUpdate, RelativePositionUpdate } from '$lib/utils/position-calculator';
  import TaskRow from '../tasks/TaskRow.svelte';
  import NewTaskRow from '../tasks/NewTaskRow.svelte';
  import DeletionModal from '../ui/DeletionModal.svelte';
  
  // Import new DRY utilities
  import { createTaskInputManager } from '$lib/utils/task-input-manager';
  import { debugWorkflow, debugComponent } from '$lib/utils/debug';
  import { KeyboardHandler } from '$lib/utils/keyboard-handler';
  import { taskCreationManager } from '$lib/stores/taskCreation.svelte';

  // ✨ SVELTE 5 RUNES
  let { tasks = [], jobId = 'test', batchTaskDetails = null }: {
    tasks?: Array<Task>;
    jobId?: string;
    batchTaskDetails?: any;
  } = $props();
  
  // Task hierarchy management
  const hierarchyManager = new TaskHierarchyManager();
  
  // Derived state for UI capabilities
  const canCreateTasks = $derived(taskFilterCapabilities.canCreateTasks);
  
  // Drag & drop state
  let isDragging = false;
  let dragFeedback = $state('');
  
    
  // Outside click and keyboard handling for task deselection
  let taskListContainer: HTMLElement;

  function handleOutsideClick(event: MouseEvent) {
    // Don't deselect if:
    // - No tasks are selected
    // - Modifier keys are held (for multi-select)
    // - Clicking within task elements
    if (!taskSelection.selectedTaskIds.size ||
        event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    // Check if click target is outside the task list or within non-task areas
    const target = event.target as Element;
    const isClickOutsideTaskList = !taskListContainer?.contains(target);
    const isClickOnTaskElement = target.closest('.task-item');
    const isClickOnTaskAction = target.closest('.task-actions, .status-emoji, .disclosure-button');

    // Deselect if clicking outside task list, or inside task list but not on actual tasks
    if (isClickOutsideTaskList || (!isClickOnTaskElement && !isClickOnTaskAction)) {
      taskSelectionActions.clearSelection();
    }
  }

  // Scroll selected task into view
  function scrollTaskIntoView(taskId: string) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Arrow key navigation for single task selection (used by keyboard handler)
  function handleArrowNavigation(direction: 'up' | 'down') {
    if (taskSelection.selectedTaskIds.size !== 1) return;
    
    const currentTaskId = Array.from(taskSelection.selectedTaskIds)[0];
    const currentIndex = flatTaskIds.indexOf(currentTaskId);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'up') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : flatTaskIds.length - 1; // Wrap to bottom
    } else {
      nextIndex = currentIndex < flatTaskIds.length - 1 ? currentIndex + 1 : 0; // Wrap to top
    }
    
    const nextTaskId = flatTaskIds[nextIndex];
    taskSelectionActions.selectTask(nextTaskId);
    
    // Scroll new selection into view
    scrollTaskIntoView(nextTaskId);
  }

  onMount(() => {
    // Add event listeners for outside click and keyboard
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', keyboardHandler.handleKeydown);
  });

  // Clean up any lingering visual dragFeedback when component is destroyed
  onDestroy(() => {
    clearAllVisualFeedback();
    // Remove event listeners
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', keyboardHandler.handleKeydown);
    // Cleanup keyboard handler
    keyboardHandler.cleanup();
  });
  
  // Rails-compatible client-side acts_as_list implementation
  // TODO: This needs to be re-engineered completely for our offline-first experience.
  //       Zero.js custom mutator required with new server-side logic. Decimal positioning
  class ClientActsAsList {
    // Apply position updates using validated Rails-compatible logic
    static applyPositionUpdates(tasks: any[], positionUpdates: Array<{id: string, position: number, parent_id?: string}>): any[] {
      // Convert to Rails task format
      const railsTasks: Task[] = tasks.map(t => ({
        id: t.id,
        position: t.position || 0,
        parent_id: t.parent_id || null
      }));
      
      // Convert position updates to Rails format
      const railsUpdates: PositionUpdate[] = positionUpdates.map(update => ({
        id: update.id,
        position: update.position,
        parent_id: update.parent_id !== undefined ? (update.parent_id || null) : undefined
      }));
      
      // Use the validated Rails-compatible logic
      const result = RailsClientActsAsList.applyPositionUpdates(railsTasks, railsUpdates);
      
      // Convert back to Svelte task format
      return result.updatedTasks.map(railsTask => {
        const originalTask = tasks.find(t => t.id === railsTask.id);
        return {
          ...originalTask,
          position: railsTask.position,
          parent_id: railsTask.parent_id
        };
      });
    }
    
    // Predict what server positions will be after operation
    static predictServerPositions(tasks: any[], positionUpdates: Array<{id: string, position: number, parent_id?: string}>): Map<string, number> {
      const updatedTasks = this.applyPositionUpdates(tasks, positionUpdates);
      return new Map(updatedTasks.map(t => [t.id, t.position]));
    }
  }
  
  // Initialize task creation states safely before using in derived contexts
  taskCreationManager.ensureState('bottom');
  taskCreationManager.ensureState('inline');
  
  // Unified task creation state - now safe to use in $derived()
  const bottomTaskState = $derived(taskCreationManager.getState('bottom'));
  const inlineTaskState = $derived(taskCreationManager.getState('inline'));
  
  // Task title editing state
  let editingTaskId = $state<string | null>(null);
  
  // Inline new task state (for Return key with selection)
  let insertNewTaskAfter = $state<string | null>(null);

  // Task deletion state
  let isShowingDeleteConfirmation = $state(false);
  let tasksToDelete = $state<string[]>([]);
  let isDeletingTasks = $state(false);
  
  // Computed deletion title for the modal
  const deletionTitle = $derived(() => {
    if (tasksToDelete.length === 1) {
      const taskToDelete = tasks.find(t => t.id === tasksToDelete[0]);
      const taskName = taskToDelete ? `"${taskToDelete.title}"` : '"this task"';
      return `Are you sure you want to delete the task ${taskName}?`;
    } else {
      return `Are you sure you want to delete ${tasksToDelete.length} tasks?`;
    }
  });
  let deletingTaskIds = $state(new Set<string>());
  const animationDuration = 300; // ms for height collapse animation
  
  // ✨ DRY Input Managers with unified state
  const newTaskManager = createTaskInputManager(
    {
      title: { get: () => bottomTaskState.title, set: (v) => taskCreationManager.setTitle('bottom', v) },
      inputElement: { get: () => undefined }, // DOM handled locally in component
      isCreating: { get: () => false, set: (v) => {} }, // No loading state needed
      isShowing: { get: () => bottomTaskState.isShowing, set: (v) => v ? taskCreationManager.show('bottom') : taskCreationManager.hide('bottom') }
    },
    {
      create: (shouldSelect) => createTask('bottom', shouldSelect),
      cancel: () => taskCreationManager.hide('bottom')
    }
  );
  
  const inlineTaskManager = createTaskInputManager(
    {
      title: { get: () => inlineTaskState.title, set: (v) => taskCreationManager.setTitle('inline', v) },
      inputElement: { get: () => undefined }, // DOM handled locally in component
      isCreating: { get: () => false, set: (v) => {} }, // No loading state needed
      isShowing: { get: () => inlineTaskState.isShowing, set: (v) => v ? taskCreationManager.show('inline') : taskCreationManager.hide('inline') }
    },
    {
      create: (shouldSelect) => createTask('inline', shouldSelect),
      cancel: () => taskCreationManager.hide('inline')
    }
  );

  // Use pure reactive filtering with TaskHierarchyManager
  const hierarchicalTasks = $derived(hierarchyManager.organizeTasksHierarchicallyWithFilter(
    tasks as BaseTask[], 
    shouldShowTask
  ));

  
  // Auto-expand ALL tasks that have subtasks by default (only once on initial load)
  $effect(() => {
    hierarchyManager.autoExpandAll(hierarchicalTasks);
  });
  
  // Make rendering reactive to expansion state changes
  const flattenedTasks = $derived.by(() => {
    return hierarchyManager.flattenTasks(hierarchicalTasks);
  });
  
  // Update flat task IDs for multi-select functionality
  const flatTaskIds = $derived(hierarchyManager.getFlatTaskIds(flattenedTasks));

  // Keyboard navigation handler
  const keyboardHandler = KeyboardHandler({
    items: () => flatTaskIds,
    selection: () => taskSelection.selectedTaskIds,
    isEditing: () => editingTaskId !== null || inlineTaskState.isShowing,
    
    actions: {
      navigate: handleArrowNavigation,
      select: (id) => taskSelectionActions.selectTask(id),
      clearSelection: () => taskSelectionActions.clearSelection(),
      createInline: (afterId) => {
        if (!canCreateTasks) return; // Elegant guard clause
        insertNewTaskAfter = afterId;
        taskCreationManager.show('inline');
        taskSelectionActions.clearSelection();
        
        // Focus is now handled automatically by the NewTaskRow component
        // No need to manage DOM references here
      },
      createBottom: () => {
        if (!canCreateTasks) return; // Elegant guard clause
        newTaskManager.show();
      },
      deleteSelected: () => showDeleteConfirmation(),
      cancelEditing: () => {
        if (inlineTaskState.isShowing) {
          cancelInlineNewTask();
        } else if (taskSelection.selectedTaskIds.size > 0) {
          taskSelectionActions.clearSelection();
        }
      },
      scrollToItem: scrollTaskIntoView,
      onItemActivate: (taskId, event) => {
        const mockEvent = {
          stopPropagation: () => {},
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey
        } as MouseEvent;
        
        handleTaskClick(mockEvent, taskId);
      }
    },
    
    behavior: {
      wrapNavigation: true,
      preventDefault: ['ArrowUp', 'ArrowDown']
    }
  });

  // Reference to the tasks container element for drag action updates
  let tasksContainer: HTMLElement;
  let dragActionInstance: any;

  // Store action instance for manual updates
  function storeDragAction(node: HTMLElement, options: any) {
    dragActionInstance = nativeDrag(node, options);
    return dragActionInstance;
  }

  // Trigger drag action update when flattened tasks change (to handle new grandchildren)
  $effect(() => {
    if (dragActionInstance && flattenedTasks) {
      // Wait for DOM to update before setting draggable attributes
      tick().then(() => {
        dragActionInstance.update({
          onStart: handleSortStart,
          onEnd: handleSortEnd,
          onSort: handleTaskReorder,
          onMove: handleMoveDetection
        });
      });
    }
  });

  function toggleTaskExpansion(taskId: string) {
    hierarchyManager.toggleExpansion(taskId);
  }

  function isTaskExpanded(taskId: string): boolean {
    return hierarchyManager.isTaskExpanded(taskId);
  }

  function getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'new_task': 'New',
      'in_progress': 'In Progress',
      'paused': 'Paused',
      'successfully_completed': 'Completed',
      'cancelled': 'Cancelled',
      'failed': 'Failed'
    };
    return labelMap[status] || status.replace('_', ' ');
  }

  function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  // Time tracking utilities
  // Update time tracking display every second for in-progress tasks
  // TODO: This is broken and may need to be re-imagined. It shoud only show on the task-info popover.
  
  let timeTrackingInterval: any;
  let currentTime = $state(Date.now());

  onMount(() => {
    timeTrackingInterval = setInterval(() => {
      currentTime = Date.now();
    }, 1000);
  });

  onDestroy(() => {
    if (timeTrackingInterval) {
      clearInterval(timeTrackingInterval);
    }
  });

  // Flag to prevent double-save when clicking another task
  let isManualSave = false;

  // Auto-save current edit before changing selection
  async function autoSaveCurrentEdit() {
    const currentEditingTaskId = focusActions.getCurrentEditingTaskId();
    if (!currentEditingTaskId) return;
    
    // Set transition state to prevent race conditions
    focusActions.setTransitioning(true);
    
    // Set flag to prevent blur handler from also saving
    isManualSave = true;
    
    // Get the current editing element from focus manager
    const titleElement = focusActions.getCurrentEditingElement();
    if (titleElement) {
      const currentTitle = titleElement.textContent || '';
      const originalTitle = tasks.find(t => t.id === currentEditingTaskId)?.title || '';
      
      // Only save if content has changed and is not empty
      if (currentTitle.trim() !== '' && currentTitle.trim() !== originalTitle) {
        await saveTitle(currentEditingTaskId, currentTitle);
      } else if (currentTitle.trim() === '') {
        // If empty, just cancel the edit
        cancelEdit();
      } else {
        // No change, just exit edit mode
        cancelEdit();
      }
    }
    
    // Clear focus through centralized manager
    focusActions.clearFocus();
    
    // Reset flags after a short delay
    setTimeout(() => {
      isManualSave = false;
      focusActions.setTransitioning(false);
    }, 50);
  }

  // Multi-select click handler
  async function handleTaskClick(event: MouseEvent, taskId: string) {
    event.stopPropagation();
    
    // Check if this is a click on the title of the currently editing task
    const currentEditingId = focusActions.getCurrentEditingTaskId();
    const isClickOnEditingTitle = currentEditingId === taskId && 
      (event.target as HTMLElement).closest('.editable-title');
    
    // Auto-save any existing edit before changing selection, UNLESS
    // we're clicking on the title of the task that's currently being edited
    if (currentEditingId !== null && !isClickOnEditingTitle) {
      await autoSaveCurrentEdit();
    }
    
    if (event.shiftKey) {
      taskSelectionActions.handleRangeSelect(taskId, flatTaskIds);
    } else if (event.ctrlKey || event.metaKey) {
      taskSelectionActions.toggleTask(taskId);
    } else {
      taskSelectionActions.selectTask(taskId);
    }
  }

  // Consolidated event handler for TaskRow components
  function handleTaskAction(event: CustomEvent) {
    const { type, taskId, data } = event.detail;
    
    switch (type) {
      case 'click':
        handleTaskClick(data.event, taskId);
        break;
      case 'keydown':
        keyboardHandler.handleItemKeydown(data.event, taskId);
        break;
      case 'statusChange':
        handleStatusChange(taskId, data.newStatus);
        break;
      case 'titleClick':
        handleTitleClick(data.event, taskId);
        break;
      case 'toggleExpansion':
        toggleTaskExpansion(taskId);
        break;
      case 'startEdit':
        editingTaskId = taskId;
        // Title editing now handled by contenteditable element
        // Focus will be handled by TaskRow component
        tick().then(() => {
          const titleInput = document.querySelector(`[data-task-id="${taskId}"] .task-title-input`) as HTMLInputElement;
          if (titleInput) {
            titleInput.focus();
            titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
          }
        });
        break;
      case 'saveEdit':
        // Only save if not already saved manually by autoSaveCurrentEdit
        if (!isManualSave) {
          saveTitle(taskId, data.newTitle);
        }
        break;
      case 'cancelEdit':
        cancelEdit();
        break;
      case 'taskUpdated':
        handleTaskUpdated(event);
        break;
      default:
        debugComponent.warn('Unknown task action type', { type, event });
    }
  }

  // Unified task creation function
  async function createTask(type: 'bottom' | 'inline', shouldSelectAfterCreate: boolean = false) {
    const state = taskCreationManager.getState(type);
    if (!state.title.trim()) return;
    
    const title = state.title.trim();
    let position = tasks.length + 1;
    let parentId: string | undefined;
    
    // Calculate position and parent for inline tasks
    if (type === 'inline' && insertNewTaskAfter) {
      const afterTask = tasks.find(t => t.id === insertNewTaskAfter);
      if (afterTask) {
        parentId = afterTask.parent_id || undefined;
        
        // Get tasks in the same scope (sibling tasks with same parent)
        const scopeTasks = tasks.filter(t => (t.parent_id || null) === (parentId || null))
                                 .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        
        // Find position after the target task
        const afterIndex = scopeTasks.findIndex(t => t.id === insertNewTaskAfter);
        if (afterIndex !== -1) {
          position = (afterTask.position ?? 0) + 1;
        }
      }
    }
    
    try {
      const newTask = await TaskModel.create({
        title,
        job_id: jobId,
        status: 'new_task',
        position,
        parent_id: parentId,
        lock_version: 0,
        applies_to_all_targets: false
      });
      
      // Add the new task to our local tasks array
      if (type === 'inline' && insertNewTaskAfter) {
        // Insert new task at correct position based on visual hierarchy
        const visualIndex = flatTaskIds.indexOf(insertNewTaskAfter);
        if (visualIndex !== -1 && visualIndex < flatTaskIds.length - 1) {
          const nextTaskId = flatTaskIds[visualIndex + 1];
          const nextTaskIndex = tasks.findIndex(t => t.id === nextTaskId);
          
          if (nextTaskIndex !== -1) {
            tasks = [
              ...tasks.slice(0, nextTaskIndex),
              newTask,
              ...tasks.slice(nextTaskIndex)
            ];
          } else {
            tasks = [...tasks, newTask];
          }
        } else {
          tasks = [...tasks, newTask];
        }
        
        // Update insertNewTaskAfter to point to the newly created task
        insertNewTaskAfter = newTask.id;
      } else {
        tasks = [...tasks, newTask];
      }
      
      // Select the newly created task only if requested (Return key, not blur)
      if (shouldSelectAfterCreate) {
        taskSelectionActions.selectTask(newTask.id);
      }
      
      // Clear the form
      taskCreationManager.hide(type);
      if (type === 'inline') {
        insertNewTaskAfter = null;
      }
      
      dragFeedback = 'Task created successfully!';
      setTimeout(() => dragFeedback = '', 2000);
    } catch (error: any) {
      debugWorkflow.error('Task creation failed', { error, taskData: inputManager.getTaskData() });
      dragFeedback = 'Failed to create task - please try again';
      setTimeout(() => dragFeedback = '', 3000);
    }
  }

  function handleNewTaskRowClick(event: MouseEvent) {
    // Only activate if not already in input mode
    if (!bottomTaskState.isShowing) {
      event.stopPropagation();
      newTaskManager.show();
    }
  }

  function handleTaskUpdated(event: CustomEvent) {
    const updatedTask = event.detail.task;
    
    // Update the task in our tasks array
    const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTask };
      tasks = [...tasks]; // Trigger reactivity
    }
  }

  // Task status change handler using ActiveRecord pattern
  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      // Use ActiveRecord pattern - Zero.js handles optimistic updates and server sync
      const { Task } = await import('$lib/models/task');
      await Task.update(taskId, { status: newStatus });
    } catch (error: any) {
      debugWorkflow.error('Task status update failed', { error, taskId, newStatus });
      
      if (error.code === 'INVALID_CSRF_TOKEN') {
        dragFeedback = 'Session expired - please try again';
      } else {
        dragFeedback = 'Failed to update task status - please try again';
      }
      setTimeout(() => dragFeedback = '', 3000);
    }
  }

  // Task title editing functions - using DRY cursor positioning
  function handleTitleClick(event: MouseEvent, taskId: string) {
    event.stopPropagation(); // Prevent task selection
    taskSelectionActions.clearSelection(); // Clear any existing selection when editing
    
    // Enter edit mode
    editingTaskId = taskId;
    
    // Find the contenteditable element and register with focus manager
    tick().then(() => {
      const titleElement = document.querySelector(`[data-task-id="${taskId}"] .task-title`) as HTMLElement;
      if (titleElement) {
        focusActions.setEditingElement(titleElement, taskId);
      }
    });
  }

  async function saveTitle(taskId: string, newTitle: string) {
    if (newTitle.trim() === '') {
      cancelEdit();
      return;
    }

    try {
      // Find the task data and create an ActiveRecord-style instance
      const taskData = tasks.find(t => t.id === taskId);
      if (!taskData) {
        throw new Error('Task not found');
      }

      const { Task } = await import('$lib/models/task');
      
      await Task.update(taskData.id, { title: newTitle.trim() });
      
      // UI cleanup - Zero.js reactive updates will handle the data changes
      editingTaskId = null;
      
    } catch (error) {
      debugWorkflow.error('Task title update failed', { error, taskId: task.id, newTitle: inputValue });
      dragFeedback = 'Failed to update task title - please try again';
      setTimeout(() => dragFeedback = '', 3000);
      
      // Reverts to original title
    }
  }

  function cancelEdit() {
    // Clear focus through centralized manager
    focusActions.clearFocus();
    editingTaskId = null;
  }


  function cancelInlineNewTask() {
    insertNewTaskAfter = null;
    taskCreationManager.hide('inline');
  }

  // Task deletion functions
  function showDeleteConfirmation() {
    tasksToDelete = Array.from(taskSelection.selectedTaskIds);
    isShowingDeleteConfirmation = true;
  }

  function cancelDeleteConfirmation() {
    isShowingDeleteConfirmation = false;
    tasksToDelete = [];
  }

  async function confirmDeleteTasks() {
    if (tasksToDelete.length === 0 || isDeletingTasks) return;

    // Close modal immediately
    isShowingDeleteConfirmation = false;
    
    isDeletingTasks = true;
    const tasksToDeleteCopy = [...tasksToDelete]; // Copy for async operations
    tasksToDelete = []; // Clear the original array

    try {
      // Clear selection
      taskSelectionActions.clearSelection();

      // Start deletion animation by marking tasks as deleting
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.add(taskId);
      });
      
      // Trigger reactivity
      deletingTaskIds = deletingTaskIds;

      // Delete tasks in parallel while animation is running using ActiveRecord-style API
      const deletePromises = tasksToDeleteCopy.map(async taskId => {
        // Find the task data and create an ActiveRecord-style instance
        const taskData = tasks.find(t => t.id === taskId);
        if (!taskData) {
          throw new Error(`Task with ID ${taskId} not found`);
        }

        const { Task } = await import('$lib/models/task');
        await Task.discard(taskData.id);
        return { id: taskData.id };
      });

      // Wait for both API calls and animation to complete
      const [, ] = await Promise.all([
        Promise.all(deletePromises),
        new Promise(resolve => setTimeout(resolve, animationDuration))
      ]);

      // Clear deletion animation state
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = deletingTaskIds;

      // Show success dragFeedback
      dragFeedback = `Successfully discarded ${deletePromises.length} task${deletePromises.length === 1 ? '' : 's'}`;
      setTimeout(() => dragFeedback = '', 3000);

    } catch (error: any) {
      debugWorkflow.error('Task discard failed', { error, taskCount: deletePromises.length });
      
      // Clear animation state on error
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = deletingTaskIds;
      
      dragFeedback = `Failed to discard tasks: ${error.message || 'Unknown error'}`;
      setTimeout(() => dragFeedback = '', 5000);
    } finally {
      isDeletingTasks = false;
    }
  }

  // Native drag event handlers
  function handleSortStart(event: DragSortEvent) {
    isDragging = true;
    
    // Check for multi-select drag
    const selectedCount = taskSelection.selectedTaskIds.size;
    const draggedTaskId = event.item.dataset.taskId;
    
    if (draggedTaskId && taskSelection.selectedTaskIds.has(draggedTaskId) && selectedCount > 1) {
      // Show multi-drag badge
      const badge = document.createElement('div');
      badge.className = 'multi-drag-badge';
      badge.textContent = `+${selectedCount - 1} more`;
      badge.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        background: #007AFF;
        color: white;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 600;
        z-index: 1001;
      `;
      event.item.appendChild(badge);
    }
  }

  function handleSortEnd(event: DragSortEvent) {
    isDragging = false;
    
    // Clear all visual dragFeedback
    clearAllVisualFeedback();
    
    // Remove multi-drag badge if it exists
    const badge = event.item.querySelector('.multi-drag-badge');
    if (badge) {
      badge.remove();
    }
  }

  // Handle move detection during drag operations
  function handleMoveDetection(event: DragMoveEvent) {
    const { dropZone, related: targetElement } = event;
    
    if (!dropZone || !targetElement) {
      return true;
    }

    // Let native-drag-action handle visual dragFeedback, but validate nesting
    if (dropZone.mode === 'nest' && dropZone.targetTaskId) {
      const draggedElement = event.dragged;
      const draggedTaskId = draggedElement?.getAttribute('data-task-id');
      
      if (draggedTaskId) {
        const validation = isValidNesting(draggedTaskId, dropZone.targetTaskId);
        
        // Return false to prevent invalid nesting
        if (!validation.valid) {
          return false;
        }
      }
    }
    
    return true; // Allow the move
  }

  // Validation functions for nesting
  function isValidNesting(draggedTaskId: string, targetTaskId: string): {valid: boolean, reason?: string} {
    // Rule 1: Can't nest task under itself
    if (draggedTaskId === targetTaskId) {
      return {valid: false, reason: 'Task cannot be nested under itself'};
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask) {
      return {valid: false, reason: 'Task not found'};
    }

    // Rule 2: Can't nest task under its own descendant (circular reference)
    if (isDescendantOf(targetTaskId, draggedTaskId)) {
      return {valid: false, reason: 'Cannot create circular reference - target is a descendant of the dragged task'};
    }

    return {valid: true};
  }

  function isDescendantOf(potentialDescendantId: string, ancestorId: string): boolean {
    const potentialDescendant = tasks.find(t => t.id === potentialDescendantId);
    if (!potentialDescendant || !potentialDescendant.parent_id) {
      return false;
    }

    if (potentialDescendant.parent_id === ancestorId) {
      return true;
    }

    return isDescendantOf(potentialDescendant.parent_id, ancestorId);
  }

  function getTaskDepth(taskId: string): number {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.parent_id) {
      return 0;
    }
    return 1 + getTaskDepth(task.parent_id);
  }

  // Calculate visual order mapping for hierarchical tasks
  function createVisualOrderMap(tasks: Array<{ id: string; parent_id?: string; position?: number }>): Map<string, number> {
    const visualOrderMap = new Map<string, number>();
    let visualIndex = 0;

    // Recursive function to traverse hierarchy and assign visual indices
    function traverseAndIndex(parentId: string | null, depth: number = 0) {
      // Get tasks for this parent, sorted by position
      const childTasks = tasks
        .filter(t => (t.parent_id || null) === parentId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      // Assign visual index to each task and recurse into children
      childTasks.forEach(task => {
        visualOrderMap.set(task.id, visualIndex++);
        // Recursively process children
        traverseAndIndex(task.id, depth + 1);
      });
    }

    // Start with top-level tasks (parent_id = null)
    traverseAndIndex(null);
    
    return visualOrderMap;
  }

  // Handle nesting a task under another task
  async function handleTaskNesting(draggedTaskId: string, targetTaskId: string) {
    
    // Validate nesting operation
    const validation = isValidNesting(draggedTaskId, targetTaskId);
    
    if (!validation.valid) {
      dragFeedback = validation.reason || 'Invalid nesting operation';
      setTimeout(() => dragFeedback = '', 3000);
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask) {
      debugWorkflow.error('Could not find dragged or target task', { 
        draggedTaskId, 
        targetTaskId, 
        availableTaskIds: tasks.map(t => t.id) 
      });
      return;
    }

    try {
      // Auto-expand the target task to make the newly nested child visible
      hierarchyManager.expandTask(targetTaskId);

      // Calculate relative position for nesting
      const relativePosition = calculateRelativePosition(null, targetTaskId, [draggedTaskId]);
      
      // Convert relative position to position updates and execute via ReactiveRecord
      const positionUpdates = RailsClientActsAsList.convertRelativeToPositionUpdates(tasks, [relativePosition]);
      await RailsClientActsAsList.applyAndExecutePositionUpdates(tasks, positionUpdates);
      
    } catch (error: any) {
      debugWorkflow.error('Task nesting failed', { error, draggedTaskId, targetTaskId });
      
      // Clear any lingering visual dragFeedback including badges
      clearAllVisualFeedback();
      
      dragFeedback = 'Failed to nest task - please try again';
      setTimeout(() => dragFeedback = '', 3000);
    }
  }

  async function handleTaskReorder(event: DragSortEvent) {
    const draggedTaskId = event.item.dataset.taskId;
    if (!draggedTaskId) {
      // Clean up any badges if we exit early
      clearAllVisualFeedback();
      return;
    }

    // Check if this is a nesting operation
    if (event.dropZone && event.dropZone.mode === 'nest' && event.dropZone.targetTaskId) {
      
      // For single-task nesting, delegate to existing function
      const isMultiSelectNest = taskSelection.selectedTaskIds.has(draggedTaskId) && taskSelection.selectedTaskIds.size > 1;
      if (!isMultiSelectNest) {
        await handleTaskNesting(draggedTaskId, event.dropZone.targetTaskId);
        return;
      }
    }

    // Determine if this is a multi-select drag
    const isMultiSelectDrag = taskSelection.selectedTaskIds.has(draggedTaskId) && taskSelection.selectedTaskIds.size > 1;
    
    // Calculate newParentId for both single and multi-select operations
    let newParentId: string | undefined;
    const dropIndex = event.newIndex!;
    
    if (event.dropZone?.mode === 'nest' && event.dropZone.targetTaskId) {
      // For nesting: all tasks become children of the target task
      newParentId = event.dropZone.targetTaskId;
    } else if (event.dropZone?.mode === 'reorder' && event.dropZone.targetTaskId) {
      // For reordering: use target task's parent
      const targetTask = tasks.find(t => t.id === event.dropZone!.targetTaskId);
      newParentId = targetTask?.parent_id;
    } else {
      newParentId = calculateParentFromPosition(dropIndex, event.dropZone?.mode || 'reorder');
    }
    
    // Auto-expand target task for nesting operations
    if (event.dropZone?.mode === 'nest' && newParentId) {
      hierarchyManager.expandTask(newParentId);
    }
    
    try {
      // Get the task IDs that are being moved
      const taskIdsToMove = isMultiSelectDrag 
        ? Array.from(taskSelection.selectedTaskIds)
        : [draggedTaskId];
      
      // Calculate relative positioning for each task
      const relativeUpdates: RelativePositionUpdate[] = [];
      
      if (isMultiSelectDrag && taskIdsToMove.length > 1) {
        // For multi-task operations: use sequential positioning to avoid circular references
        // Sort tasks by their visual order in the hierarchy (not just position within parent)
        const visualOrderMap = createVisualOrderMap(tasks);
        const sortedTaskIds = Array.from(taskSelection.selectedTaskIds);
        sortedTaskIds.sort((a, b) => {
          const visualOrderA = visualOrderMap.get(a) || 0;
          const visualOrderB = visualOrderMap.get(b) || 0;
          return visualOrderA - visualOrderB;
        });
                
        sortedTaskIds.forEach((taskId, index) => {
          const currentTask = tasks.find(t => t.id === taskId);
          if (!currentTask) return;
          
          if (index === 0) {
            // First task: position appropriately without considering other moving tasks
            if (event.dropZone?.mode === 'nest') {
              // For nesting: find existing children (excluding tasks being moved)
              const existingChildren = tasks.filter(t => 
                t.parent_id === newParentId && 
                !sortedTaskIds.includes(t.id)
              ).sort((a, b) => (a.position || 0) - (b.position || 0));
              
              if (existingChildren.length > 0) {
                // Position after the last existing child
                const lastChild = existingChildren[existingChildren.length - 1];
                relativeUpdates.push({
                  id: taskId,
                  parent_id: newParentId,
                  after_task_id: lastChild.id
                });
              } else {
                // No existing children, place at first position
                relativeUpdates.push({
                  id: taskId,
                  parent_id: newParentId,
                  position: 'first'
                });
              }
            } else {
              // For reordering: use the calculated drop position but exclude moving tasks from consideration
              const firstTaskRelativePos = calculateRelativePosition(event.dropZone, newParentId ?? null, [taskId]);
              relativeUpdates.push(firstTaskRelativePos);
            }
          } else {
            // Subsequent tasks: position after the previous task in the sequence
            const previousTaskId = sortedTaskIds[index - 1];
            relativeUpdates.push({
              id: taskId,
              parent_id: newParentId,
              after_task_id: previousTaskId
            });
          }
        });
      } else {
        // Single task operation: use standard relative positioning
        const singleTaskUpdate = calculateRelativePosition(event.dropZone, newParentId ?? null, taskIdsToMove);
        relativeUpdates.push(singleTaskUpdate);
      }
      
      // Convert relative updates to position updates
      const positionUpdates = RailsClientActsAsList.convertRelativeToPositionUpdates(tasks, relativeUpdates);
      
      // Execute position updates using ReactiveRecord - it handles UI updates automatically
      await RailsClientActsAsList.applyAndExecutePositionUpdates(tasks, positionUpdates);
            
    } catch (error: any) {
      debugWorkflow.error('Task reorder failed', { error, relativeUpdates });
      
      // Clear any lingering visual dragFeedback including badges
      clearAllVisualFeedback();
      
      // ReactiveRecord will revert UI automatically on server error
      dragFeedback = 'Failed to reorder tasks - please try again';
      setTimeout(() => dragFeedback = '', 3000);
    }
  }

  // Task tree rendering is now handled by TaskHierarchyManager

  // Calculate parent task based on drop position in flattened list
  function calculateParentFromPosition(dropIndex: number, dropMode: 'reorder' | 'nest'): string | undefined {
    // If explicitly nesting, the target becomes the parent
    if (dropMode === 'nest') {
      const targetItem = flattenedTasks[dropIndex];
      return targetItem?.task.id;
    }
    
    // For reordering, determine parent based on the depth we're inserting at.
    // If dropping at the very beginning, it's root level
    if (dropIndex === 0) {
      return undefined;
    }
    
    // Look at the task immediately before the drop position
    const previousItem = flattenedTasks[dropIndex - 1];
    if (!previousItem) {
      return undefined; // Root level
    }
    
    // Also look at the task at the drop position (if it exists)
    const targetItem = flattenedTasks[dropIndex];
    
    // Enhanced root level detection: if previous item is at depth 0, we're likely at root level too
    if (previousItem.depth === 0) {
      return undefined;
    }
    
    // If there's a target item and previous item at the same depth,
    // we're inserting at that same depth with the same parent
    if (targetItem && previousItem.depth === targetItem.depth) {
      return targetItem.task.parent_id || undefined;
    }
    
    // If target item is deeper than previous, we're inserting at previous item's depth
    // which means previous item's parent becomes our parent
    if (targetItem && previousItem.depth < targetItem.depth) {
      return previousItem.task.parent_id || undefined;
    }
    
    // If no target item, we're appending after the last item
    // Insert at the same level as the previous item
    if (!targetItem) {
      return previousItem.task.parent_id || undefined;
    }
    
    // If target is at same/shallower depth than previous, we're inserting at the same level as the previous item
    return previousItem.task.parent_id || undefined;
  }
  
  // Handle edge case ambiguity between parent and first child
  function resolveParentChildBoundary(dropZone: DropZoneInfo | null): DropZoneInfo | null {
    if (!dropZone?.targetTaskId) return dropZone;
    
    const targetTask = tasks.find(t => t.id === dropZone.targetTaskId);
    if (!targetTask) return dropZone;
    
    // If dropping below a task that has children, and the first child is immediately after it
    if (dropZone.position === 'below') {
      const hasChildren = tasks.some(t => t.parent_id === targetTask.id);
      if (hasChildren) {
        // For "below parent with children", prefer staying at parent level
        // rather than becoming first child (user can drag to middle of task to nest)
      }
    }
    
    return dropZone; // Return as-is for now, let parent calculation handle it
  }

  // Calculate relative position using the new simplified API
  function calculateRelativePosition(dropZone: DropZoneInfo | null, parentId: string | null, draggedTaskIds: string[]): RelativePositionUpdate {
    // Resolve any boundary ambiguity
    const resolvedDropZone = resolveParentChildBoundary(dropZone);
    
    // Convert Svelte tasks to Rails task format
    const railsTasks: Task[] = tasks.map(t => ({
      id: t.id,
      position: t.position || 0,
      parent_id: t.parent_id,
      title: t.title
    }));
    
    // Use the new relative position calculator
    const result = calculateRelativePositionFromTarget(railsTasks, resolvedDropZone, parentId, draggedTaskIds);
    
    return result.relativePosition;
  }

  // Legacy position calculation for client-side prediction (backward compatibility)
  // TODO: This needs to go
  function calculatePositionFromTarget(dropZone: DropZoneInfo | null, parentId: string | null, draggedTaskIds: string[]): number {
    // Use relative positioning and convert to integer for client prediction
    const relativePosition = calculateRelativePosition(dropZone, parentId, draggedTaskIds);
    
    // Convert to integer position for optimistic updates
    const positionUpdates = RailsClientActsAsList.convertRelativeToPositionUpdates(
      tasks.map(t => ({ id: t.id, position: t.position || 0, parent_id: t.parent_id, title: t.title })),
      [relativePosition]
    );
    
    return positionUpdates[0]?.position || 1;
  }
  
</script>

<div class="task-list" bind:this={taskListContainer}>

  {#if tasks.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h4>{taskFilter.showDeleted ? 'No deleted tasks' : 'No tasks yet'}</h4>
      {#if canCreateTasks}
        <p>Click "New Task" below to get started.</p>
      {:else}
        <p>Clear the deleted filter to view active tasks.</p>
      {/if}
    </div>
  {/if}
  
  <!-- Tasks container - always show to include new task row -->
  <div 
    class="tasks-container"
    data-testid="task-list"
    use:storeDragAction={{
      onStart: handleSortStart,
      onEnd: handleSortEnd,
      onSort: handleTaskReorder,
      onMove: handleMoveDetection
    }}
    bind:this={tasksContainer}
  >
    {#if tasks.length > 0}
      {#each flattenedTasks as renderItem, index (renderItem.task.id)}
        <TaskRow 
          task={renderItem.task}
          depth={renderItem.depth}
          hasSubtasks={renderItem.hasSubtasks}
          isExpanded={renderItem.isExpanded}
          isSelected={taskSelection.selectedTaskIds.has(renderItem.task.id)}
          isEditing={editingTaskId === renderItem.task.id}
          isDeleting={deletingTaskIds.has(renderItem.task.id)}
          jobId={jobId}
          batchTaskDetails={batchTaskDetails}
          currentTime={currentTime}
          on:taskaction={handleTaskAction}
        />
        
        <!-- Inline New Task Row (appears after this task if selected) -->
        {#if canCreateTasks && insertNewTaskAfter === renderItem.task.id && inlineTaskState.isShowing}
          <NewTaskRow 
            mode="inline-after-task"
            depth={renderItem.depth}
            manager={inlineTaskManager}
            taskState={inlineTaskState}
            onStateChange={(changes) => taskCreationManager.updateState('inline', changes)}
            on:titlechange={(e) => taskCreationManager.setTitle('inline', e.detail.value)}
          />
        {/if}
      {/each}
    {/if}
      
    <!-- Add New Task Row -->
    {#if canCreateTasks}
      <NewTaskRow 
        mode="bottom-row"
        depth={0}
        manager={newTaskManager}
        taskState={bottomTaskState}
        onStateChange={(changes) => taskCreationManager.updateState('bottom', changes)}
        on:titlechange={(e) => taskCreationManager.setTitle('bottom', e.detail.value)}
      />
    {/if}
  </div>

  <!-- Error dragFeedback only -->
  {#if dragFeedback && dragFeedback.includes('Failed')}
    <div class="task-list-footer">
      <div class="dragFeedback-message error">
        {dragFeedback}
      </div>
    </div>
  {/if}
</div>


<DeletionModal
  open={isShowingDeleteConfirmation}
  title={deletionTitle()}
  onCancel={cancelDeleteConfirmation}
  onConfirm={confirmDeleteTasks}
/>

<style>
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    /* background-color: var(--bg-black); */ /* Removed to prevent overlap with focus ring */
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    margin-top: 12px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-tertiary);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
  }

  .empty-state p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
  }

  .tasks-container {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .task-list-footer {
    margin-top: 20px;
    padding: 12px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .dragFeedback-message {
    background-color: rgba(50, 215, 75, 0.2);
    color: var(--accent-green, #32D74B);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid rgba(50, 215, 75, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  .dragFeedback-message.error {
    background-color: rgba(255, 69, 58, 0.2);
    color: var(--accent-red, #FF453A);
    border-color: rgba(255, 69, 58, 0.3);
  }

  @keyframes slideIn {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Visual dragFeedback for drag & drop nesting */
  :global(.drag-drop-indicator) {
    position: absolute;
    height: 3px;
    background: linear-gradient(90deg, #007AFF, #0099FF);
    border-radius: 2px;
    box-shadow: 0 1px 4px rgba(0, 122, 255, 0.4);
    pointer-events: none;
    z-index: 1000;
  }

  :global([role="button"][data-task-id].drag-nest-target) {
    background-color: var(--accent-blue) !important;
    color: white !important;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75) !important;
    border-radius: 8px !important;
    transition: none !important;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .empty-state {
      padding: 32px 16px;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }
  }

</style>