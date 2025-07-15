<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { taskFilter, shouldShowTask } from '$lib/stores/taskFilter.svelte';
  import { taskSelection, getSelectedTaskIds, taskSelectionActions, type TaskSelectionState } from '$lib/stores/taskSelection.svelte';
  import { tasksService } from '$lib/api/tasks';
  import { Task as TaskModel } from '$lib/models/task';
  import { nativeDrag, addDropIndicator, addNestHighlight, clearAllVisualFeedback } from '$lib/utils/native-drag-action';
  import type { DragSortEvent, DragMoveEvent } from '$lib/utils/native-drag-action';
  import { calculateRelativePositionFromTarget, calculatePositionFromTarget as railsCalculatePosition } from '$lib/utils/position-calculator';
  import { ClientActsAsList as RailsClientActsAsList } from '$lib/utils/client-acts-as-list';
  import type { Task, DropZoneInfo, PositionUpdate, RelativePositionUpdate } from '$lib/utils/position-calculator';
  import TaskInfoPopoverHeadless from '../tasks/TaskInfoPopoverHeadless.svelte';
  import TaskRow from '../tasks/TaskRow.svelte';
  import NewTaskRow from '../tasks/NewTaskRow.svelte';
  import Portal from '../ui/Portal.svelte';
  
  // Import new DRY utilities
  import { createTaskInputManager, createTitleEditManager } from '$lib/utils/task-input-manager';
  import { positionCursorInText } from '$lib/utils/cursor-positioning';
  import { formatTimeDuration, calculateCurrentDuration } from '$lib/utils/taskRowHelpers';

  // Use static SVG URLs for better compatibility
  const chevronRight = '/icons/chevron-right.svg';
  const chevronDown = '/icons/chevron-down.svg';

  // ✨ USE $props() FOR SVELTE 5 RUNES MODE
  let { tasks = [], jobId = 'test', batchTaskDetails = null }: {
    tasks?: Array<Task>;
    jobId?: string;
    batchTaskDetails?: any;
  } = $props();

  // Debug logging for task props
  $effect(() => {
    // ✨ USE $state.snapshot() TO SAFELY LOG REACTIVE STATE
    const tasksSnapshot = tasks ? $state.snapshot(tasks) : null;
    console.log('[TaskList] Received tasks prop length:', tasks?.length);
    console.log('[TaskList] Tasks type:', typeof tasks);
    console.log('[TaskList] tasks.length === 0 condition result:', tasks.length === 0);
    console.log('[TaskList] Boolean(tasks):', Boolean(tasks));
    console.log('[TaskList] Array.isArray(tasks):', Array.isArray(tasks));
    if (tasksSnapshot && tasksSnapshot.length > 0) {
      console.log('[TaskList] First task ID:', tasksSnapshot[0]?.id);
      console.log('[TaskList] First task title:', tasksSnapshot[0]?.title);
    }
  });

  
  // Track collapsed/expanded state of tasks with subtasks
  let expandedTasks = new SvelteSet<string>();
  let hasAutoExpanded = false;
  
  // Drag & drop state
  let isDragging = false;
  let dragFeedback = $state('');
  
  
  // Development alerts state
  let developmentAlerts = $state([]);
  
  // Development environment detection
  const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
  
  // Multi-select state - will be computed from flattenedTasks
  
  // Removed optimistic updates - ReactiveRecord handles UI synchronization
  
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

  // Arrow key navigation for single task selection
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

  // Scroll selected task into view
  function scrollTaskIntoView(taskId: string) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Don't handle keys if actively editing
    const activeElement = document.activeElement;
    const isEditing = activeElement?.tagName === 'INPUT' || 
                     activeElement?.tagName === 'TEXTAREA' || 
                     (activeElement as HTMLElement)?.isContentEditable ||
                     editingTaskId !== null ||
                     isShowingInlineNewTaskInput;

    // ESC key handling
    if (event.key === 'Escape') {
      if (isShowingInlineNewTaskInput) {
        // Cancel inline new task
        event.preventDefault();
        cancelInlineNewTask();
      } else if (taskSelection.selectedTaskIds.size > 0 && !isEditing) {
        // Clear selection if not editing
        event.preventDefault();
        taskSelectionActions.clearSelection();
        
        // Remove focus ring by blurring the currently focused element
        if (document.activeElement && document.activeElement !== document.body) {
          (document.activeElement as HTMLElement).blur();
        }
      }
    }

    // Arrow key navigation
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !isEditing) {
      const selectedCount = taskSelection.selectedTaskIds.size;
      
      if (selectedCount === 0) {
        // No selection: down arrow selects first, up arrow selects last
        event.preventDefault(); // Prevent page scroll
        if (flatTaskIds.length > 0) {
          const taskId = event.key === 'ArrowDown' ? flatTaskIds[0] : flatTaskIds[flatTaskIds.length - 1];
          taskSelectionActions.selectTask(taskId);
          scrollTaskIntoView(taskId);
        }
      } else if (selectedCount === 1) {
        // Single selection: navigate through tasks
        event.preventDefault(); // Prevent page scroll
        handleArrowNavigation(event.key === 'ArrowUp' ? 'up' : 'down');
      }
      // Multiple selections: do nothing (don't handle arrow keys)
    }

    // Return key for new task creation
    if (event.key === 'Enter' && !isEditing) {
      const selectedCount = taskSelection.selectedTaskIds.size;
      
      if (selectedCount === 0) {
        // No selection: activate bottom "New Task" row
        event.preventDefault();
        newTaskManager.show();
      } else if (selectedCount === 1) {
        // Single selection: check if it's the last task
        event.preventDefault();
        const selectedTaskId = Array.from(taskSelection.selectedTaskIds)[0];
        const selectedTaskIndex = flatTaskIds.indexOf(selectedTaskId);
        const isLastTask = selectedTaskIndex === flatTaskIds.length - 1;
        
        if (isLastTask) {
          // Last task selected: activate bottom "New Task" row (cleaner UX)
          taskSelectionActions.clearSelection();
          newTaskManager.show();
        } else {
          // Not last task: create inline new task as sibling
          insertNewTaskAfter = selectedTaskId;
          isShowingInlineNewTaskInput = true;
          inlineNewTaskTitle = '';
          taskSelectionActions.clearSelection(); // Clear selection when creating new task
          
          // Focus inline input after DOM update
          tick().then(() => {
            if (inlineNewTaskInputElement) {
              inlineNewTaskInputElement.focus();
            }
          });
        }
      }
      // Multiple selections: do nothing
    }

    // Delete key for task deletion
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditing) {
      const selectedCount = taskSelection.selectedTaskIds.size;
      
      if (selectedCount > 0) {
        event.preventDefault();
        showDeleteConfirmation();
      }
    }
  }

  onMount(() => {
    // Add event listeners for outside click and keyboard
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeydown);
  });

  // Clean up any lingering visual dragFeedback when component is destroyed
  onDestroy(() => {
    clearAllVisualFeedback();
    // Remove event listeners
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeydown);
  });
  
  // Rails-compatible client-side acts_as_list implementation
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
      
      console.log('🔄 Using Rails-compatible ClientActsAsList:', {
        tasksCount: railsTasks.length,
        updatesCount: railsUpdates.length,
        updates: railsUpdates
      });
      
      // Use the validated Rails-compatible logic
      const result = RailsClientActsAsList.applyPositionUpdates(railsTasks, railsUpdates);
      
      console.log('🔄 Rails-compatible result:', {
        updatedTasksCount: result.updatedTasks.length,
        operationsCount: result.operations.length
      });
      
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
  
  // New task creation state
  let isShowingNewTaskInput = $state(false);
  let newTaskTitle = $state('');
  let newTaskInputElement = $state<HTMLInputElement>();
  let isCreatingTask = $state(false);
  
  // Task title editing state
  let editingTaskId = $state<string | null>(null);
  let editingTitle = $state('');
  let originalTitle = '';
  let titleInputElement = $state<HTMLInputElement>();
  
  // Inline new task state (for Return key with selection)
  let insertNewTaskAfter = $state<string | null>(null);
  let isShowingInlineNewTaskInput = $state(false);
  let inlineNewTaskTitle = $state('');
  let inlineNewTaskInputElement = $state<HTMLInputElement>();

  // Task deletion state
  let isShowingDeleteConfirmation = $state(false);
  let tasksToDelete = $state<string[]>([]);
  let isDeletingTasks = $state(false);
  let deleteButtonElement = $state<HTMLButtonElement>();
  let modalContainerElement = $state<HTMLElement>();
  let deletingTaskIds = $state(new Set<string>());
  const animationDuration = 300; // ms for height collapse animation
  
  // ✨ DRY Input Managers - replaces ~300 lines of repetitive handlers
  const newTaskManager = createTaskInputManager(
    {
      title: { get: () => newTaskTitle, set: (v) => newTaskTitle = v },
      inputElement: { get: () => newTaskInputElement },
      isCreating: { get: () => isCreatingTask, set: (v) => isCreatingTask = v },
      isShowing: { get: () => isShowingNewTaskInput, set: (v) => isShowingNewTaskInput = v }
    },
    {
      create: createNewTask,
      cancel: hideNewTaskForm
    }
  );
  
  const inlineTaskManager = createTaskInputManager(
    {
      title: { get: () => inlineNewTaskTitle, set: (v) => inlineNewTaskTitle = v },
      inputElement: { get: () => inlineNewTaskInputElement },
      isCreating: { get: () => isCreatingTask, set: (v) => isCreatingTask = v },
      isShowing: { get: () => isShowingInlineNewTaskInput, set: (v) => isShowingInlineNewTaskInput = v }
    },
    {
      create: (shouldSelect) => createInlineTask(insertNewTaskAfter, shouldSelect),
      cancel: cancelInlineNewTask
    }
  );
  
  const titleEditHandlers = createTitleEditManager(
    () => saveTitle(editingTaskId!, editingTitle),
    cancelEdit
  );

  // Organize tasks into hierarchical structure with filtering
  function organizeTasksHierarchically(taskList: typeof tasks, filterStatuses: string[], showDeleted: boolean) {
    const taskMap = new Map();
    const rootTasks: any[] = [];
    
    // First pass: create map of all tasks
    taskList.forEach((task, index) => {
      
      taskMap.set(task.id, {
        ...task,
        subtasks: []
      });
    });
    
    // Second pass: organize into hierarchy and apply filtering
    taskList.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id);
      
      const shouldShow = shouldShowTask(task, filterStatuses, showDeleted);
      
      // Apply filter - only include tasks that should be shown
      if (!shouldShow) {
        return;
      }
      
      if (task.parent_id && taskMap.has(task.parent_id)) {
        // Only add to parent if parent is also visible
        const parent = taskMap.get(task.parent_id);
        if (shouldShowTask(parent, filterStatuses, showDeleted)) {
          parent.subtasks.push(taskWithSubtasks);
        }
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });
    
    // Sort root tasks by position
    rootTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
    
    // Sort subtasks by position for each parent
    function sortSubtasks(task: any) {
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
        task.subtasks.forEach(sortSubtasks);
      }
    }
    
    rootTasks.forEach(sortSubtasks);
    
    return rootTasks;
  }

  // ✨ USE $derived FOR COMPUTED VALUES IN SVELTE 5
  const hierarchicalTasks = $derived(organizeTasksHierarchically(tasks, taskFilter.selectedStatuses, taskFilter.showDeleted));

  // Debug hierarchical tasks
  $effect(() => {
    console.log('[TaskList] hierarchicalTasks length:', hierarchicalTasks?.length);
    // ✅ Safe: Access ID from first element without proxy issues
    if (hierarchicalTasks && hierarchicalTasks.length > 0) {
      console.log('[TaskList] hierarchicalTasks first ID:', hierarchicalTasks[0]?.id);
    }
  });
  
  // Auto-expand ALL tasks that have subtasks by default (only once on initial load)
  $effect(() => {
    if (hierarchicalTasks.length > 0 && !hasAutoExpanded) {
      // Recursively expand all tasks with subtasks
      function expandAllTasksWithSubtasks(taskList: any[]) {
        taskList.forEach(task => {
          if (task.subtasks && task.subtasks.length > 0) {
            expandedTasks.add(task.id);
            // Recursively expand subtasks that also have children
            expandAllTasksWithSubtasks(task.subtasks);
          }
        });
      }
      
      expandAllTasksWithSubtasks(hierarchicalTasks);
      hasAutoExpanded = true;
    }
  });
  
  // Make rendering reactive to expandedTasks state changes
  const flattenedTasks = $derived.by(() => {
    const result = hierarchicalTasks.flatMap(task => renderTaskTree(task, 0));
    console.log('[TaskList] flattenedTasks length:', result?.length);
    // ✅ Safe: Log ID directly without storing proxy reference
    console.log('[TaskList] flattenedTasks first ID:', result?.[0]?.task?.id);
    return result;
  });
  
  // Update flat task IDs for multi-select functionality
  const flatTaskIds = $derived(flattenedTasks.map(item => item.task.id));

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
    if (expandedTasks.has(taskId)) {
      expandedTasks.delete(taskId);
    } else {
      expandedTasks.add(taskId);
    }
  }

  function isTaskExpanded(taskId: string): boolean {
    return expandedTasks.has(taskId);
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

  // Multi-select click handler
  function handleTaskClick(event: MouseEvent, taskId: string) {
    event.stopPropagation();
    
    if (event.shiftKey) {
      taskSelectionActions.handleRangeSelect(taskId, flatTaskIds);
    } else if (event.ctrlKey || event.metaKey) {
      taskSelectionActions.toggleTask(taskId);
    } else {
      taskSelectionActions.selectTask(taskId);
    }
  }

  // Keyboard handler for accessibility
  function handleTaskKeydown(event: KeyboardEvent, taskId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      
      const mockEvent = {
        stopPropagation: () => {},
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey
      } as MouseEvent;
      
      handleTaskClick(mockEvent, taskId);
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
        handleTaskKeydown(data.event, taskId);
        break;
      case 'statusChange':
        handleStatusChange(taskId, data.newStatus);
        break;
      case 'titleClick':
        handleTitleClick(data.event, taskId, data.originalTitle);
        break;
      case 'toggleExpansion':
        toggleTaskExpansion(taskId);
        break;
      case 'startEdit':
        editingTaskId = taskId;
        editingTitle = data.originalTitle;
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
        saveTitle(taskId, data.newTitle);
        break;
      case 'cancelEdit':
        cancelEdit();
        break;
      case 'taskUpdated':
        handleTaskUpdated(event);
        break;
      default:
        console.warn('Unknown task action type:', type);
    }
  }

  // New task creation - using DRY utilities
  function hideNewTaskForm() {
    isShowingNewTaskInput = false;
    newTaskTitle = '';
  }

  function handleNewTaskRowClick(event: MouseEvent) {
    // Only activate if not already in input mode
    if (!isShowingNewTaskInput) {
      event.stopPropagation();
      newTaskManager.show(event);
    }
  }

  async function createNewTask(shouldSelectAfterCreate: boolean = false) {
    if (!newTaskTitle.trim() || isCreatingTask) return;
    
    isCreatingTask = true;
    const title = newTaskTitle.trim();
    
    try {
      const newTask = await TaskModel.create({
        title,
        job_id: jobId,
        status: 'new_task',
        position: tasks.length + 1,
        lock_version: 0,
        applies_to_all_targets: false
      });
      
      // Add the new task to our local tasks array
      tasks = [...tasks, newTask];
      
      // Select the newly created task only if requested (Return key, not blur)
      if (shouldSelectAfterCreate) {
        taskSelectionActions.selectTask(newTask.id);
      }
      
      // Clear the form
      hideNewTaskForm();
      
      dragFeedback = 'Task created successfully!';
      setTimeout(() => dragFeedback = '', 2000);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      dragFeedback = 'Failed to create task - please try again';
      setTimeout(() => dragFeedback = '', 3000);
    } finally {
      isCreatingTask = false;
    }
  }

  // ✨ Replaced with newTaskManager.handlers - eliminates ~40 lines


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
      console.error('Failed to update task status:', error);
      
      if (error.code === 'INVALID_CSRF_TOKEN') {
        dragFeedback = 'Session expired - please try again';
      } else {
        dragFeedback = 'Failed to update task status - please try again';
      }
      setTimeout(() => dragFeedback = '', 3000);
    }
  }

  // Task title editing functions - using DRY cursor positioning
  function handleTitleClick(event: MouseEvent, taskId: string, currentTitle: string) {
    event.stopPropagation(); // Prevent task selection
    taskSelectionActions.clearSelection(); // Clear any existing selection when editing
    
    // Enter edit mode
    editingTaskId = taskId;
    editingTitle = currentTitle;
    originalTitle = currentTitle;
    
    // Focus the input after DOM update
    tick().then(() => {
      if (titleInputElement) {
        titleInputElement.focus();
        // ✨ Use DRY cursor positioning utility - eliminates ~30 lines
        positionCursorInText(event, titleInputElement, currentTitle);
      }
    });
  }

  async function saveTitle(taskId: string, newTitle: string) {
    if (newTitle.trim() === '' || newTitle === originalTitle) {
      cancelEdit();
      return;
    }

    try {
      // Find the task data and create an ActiveRecord-style instance
      const taskData = tasks.find(t => t.id === taskId);
      if (!taskData) {
        throw new Error('Task not found');
      }

      // Use Epic-008 ActiveRecord pattern
      const { Task } = await import('$lib/models/task');
      
      // Use ActiveRecord-style update method
      await Task.update(taskData.id, { title: newTitle.trim() });
      
      // UI cleanup - Zero.js reactive updates will handle the data changes
      editingTaskId = null;
      editingTitle = '';
      originalTitle = '';
      
    } catch (error) {
      console.error('Failed to update task title:', error);
      dragFeedback = 'Failed to update task title - please try again';
      setTimeout(() => dragFeedback = '', 3000);
      
      // Revert to original title
      editingTitle = originalTitle;
    }
  }

  function cancelEdit() {
    editingTaskId = null;
    editingTitle = '';
    originalTitle = '';
  }

  // ✨ Replaced with titleEditHandlers - eliminates ~15 lines

  // Inline new task functions
  async function createInlineTask(afterTaskId: string | null, shouldSelectAfterCreate: boolean = false) {
    if (inlineNewTaskTitle.trim() === '') {
      cancelInlineNewTask();
      return;
    }

    try {
      isCreatingTask = true;
      
      // Find the task we're inserting after and get its parent_id to make new task a sibling
      let correctParentId: string | null = null;
      if (afterTaskId) {
        const afterTask = tasks.find(t => t.id === afterTaskId);
        if (afterTask) {
          correctParentId = afterTask.parent_id || null;
        }
      }
      
      // Calculate position based on after_task_id for ActiveRecord pattern
      let position = 1;
      if (insertNewTaskAfter) {
        // Find the task we want to insert after
        const afterTask = tasks.find(t => t.id === insertNewTaskAfter);
        if (afterTask) {
          // Get tasks in the same scope (sibling tasks with same parent)
          const scopeTasks = tasks.filter(t => (t.parent_id || null) === (correctParentId || null))
                                   .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          
          // Find position after the target task
          const afterIndex = scopeTasks.findIndex(t => t.id === insertNewTaskAfter);
          if (afterIndex !== -1) {
            position = (afterTask.position ?? 0) + 1;
          }
        }
      } else {
        // No specific position: append at end of scope
        const scopeTasks = tasks.filter(t => (t.parent_id || null) === (correctParentId || null));
        position = scopeTasks.length + 1;
      }
      
      const newTask = await TaskModel.create({
        title: inlineNewTaskTitle.trim(),
        job_id: jobId,
        status: 'new_task',
        position: position,
        parent_id: correctParentId || undefined,
        lock_version: 0,
        applies_to_all_targets: false
      });
      
      // Insert new task at correct position based on visual hierarchy
      if (insertNewTaskAfter) {
        // Find position in the visual hierarchy (what user sees)
        const visualIndex = flatTaskIds.indexOf(insertNewTaskAfter);
        if (visualIndex !== -1 && visualIndex < flatTaskIds.length - 1) {
          // Get the task that should come after our new task in the visual order
          const nextTaskId = flatTaskIds[visualIndex + 1];
          const nextTaskIndex = tasks.findIndex(t => t.id === nextTaskId);
          
          if (nextTaskIndex !== -1) {
            // Insert before the next task in the flat array
            tasks = [
              ...tasks.slice(0, nextTaskIndex),
              newTask,
              ...tasks.slice(nextTaskIndex)
            ];
          } else {
            // Fallback: append at end
            tasks = [...tasks, newTask];
          }
        } else {
          // Selected task is last in visual order, or not found - append at end
          tasks = [...tasks, newTask];
        }
      } else {
        // No specific position: append at end
        tasks = [...tasks, newTask];
      }
      
      // Clear inline state
      cancelInlineNewTask();
      
      // Update insertNewTaskAfter to point to the newly created task
      // This ensures subsequent new tasks will be positioned after this one
      insertNewTaskAfter = newTask.id;
      
      // Select the newly created task only if requested (Return key, not blur)
      if (shouldSelectAfterCreate) {
        taskSelectionActions.selectTask(newTask.id);
      }
      
      dragFeedback = 'Task created successfully';
      setTimeout(() => dragFeedback = '', 2000);
    } catch (error) {
      console.error('Failed to create inline task:', error);
      dragFeedback = 'Failed to create task - please try again';
      setTimeout(() => dragFeedback = '', 3000);
    } finally {
      isCreatingTask = false;
    }
  }

  function cancelInlineNewTask() {
    insertNewTaskAfter = null;
    isShowingInlineNewTaskInput = false;
    inlineNewTaskTitle = '';
  }

  // ✨ Replaced with inlineTaskManager.handlers - eliminates ~20 lines

  // Task deletion functions
  async function showDeleteConfirmation() {
    tasksToDelete = Array.from(taskSelection.selectedTaskIds);
    isShowingDeleteConfirmation = true;
    
    // Ensure modal gets focus immediately for keyboard event capture
    await tick();
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      if (modalContainerElement) {
        // Try to focus the modal container first
        modalContainerElement.focus();
        // Prevent focus from escaping the modal
        modalContainerElement.addEventListener('focusout', handleModalFocusOut);
        
        // If modal container didn't get focus, try focusing the delete button
        setTimeout(() => {
          if (isShowingDeleteConfirmation) {
            const activeElement = document.activeElement;
            if (!modalContainerElement.contains(activeElement)) {
              // Try delete button as fallback since buttons are more reliably focusable
              if (deleteButtonElement) {
                deleteButtonElement.focus();
              } else {
                // Final fallback to modal container
                modalContainerElement.focus();
              }
            }
          }
        }, 10);
      }
    }, 0);
  }

  function handleModalFocusOut(event: FocusEvent) {
    // If focus is leaving the modal but modal is still open, return focus to modal
    if (isShowingDeleteConfirmation && modalContainerElement && !modalContainerElement.contains(event.relatedTarget as Node)) {
      setTimeout(() => {
        if (isShowingDeleteConfirmation && modalContainerElement) {
          modalContainer.focus();
        }
      }, 0);
    }
  }

  function cancelDeleteConfirmation() {
    isShowingDeleteConfirmation = false;
    tasksToDelete = [];
    
    // Clean up focus event listener
    if (modalContainerElement) {
      modalContainerElement.removeEventListener('focusout', handleModalFocusOut);
    }
    
    // Return focus to task list container
    if (taskListContainer) {
      taskListContainer.focus();
    }
  }

  function handleModalKeydown(event: KeyboardEvent) {
    // Prevent all keyboard events from bubbling to main UI
    event.stopPropagation();
    
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelDeleteConfirmation();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!isDeletingTasks) {
        confirmDeleteTasks();
      }
    } else if (event.key === 'Tab') {
      // Keep focus within modal by cycling between buttons
      event.preventDefault();
      const buttons = modalContainerElement?.querySelectorAll('button:not(:disabled)');
      if (buttons && buttons.length > 0) {
        const focusedButton = document.activeElement;
        const currentIndex = Array.from(buttons).indexOf(focusedButton as HTMLButtonElement);
        const nextIndex = event.shiftKey 
          ? (currentIndex - 1 + buttons.length) % buttons.length
          : (currentIndex + 1) % buttons.length;
        (buttons[nextIndex] as HTMLButtonElement).focus();
      }
    }
  }

  async function confirmDeleteTasks() {
    if (tasksToDelete.length === 0 || isDeletingTasks) return;

    isDeletingTasks = true;
    const tasksToDeleteCopy = [...tasksToDelete]; // Copy for async operations

    try {
      // Phase 1: Close modal and return focus first
      isShowingDeleteConfirmation = false;
      
      // Return focus to task list container
      if (taskListContainer) {
        taskListContainer.focus();
      }

      // Clear selection
      taskSelectionActions.clearSelection();

      // Phase 2: Start deletion animation by marking tasks as deleting
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

        // Use Epic-008 ActiveRecord pattern
        const { Task } = await import('$lib/models/task');
        
        // Use ActiveRecord-style discard method (soft deletion)
        await Task.discard(taskData.id);
        return { id: taskData.id };
      });

      // Wait for both API calls and animation to complete
      const [, ] = await Promise.all([
        Promise.all(deletePromises),
        new Promise(resolve => setTimeout(resolve, animationDuration))
      ]);

      // Phase 3: Tasks will be automatically removed from UI by Zero's reactive query
      // which filters out soft-deleted tasks (discarded_at IS NOT NULL) unless showDeleted is true

      // Clear deletion animation state
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = deletingTaskIds;

      // Show success dragFeedback
      dragFeedback = `Successfully discarded ${deletePromises.length} task${deletePromises.length === 1 ? '' : 's'}`;
      setTimeout(() => dragFeedback = '', 3000);

    } catch (error: any) {
      console.error('Failed to discard tasks:', error);
      
      // Clear animation state on error
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = deletingTaskIds;
      
      dragFeedback = `Failed to discard tasks: ${error.message || 'Unknown error'}`;
      setTimeout(() => dragFeedback = '', 5000);
    } finally {
      isDeletingTasks = false;
      tasksToDelete = []; // Clear the original array
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
    
    // Reordering is handled by onSort event - no need for duplicate call here

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
    console.log(`🪆 Attempting to nest ${draggedTaskId.substring(0,8)} under ${targetTaskId.substring(0,8)}`);
    
    // Validate nesting operation
    const validation = isValidNesting(draggedTaskId, targetTaskId);
    console.log(`🔍 Nesting validation result:`, validation);
    
    if (!validation.valid) {
      console.log(`❌ Nesting blocked: ${validation.reason}`);
      dragFeedback = validation.reason || 'Invalid nesting operation';
      setTimeout(() => dragFeedback = '', 3000);
      return;
    }
    
    console.log(`✅ Nesting validation passed, proceeding with operation`);

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask) {
      console.error('Could not find dragged or target task');
      return;
    }

    // ReactiveRecord handles state management - no manual rollback needed

    try {
      // Auto-expand the target task to make the newly nested child visible
      if (!expandedTasks.has(targetTaskId)) {
        expandedTasks.add(targetTaskId);
      }

      // Calculate relative position for nesting
      const relativePosition = calculateRelativePosition(null, targetTaskId, [draggedTaskId]);
      
      // Convert relative position to position updates and execute via ReactiveRecord
      const positionUpdates = RailsClientActsAsList.convertRelativeToPositionUpdates(tasks, [relativePosition]);
      
      // Execute nesting using ReactiveRecord - it handles UI updates automatically
      await RailsClientActsAsList.applyAndExecutePositionUpdates(tasks, positionUpdates);
      
      console.log('✅ Task nesting executed via ReactiveRecord pattern', {
        draggedTaskId: draggedTaskId.substring(0, 8),
        targetTaskId: targetTaskId.substring(0, 8), 
        relativePosition,
        positionUpdates: positionUpdates.length
      });
      
    } catch (error: any) {
      console.error('Failed to nest task:', error);
      
      // Clear any lingering visual dragFeedback including badges
      clearAllVisualFeedback();
      
      // ReactiveRecord will revert UI automatically on server error
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

    console.log('🎬 handleTaskReorder started:', {
      draggedTaskId,
      dropZone: event.dropZone,
      newIndex: event.newIndex,
      oldIndex: event.oldIndex
    });

    // Check if this is a nesting operation
    if (event.dropZone && event.dropZone.mode === 'nest' && event.dropZone.targetTaskId) {
      console.log('🪆 Nesting operation detected');
      
      // For single-task nesting, delegate to existing function
      const isMultiSelectNest = taskSelection.selectedTaskIds.has(draggedTaskId) && taskSelection.selectedTaskIds.size > 1;
      if (!isMultiSelectNest) {
        await handleTaskNesting(draggedTaskId, event.dropZone.targetTaskId);
        return;
      }
      
      // Handle multi-task nesting here (will be processed by the multi-select logic below)
      console.log('🪆 Multi-task nesting detected, processing with multi-select logic');
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
    
    // ReactiveRecord handles state management - no manual tracking needed
    
    // Auto-expand target task for nesting operations
    if (event.dropZone?.mode === 'nest' && newParentId && !expandedTasks.has(newParentId)) {
      expandedTasks.add(newParentId);
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
        
        console.log('🔗 Sequential multi-task positioning:', {
          sortedTaskIds: sortedTaskIds.map(id => {
            const task = tasks.find(t => t.id === id);
            return {
              id: id.substring(0, 8),
              position: task?.position,
              visualOrder: visualOrderMap.get(id),
              title: task?.title?.substring(0, 15) + '...',
              parent: task?.parent_id?.substring(0, 8) || 'null'
            };
          }),
          targetParent: newParentId?.substring(0, 8) || 'null',
          dropMode: event.dropZone?.mode,
          note: 'Sorted by visual hierarchy order, not position within parent'
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
      
      console.log('📡 Sending relative position updates to server:', {
        jobId,
        relativeUpdates,
        draggedTaskId,
        dropZone: event.dropZone
      });
      
      // ReactiveRecord handles all position calculations
      
      // ReactiveRecord will handle UI updates automatically
      
      // ReactiveRecord automatically handles position updates
      
      // Convert relative updates to position updates
      const positionUpdates = RailsClientActsAsList.convertRelativeToPositionUpdates(tasks, relativeUpdates);
      
      // Execute position updates using ReactiveRecord - it handles UI updates automatically
      await RailsClientActsAsList.applyAndExecutePositionUpdates(tasks, positionUpdates);
      
      console.log('✅ Position updates executed via ReactiveRecord pattern', {
        positionUpdates: positionUpdates.length
      });
      
      // ReactiveRecord will update UI automatically - no manual state tracking needed
      
    } catch (error: any) {
      console.error('Failed to reorder tasks:', error);
      
      // Clear any lingering visual dragFeedback including badges
      clearAllVisualFeedback();
      
      // ReactiveRecord will revert UI automatically on server error
      dragFeedback = 'Failed to reorder tasks - please try again';
      setTimeout(() => dragFeedback = '', 3000);
    }
  }
  
  // Removed comparison functions - ReactiveRecord handles all synchronization
  
  // Development alert system
  function showDevelopmentAlert(alert: {
    type: string;
    message: string;
    details?: any;
    actions?: Array<{label: string, action: () => void}>;
  }) {
    if (!isDevelopment) return;
    
    const alertWithId = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    developmentAlerts = [...developmentAlerts, alertWithId];
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      dismissDevelopmentAlert(alertWithId.id);
    }, 10000);
  }
  
  function dismissDevelopmentAlert(alertId: string) {
    developmentAlerts = developmentAlerts.filter(alert => alert.id !== alertId);
  }
  
  function viewConsoleDetails() {
    console.log('📋 Check the console above for detailed position mismatch debugging information');
  }
  
  function refreshTasks() {
    window.location.reload();
  }

  // Recursive function to render task tree
  function renderTaskTree(task: any, depth: number): Array<{
    task: any;
    depth: number;
    hasSubtasks: boolean;
    isExpanded: boolean;
  }> {
    const result = [];
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = isTaskExpanded(task.id);
    
    result.push({
      task,
      depth,
      hasSubtasks,
      isExpanded
    });
    
    if (hasSubtasks && isExpanded) {
      for (const subtask of task.subtasks) {
        result.push(...renderTaskTree(subtask, depth + 1));
      }
    }
    
    return result;
  }

  // Calculate parent task based on drop position in flattened list
  function calculateParentFromPosition(dropIndex: number, dropMode: 'reorder' | 'nest'): string | undefined {
    // If explicitly nesting, the target becomes the parent
    if (dropMode === 'nest') {
      const targetItem = flattenedTasks[dropIndex];
      return targetItem?.task.id;
    }
    
    // For reordering, determine parent based on the depth we're inserting at
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
      return targetItem.task.parent_id || null;
    }
    
    // If target item is deeper than previous, we're inserting at previous item's depth
    // which means previous item's parent becomes our parent
    if (targetItem && previousItem.depth < targetItem.depth) {
      return previousItem.task.parent_id || null;
    }
    
    // If no target item, we're appending after the last item
    // Insert at the same level as the previous item
    if (!targetItem) {
      return previousItem.task.parent_id || null;
    }
    
    // If target is at same/shallower depth than previous,
    // we're inserting at the same level as the previous item
    return previousItem.task.parent_id || null;
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
    
    console.log('🎯 calculateRelativePosition called:', {
      dropZone,
      resolvedDropZone,
      parentId,
      draggedTaskIds
    });
    
    // Convert Svelte tasks to Rails task format
    const railsTasks: Task[] = tasks.map(t => ({
      id: t.id,
      position: t.position || 0,
      parent_id: t.parent_id,
      title: t.title
    }));
    
    // Use the new relative position calculator
    const result = calculateRelativePositionFromTarget(railsTasks, resolvedDropZone, parentId, draggedTaskIds);
    
    console.log('🎯 Relative positioning result:', {
      relativePosition: result.relativePosition,
      reasoning: result.reasoning
    });
    
    return result.relativePosition;
  }

  // Legacy position calculation for client-side prediction (backward compatibility)
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
      <h4>No tasks yet</h4>
      <p>Click "New Task" below to get started.</p>
    </div>
  {/if}
  
  <!-- Tasks container - always show to include new task row -->
  <div 
    class="tasks-container"
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
          editingTitle={editingTitle}
          jobId={jobId}
          batchTaskDetails={batchTaskDetails}
          currentTime={currentTime}
          on:taskaction={handleTaskAction}
        />
        
        <!-- Inline New Task Row (appears after this task if selected) -->
        {#if insertNewTaskAfter === renderItem.task.id && isShowingInlineNewTaskInput}
          <NewTaskRow 
            mode="inline-after-task"
            depth={renderItem.depth}
            manager={inlineTaskManager}
            isShowing={isShowingInlineNewTaskInput}
            title={inlineNewTaskTitle}
            on:titlechange={(e) => inlineNewTaskTitle = e.detail.value}
          />
        {/if}
      {/each}
    {/if}
      
    <!-- Add New Task Row -->
    <NewTaskRow 
      mode="bottom-row"
      depth={0}
      manager={newTaskManager}
      isShowing={isShowingNewTaskInput}
      title={newTaskTitle}
      on:titlechange={(e) => newTaskTitle = e.detail.value}
    />
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

<!-- Development Alerts (only visible in development) -->
{#if isDevelopment && developmentAlerts.length > 0}
  <div class="development-alerts">
    {#each developmentAlerts as alert (alert.id)}
      <div class="development-alert" class:position-mismatch={alert.type === 'position-mismatch'}>
        <div class="alert-header">
          <div class="alert-icon">🚨</div>
          <div class="alert-message">{alert.message}</div>
          <button class="alert-dismiss" onclick={() => dismissDevelopmentAlert(alert.id)}>×</button>
        </div>
        
        {#if alert.details?.patternAnalysis}
          <div class="alert-details">
            <strong>Pattern:</strong> {alert.details.patternAnalysis}
          </div>
        {/if}
        
        {#if alert.actions}
          <div class="alert-actions">
            {#each alert.actions as action}
              <button class="alert-action-button" onclick={action.action}>
                {action.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if isShowingDeleteConfirmation}
  <Portal>
    <div class="modal-backdrop" onclick={cancelDeleteConfirmation}>
      <div class="modal-container" bind:this={modalContainerElement} onclick={(e) => e.stopPropagation()} onkeydown={(e) => { e.stopPropagation(); handleModalKeydown(e); }} tabindex="-1" autofocus>
        <div class="warning-icon">
          <svg class="w-12 h-12" viewBox="0 0 24.5703 30.0293" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect height="30.0293" opacity="0" width="24.5703" x="0" y="0"/>
              <path d="M8.26172 24.1113C7.8418 24.1113 7.56836 23.8477 7.54883 23.4473L7.14844 9.35547C7.13867 8.94531 7.41211 8.69141 7.85156 8.69141C8.24219 8.69141 8.53516 8.93555 8.54492 9.3457L8.96484 23.4375C8.97461 23.8379 8.69141 24.1113 8.26172 24.1113ZM12.1094 24.1113C11.6895 24.1113 11.3867 23.8379 11.3867 23.4375L11.3867 9.35547C11.3867 8.95508 11.6895 8.69141 12.1094 8.69141C12.5293 8.69141 12.832 8.95508 12.832 9.35547L12.832 23.4375C12.832 23.8379 12.5293 24.1113 12.1094 24.1113ZM15.9473 24.1113C15.5176 24.1113 15.2441 23.8379 15.2539 23.4473L15.6641 9.35547C15.6738 8.94531 15.9668 8.69141 16.3672 8.69141C16.7969 8.69141 17.0703 8.95508 17.0605 9.36523L16.6602 23.4473C16.6406 23.8574 16.3672 24.1113 15.9473 24.1113ZM6.66992 5.58594L8.37891 5.58594L8.37891 2.90039C8.37891 2.11914 8.91602 1.61133 9.75586 1.61133L14.4336 1.61133C15.2734 1.61133 15.8105 2.11914 15.8105 2.90039L15.8105 5.58594L17.5195 5.58594L17.5195 2.80273C17.5195 1.06445 16.3965 0 14.5312 0L9.6582 0C7.80273 0 6.66992 1.06445 6.66992 2.80273ZM0.810547 6.43555L23.3984 6.43555C23.8477 6.43555 24.209 6.06445 24.209 5.625C24.209 5.17578 23.8477 4.80469 23.3984 4.80469L0.810547 4.80469C0.380859 4.80469 0 5.18555 0 5.625C0 6.07422 0.380859 6.43555 0.810547 6.43555ZM6.37695 27.8906L17.8516 27.8906C19.5312 27.8906 20.7129 26.748 20.8008 25.0684L21.7285 6.18164L2.49023 6.18164L3.41797 25.0781C3.50586 26.7578 4.66797 27.8906 6.37695 27.8906Z" fill="#ff453a"/>
            </g>
          </svg>
        </div>
        
        <h2 class="modal-title">
          Are you sure you want to delete {#if tasksToDelete.length === 1}{@const taskToDelete = tasks.find(t => t.id === tasksToDelete[0])}{#if taskToDelete}“{taskToDelete.title}”{:else}"this task"{/if}{:else}"{tasksToDelete.length} tasks"{/if}?
        </h2>
                
        <div class="modal-buttons">
          <button class="button button--secondary" onclick={cancelDeleteConfirmation} disabled={isDeletingTasks}>
            Cancel
          </button>
          <button class="button button--danger" bind:this={deleteButtonElement} onclick={confirmDeleteTasks} disabled={isDeletingTasks}>
            {#if isDeletingTasks}
              <span class="spinner">⏳</span>
              Deleting...
            {:else}
              Delete
            {/if}
          </button>
        </div>
      </div>
    </div>
  </Portal>
{/if}

<style>
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    background-color: var(--bg-black);
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

  /* Spinner animation for new task creation */
  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Time Tracking Styles */
  .time-tracking {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .time-icon {
    font-size: 11px;
  }

  .time-duration {
    font-weight: 500;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .time-duration.in-progress {
    color: var(--accent-blue);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Task Metadata Styles */
  .task-metadata {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .assigned-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent-blue);
    color: white;
    font-size: 10px;
    font-weight: 600;
  }

  .assignee-initials {
    line-height: 1;
  }

  .notes-indicator {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background: var(--bg-tertiary);
    border-radius: 10px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .notes-icon {
    font-size: 10px;
  }

  .notes-count {
    font-weight: 500;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  /* Smooth transitions */
  .task-item,
  .disclosure-button,
  .status-emoji {
    transition: all 0.15s ease;
  }

  /* Development Alerts */
  .development-alerts {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .development-alert {
    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
    border: 2px solid #ff4757;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(255, 75, 87, 0.3);
    color: white;
    font-size: 14px;
    line-height: 1.4;
    pointer-events: auto;
    animation: slideInRight 0.3s ease-out;
    backdrop-filter: blur(10px);
  }

  .development-alert.position-mismatch {
    background: linear-gradient(135deg, #ffa726, #ff9800);
    border-color: #ff8f00;
    box-shadow: 0 8px 32px rgba(255, 152, 0, 0.3);
  }

  .alert-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .alert-icon {
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .alert-message {
    flex: 1;
    font-weight: 600;
  }

  .alert-dismiss {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
  }

  .alert-dismiss:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .alert-details {
    margin: 8px 0;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    font-size: 13px;
    border-left: 3px solid rgba(255, 255, 255, 0.3);
  }

  .alert-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .alert-action-button {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .alert-action-button:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Delete Confirmation Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(1px);
  }

  .modal-container {
    background: #000000;
    border: 1px solid #374151;
    border-radius: 12px;
    padding: 24px;
    max-width: 20rem;
    outline: none;
    box-shadow: 0 20px 30px rgba(0, 0, 0, 0.3);
  }

  .warning-icon {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    height: 48px;
    width: 48px;
  }

  .modal-title {
    color: white;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .modal-description {
    color: #d1d5db;
    margin-bottom: 16px;
    font-size: 16px;
  }

  .modal-buttons {
    display: flex;
    gap: 16px;
  }

  .button {
    border-radius: 9999px;
    padding: 6px 12px;
    font-weight: 500;
    flex: 1;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 16px;
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .button--secondary {
    background: #374151;
    color: white;
  }

  .button--secondary:hover:not(:disabled) {
    background: #4b5563;
  }

  .button--danger {
    background: #991b1b;
    color: #fff;
  }

  .button--danger:hover:not(:disabled) {
    background: #7f1d1d;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>