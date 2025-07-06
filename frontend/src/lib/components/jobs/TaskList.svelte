<script lang="ts">
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { selectedTaskStatuses, shouldShowTask } from '$lib/stores/taskFilter';
  import { taskSelection, type TaskSelectionState } from '$lib/stores/taskSelection';
  import { tasksService } from '$lib/api/tasks';
  import { nativeDrag, addDropIndicator, addNestHighlight, clearAllVisualFeedback } from '$lib/utils/native-drag-action';
  import type { DragSortEvent, DragMoveEvent } from '$lib/utils/native-drag-action';
  import { calculatePositionFromTarget as railsCalculatePosition } from '$lib/utils/position-calculator';
  import { ClientActsAsList as RailsClientActsAsList } from '$lib/utils/client-acts-as-list';
  import type { Task as RailsTask, DropZoneInfo, PositionUpdate } from '$lib/utils/position-calculator';
  import TaskInfoPopoverHeadless from '../tasks/TaskInfoPopoverHeadless.svelte';

  // Use static SVG URLs for better compatibility
  const chevronRight = '/icons/chevron-right.svg';
  const chevronDown = '/icons/chevron-down.svg';

  export let tasks: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    updated_at: string;
    parent_id?: string;
    subtasks_count?: number;
    depth?: number;
    position?: number;
  }> = [];
  
  export let jobId: string = 'test';
  export let batchTaskDetails: any = null; // Optional batch task details data

  // TEMP: Add static test tasks for nesting demo
  if (tasks.length === 0) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    tasks = [
      {
        id: 'task-1',
        title: 'First Task - Drag me onto another task to nest',
        status: 'new_task',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: 1,
        assigned_to: {
          id: 'user1',
          name: 'John Smith',
          initials: 'JS'
        },
        notes_count: 2
      },
      {
        id: 'task-2', 
        title: 'Second Task - Currently in progress with live timer',
        status: 'in_progress',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: 2,
        in_progress_since: oneHourAgo.toISOString(),
        accumulated_seconds: 30 * 60, // 30 minutes of previous work
        assigned_to: {
          id: 'user2',
          name: 'Alice Johnson',
          initials: 'AJ'
        }
      },
      {
        id: 'task-3',
        title: 'Third Task - Completed with total time',
        status: 'successfully_completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: 3,
        accumulated_seconds: 2 * 60 * 60 + 15 * 60, // 2 hours 15 minutes total
        notes_count: 1
      },
      {
        id: 'task-4',
        title: 'Fourth Task - Has notes but no assignment',
        status: 'new_task',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position: 4,
        notes_count: 3
      }
    ];
  }

  // Track collapsed/expanded state of tasks with subtasks
  let expandedTasks = new Set<string>();
  let hasAutoExpanded = false;
  
  // Drag & drop state
  let isDragging = false;
  let feedback = '';
  
  // Development alerts state
  let developmentAlerts: Array<{
    id: string;
    type: string;
    message: string;
    details?: any;
    timestamp: number;
    actions?: Array<{label: string, action: () => void}>;
  }> = [];
  
  // Development environment detection
  const isDevelopment = import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
  
  // Multi-select state
  let flatTaskIds: string[] = [];
  
  // Track optimistic updates for rollback
  let optimisticUpdates = new Map<string, { originalPosition: number; originalParentId?: string }>();
  
  // Rails-compatible client-side acts_as_list implementation
  class ClientActsAsList {
    // Apply position updates using validated Rails-compatible logic
    static applyPositionUpdates(tasks: any[], positionUpdates: Array<{id: string, position: number, parent_id?: string}>): any[] {
      // Convert to Rails task format
      const railsTasks: RailsTask[] = tasks.map(t => ({
        id: t.id,
        position: t.position,
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
  let showNewTaskInput = false;
  let newTaskTitle = '';
  let newTaskInput: HTMLInputElement;
  let isCreatingTask = false;
  

  // Organize tasks into hierarchical structure with filtering
  function organizeTasksHierarchically(taskList: typeof tasks, filterStatuses: string[]) {
    const taskMap = new Map();
    const rootTasks: any[] = [];
    
    // First pass: create map of all tasks
    taskList.forEach(task => {
      taskMap.set(task.id, {
        ...task,
        subtasks: []
      });
    });
    
    // Second pass: organize into hierarchy and apply filtering
    taskList.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id);
      
      // Apply filter - only include tasks that should be shown
      if (!shouldShowTask(task, filterStatuses)) {
        return;
      }
      
      if (task.parent_id && taskMap.has(task.parent_id)) {
        // Only add to parent if parent is also visible
        const parent = taskMap.get(task.parent_id);
        if (shouldShowTask(parent, filterStatuses)) {
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

  $: hierarchicalTasks = organizeTasksHierarchically(tasks, $selectedTaskStatuses);
  
  // Auto-expand ALL tasks that have subtasks by default (only once on initial load)
  $: {
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
      expandedTasks = expandedTasks;
      hasAutoExpanded = true;
    }
  }
  
  // Make rendering reactive to expandedTasks state changes
  $: flattenedTasks = (() => {
    const _ = expandedTasks; 
    return hierarchicalTasks.flatMap(task => renderTaskTree(task, 0));
  })();
  
  // Update flat task IDs for multi-select functionality
  $: flatTaskIds = flattenedTasks.map(item => item.task.id);

  // Reference to the tasks container element for drag action updates
  let tasksContainer: HTMLElement;
  let dragActionInstance: any;

  // Store action instance for manual updates
  function storeDragAction(node: HTMLElement, options: any) {
    dragActionInstance = nativeDrag(node, options);
    return dragActionInstance;
  }

  // Trigger drag action update when flattened tasks change (to handle new grandchildren)
  $: if (dragActionInstance && flattenedTasks) {
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

  function toggleTaskExpansion(taskId: string) {
    if (expandedTasks.has(taskId)) {
      expandedTasks.delete(taskId);
    } else {
      expandedTasks.add(taskId);
    }
    expandedTasks = expandedTasks;
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
  function formatTimeDuration(seconds: number): string {
    if (!seconds || seconds === 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours >= 1) {
      return `${hours.toFixed(1)}h`;
    } else {
      return `${Math.floor(minutes)}m`;
    }
  }

  function calculateCurrentDuration(task: any): number {
    if (task.status !== 'in_progress' || !task.in_progress_since) {
      return task.accumulated_seconds || 0;
    }
    
    const startTime = new Date(task.in_progress_since).getTime();
    const currentTime = Date.now();
    const currentSessionSeconds = Math.floor((currentTime - startTime) / 1000);
    
    return (task.accumulated_seconds || 0) + currentSessionSeconds;
  }

  // Update time tracking display every second for in-progress tasks
  import { onMount, onDestroy, tick } from 'svelte';
  
  let timeTrackingInterval: any;
  let currentTime = Date.now();

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
      taskSelection.selectRange(taskId, flatTaskIds);
    } else if (event.ctrlKey || event.metaKey) {
      taskSelection.toggleTask(taskId);
    } else {
      taskSelection.selectTask(taskId);
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

  // Determine selection position classes for consecutive selections
  function getSelectionPositionClass(taskId: string, index: number, taskSelectionState: any): string {
    if (!taskSelectionState.selectedTaskIds.has(taskId)) return '';
    
    const prevTask = flattenedTasks[index - 1];
    const nextTask = flattenedTasks[index + 1];
    
    const prevSelected = prevTask && taskSelectionState.selectedTaskIds.has(prevTask.task.id);
    const nextSelected = nextTask && taskSelectionState.selectedTaskIds.has(nextTask.task.id);
    
    if (prevSelected && nextSelected) return 'selection-middle';
    if (prevSelected) return 'selection-bottom';
    if (nextSelected) return 'selection-top';
    
    return '';
  }

  // New task creation handlers
  function showNewTaskForm() {
    showNewTaskInput = true;
    setTimeout(() => {
      if (newTaskInput) {
        newTaskInput.focus();
      }
    }, 0);
  }

  function hideNewTaskForm() {
    showNewTaskInput = false;
    newTaskTitle = '';
  }

  async function createNewTask() {
    if (!newTaskTitle.trim() || isCreatingTask) return;
    
    isCreatingTask = true;
    const title = newTaskTitle.trim();
    
    try {
      const response = await tasksService.createTask(jobId, {
        title,
        status: 'new_task',
        position: tasks.length + 1
      });
      
      // Add the new task to our local tasks array
      tasks = [...tasks, response.task];
      
      // Clear the form
      hideNewTaskForm();
      
      feedback = 'Task created successfully!';
      setTimeout(() => feedback = '', 2000);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      feedback = 'Failed to create task - please try again';
      setTimeout(() => feedback = '', 3000);
    } finally {
      isCreatingTask = false;
    }
  }

  async function handleNewTaskKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      await createNewTask();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hideNewTaskForm();
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

  // Task status change handler with optimistic updates
  async function handleStatusChange(taskId: string, newStatus: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const originalStatus = task.status;
    
    // Optimistic update
    task.status = newStatus;
    tasks = [...tasks];
    
    try {
      await tasksService.updateTaskStatus(jobId, taskId, newStatus);
    } catch (error: any) {
      // Rollback on error
      task.status = originalStatus;
      tasks = [...tasks];
      console.error('Failed to update status:', error);
      
      if (error.code === 'INVALID_CSRF_TOKEN') {
        feedback = 'Session expired - please try again';
      } else {
        feedback = 'Failed to update task status - please try again';
      }
      setTimeout(() => feedback = '', 3000);
    }
  }

  // SortableJS event handlers
  function handleSortStart(event: DragSortEvent) {
    isDragging = true;
    
    // Check for multi-select drag
    const selectedCount = $taskSelection.selectedTaskIds.size;
    const draggedTaskId = event.item.dataset.taskId;
    
    if (draggedTaskId && $taskSelection.selectedTaskIds.has(draggedTaskId) && selectedCount > 1) {
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
    
    // Clear all visual feedback
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

    // Let native-drag-action handle visual feedback, but validate nesting
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

  // Handle nesting a task under another task
  async function handleTaskNesting(draggedTaskId: string, targetTaskId: string) {
    console.log(`🪆 Attempting to nest ${draggedTaskId.substring(0,8)} under ${targetTaskId.substring(0,8)}`);
    
    // Validate nesting operation
    const validation = isValidNesting(draggedTaskId, targetTaskId);
    console.log(`🔍 Nesting validation result:`, validation);
    
    if (!validation.valid) {
      console.log(`❌ Nesting blocked: ${validation.reason}`);
      feedback = validation.reason || 'Invalid nesting operation';
      setTimeout(() => feedback = '', 3000);
      return;
    }
    
    console.log(`✅ Nesting validation passed, proceeding with operation`);

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask) {
      console.error('Could not find dragged or target task');
      return;
    }

    // Store original state for rollback
    optimisticUpdates.set(draggedTaskId, {
      originalPosition: draggedTask.position || 0,
      originalParentId: draggedTask.parent_id
    });

    try {
      // Calculate position at the end of target's existing children
      const existingChildren = tasks.filter(t => 
        t.parent_id === targetTaskId && 
        t.id !== draggedTaskId // Exclude the task being moved
      );
      
      const newPosition = existingChildren.length > 0 
        ? Math.max(...existingChildren.map(t => t.position)) + 1
        : 1;

      // Optimistic update: make task a child of target at the end
      const updatedTask = { ...draggedTask, parent_id: targetTaskId, position: newPosition };
      tasks = tasks.map(t => t.id === draggedTaskId ? updatedTask : t);

      // Auto-expand the target task to make the newly nested child visible
      if (!expandedTasks.has(targetTaskId)) {
        expandedTasks.add(targetTaskId);
        expandedTasks = expandedTasks; // Trigger Svelte reactivity
      }

      // Call API to nest the task
      await tasksService.nestTask(jobId, draggedTaskId, targetTaskId, newPosition);
      
      // Clear optimistic updates on success
      optimisticUpdates.clear();
      
    } catch (error: any) {
      console.error('Failed to nest task:', error);
      
      // Rollback optimistic update
      const original = optimisticUpdates.get(draggedTaskId);
      if (original) {
        const rolledBackTask = {
          ...draggedTask,
          position: original.originalPosition,
          parent_id: original.originalParentId
        };
        tasks = tasks.map(t => t.id === draggedTaskId ? rolledBackTask : t);
      }
      
      optimisticUpdates.clear();
      feedback = 'Failed to nest task - please try again';
      setTimeout(() => feedback = '', 3000);
    }
  }

  async function handleTaskReorder(event: DragSortEvent) {
    const draggedTaskId = event.item.dataset.taskId;
    if (!draggedTaskId) return;

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
      const isMultiSelectNest = $taskSelection.selectedTaskIds.has(draggedTaskId) && $taskSelection.selectedTaskIds.size > 1;
      if (!isMultiSelectNest) {
        await handleTaskNesting(draggedTaskId, event.dropZone.targetTaskId);
        return;
      }
      
      // Handle multi-task nesting here (will be processed by the multi-select logic below)
      console.log('🪆 Multi-task nesting detected, processing with multi-select logic');
    }

    // Determine if this is a multi-select drag
    const isMultiSelectDrag = $taskSelection.selectedTaskIds.has(draggedTaskId) && $taskSelection.selectedTaskIds.size > 1;
    
    let positionUpdates: Array<{id: string, position: number, parent_id?: string}> = [];
    
    if (isMultiSelectDrag) {
      // Handle multi-select drag with hierarchical parent assignment
      const selectedTaskIds = Array.from($taskSelection.selectedTaskIds);
      
      // Sort selected tasks by their current visual order to preserve relative order
      selectedTaskIds.sort((a, b) => {
        const taskA = tasks.find(t => t.id === a);
        const taskB = tasks.find(t => t.id === b);
        const flattenedA = flattenedTasks.find(item => item.task.id === a);
        const flattenedB = flattenedTasks.find(item => item.task.id === b);
        return (flattenedA?.visualIndex || 0) - (flattenedB?.visualIndex || 0);
      });
      
      const dropIndex = event.newIndex!;
      
      // Determine parent based on operation mode
      let newParentId: string | null;
      if (event.dropZone?.mode === 'nest' && event.dropZone.targetTaskId) {
        // For nesting: all tasks become children of the target task
        newParentId = event.dropZone.targetTaskId;
        console.log(`🪆 Multi-nesting: moving ${selectedTaskIds.length} tasks under ${newParentId?.substring(0,8)}`);
      } else if (event.dropZone?.mode === 'reorder' && event.dropZone.targetTaskId) {
        // For reordering: use target task's parent
        const targetTask = tasks.find(t => t.id === event.dropZone.targetTaskId);
        newParentId = targetTask?.parent_id || null;
      } else {
        newParentId = calculateParentFromPosition(dropIndex, event.dropZone?.mode || 'reorder');
      }
      
      // Calculate base position within the new parent
      let newPosition: number;
      if (event.dropZone?.mode === 'nest') {
        // For nesting: position at the end of existing children
        const existingChildren = tasks.filter(t => 
          t.parent_id === newParentId && 
          !selectedTaskIds.includes(t.id) // Exclude tasks being moved
        );
        newPosition = existingChildren.length > 0 
          ? Math.max(...existingChildren.map(t => t.position)) + 1
          : 1;
        
        // Auto-expand the target task to show newly nested children
        if (newParentId && !expandedTasks.has(newParentId)) {
          expandedTasks.add(newParentId);
          expandedTasks = expandedTasks; // Trigger Svelte reactivity
        }
      } else {
        // For reordering: use existing position calculation
        newPosition = calculatePositionFromTarget(event.dropZone, newParentId, selectedTaskIds);
      }
      
      // Update all selected tasks with consecutive positions maintaining their relative order
      selectedTaskIds.forEach((taskId, index) => {
        optimisticUpdates.set(taskId, {
          originalPosition: tasks.find(t => t.id === taskId)?.position || 0,
          originalParentId: tasks.find(t => t.id === taskId)?.parent_id
        });
        
        positionUpdates.push({
          id: taskId,
          position: newPosition + index,
          parent_id: newParentId
        });
      });
      
    } else {
      // Handle single task drag with hierarchical parent assignment
      const dropIndex = event.newIndex!;
      
      // For reorder operations, use target task's parent; for nest operations, calculate parent
      let newParentId: string | null;
      if (event.dropZone?.mode === 'reorder' && event.dropZone.targetTaskId) {
        const targetTask = tasks.find(t => t.id === event.dropZone.targetTaskId);
        newParentId = targetTask?.parent_id || null;
      } else {
        newParentId = calculateParentFromPosition(dropIndex, event.dropZone?.mode || 'reorder');
      }
      
      // Calculate position within the new parent using the target task's position
      const newPosition = calculatePositionFromTarget(event.dropZone, newParentId, [draggedTaskId]);
      
      
      optimisticUpdates.set(draggedTaskId, {
        originalPosition: tasks.find(t => t.id === draggedTaskId)?.position || 0,
        originalParentId: tasks.find(t => t.id === draggedTaskId)?.parent_id
      });
      
      positionUpdates.push({
        id: draggedTaskId,
        position: newPosition,
        parent_id: newParentId
      });
    }
    
    // 🔮 Client-side position prediction BEFORE server call
    const taskStateBeforeOperation = tasks.map(t => ({...t})); // Deep snapshot
    const clientPredictedPositions = ClientActsAsList.predictServerPositions(tasks, positionUpdates);
    
    console.log('🔮 Client position prediction:', {
      positionUpdates,
      predictedFinalPositions: Object.fromEntries(clientPredictedPositions),
      tasksBeforeOperation: taskStateBeforeOperation.map(t => ({ id: t.id, position: t.position, parent_id: t.parent_id }))
    });
    
    // Apply client-side position calculation immediately
    tasks = ClientActsAsList.applyPositionUpdates(tasks, positionUpdates);
    
    console.log('🎯 Client state updated:', {
      newTaskPositions: tasks.map(t => ({ id: t.id, position: t.position, parent_id: t.parent_id }))
    });
    
    try {
      console.log('📡 Sending position updates to server:', {
        jobId,
        positionUpdates,
        draggedTaskId,
        dropZone: event.dropZone
      });
      
      // Send batch reorder to server  
      const serverResponse = await tasksService.batchReorderTasks(jobId, { positions: positionUpdates });
      
      console.log('✅ Server update successful', serverResponse);
      
      // 🔍 Compare client prediction vs server reality
      await compareClientVsServer(clientPredictedPositions, taskStateBeforeOperation, positionUpdates, event);
      
      // Clear optimistic updates on success
      optimisticUpdates.clear();
      
    } catch (error: any) {
      console.error('Failed to reorder tasks:', error);
      
      // Rollback optimistic updates
      tasks = tasks.map(task => {
        const original = optimisticUpdates.get(task.id);
        if (original) {
          return {
            ...task,
            position: original.originalPosition,
            parent_id: original.originalParentId
          };
        }
        return task;
      });
      
      optimisticUpdates.clear();
    }
  }
  
  // Compare client predictions with server results
  async function compareClientVsServer(
    clientPredictions: Map<string, number>, 
    taskStateBeforeOperation: any[], 
    positionUpdates: Array<{id: string, position: number, parent_id?: string}>,
    dragEvent: DragSortEvent
  ) {
    try {
      // Fetch fresh task data from server to see actual results
      const response = await fetch(`/api/v1/jobs/${jobId}/tasks/batch_details`);
      const serverData = await response.json();
      
      // Extract actual server positions
      const serverPositions = new Map<string, number>();
      serverData.data.forEach((task: any) => {
        serverPositions.set(task.id, task.attributes.position);
      });
      
      // Find differences between client predictions and server reality
      const differences: Array<{taskId: string, clientPrediction: number, serverActual: number, difference: number}> = [];
      
      clientPredictions.forEach((clientPos, taskId) => {
        const serverPos = serverPositions.get(taskId);
        if (serverPos !== undefined && clientPos !== serverPos) {
          differences.push({
            taskId,
            clientPrediction: clientPos,
            serverActual: serverPos,
            difference: serverPos - clientPos
          });
        }
      });
      
      if (differences.length > 0) {
        const maxDifference = Math.max(...differences.map(d => Math.abs(d.difference)));
        const patternAnalysis = analyzePositionPattern(differences);
        
        console.group('🚨 CLIENT/SERVER POSITION MISMATCH DETECTED');
        console.log('📊 Differences found:', differences);
        console.log('🎯 Drag operation context:', {
          draggedTaskId: dragEvent.item.dataset.taskId,
          dropZone: dragEvent.dropZone,
          oldIndex: dragEvent.oldIndex,
          newIndex: dragEvent.newIndex
        });
        console.log('📋 Task state before operation:', taskStateBeforeOperation.map(t => ({ 
          id: t.id, 
          position: t.position, 
          parent_id: t.parent_id,
          title: t.title?.substring(0, 20) + '...' 
        })));
        console.log('🔄 Position updates sent:', positionUpdates);
        console.log('🔮 Client predictions:', Object.fromEntries(clientPredictions));
        console.log('📡 Server actual results:', Object.fromEntries(serverPositions));
        console.log('⚠️ Analysis:', {
          totalDifferences: differences.length,
          maxDifference,
          avgDifference: differences.reduce((sum, d) => sum + Math.abs(d.difference), 0) / differences.length,
          patternAnalysis
        });
        console.groupEnd();
        
        // Show development user alert
        showDevelopmentAlert({
          type: 'position-mismatch',
          message: `Position sync issue detected: ${differences.length} task${differences.length > 1 ? 's' : ''} affected (max difference: ${maxDifference})`,
          details: {
            differences,
            patternAnalysis,
            operationContext: {
              draggedTaskId: dragEvent.item.dataset.taskId,
              dropZone: dragEvent.dropZone
            }
          },
          actions: [
            { label: 'View Console', action: viewConsoleDetails },
            { label: 'Refresh Tasks', action: refreshTasks }
          ]
        });
      } else {
        console.log('✅ Client prediction matches server - no position discrepancies!');
      }
      
    } catch (error) {
      console.error('❌ Failed to compare client vs server positions:', error);
    }
  }
  
  // Analyze patterns in position differences to help debug
  function analyzePositionPattern(differences: Array<{taskId: string, clientPrediction: number, serverActual: number, difference: number}>): string {
    const diffs = differences.map(d => d.difference);
    const uniqueDiffs = [...new Set(diffs)];
    
    if (uniqueDiffs.length === 1) {
      return `All tasks off by same amount: ${uniqueDiffs[0]}`;
    } else if (diffs.every(d => d > 0)) {
      return 'All server positions higher than client predictions';
    } else if (diffs.every(d => d < 0)) {
      return 'All server positions lower than client predictions';
    } else {
      return 'Mixed pattern - some higher, some lower';
    }
  }
  
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
  function calculateParentFromPosition(dropIndex: number, dropMode: 'reorder' | 'nest'): string | null {
    // If explicitly nesting, the target becomes the parent
    if (dropMode === 'nest') {
      const targetItem = flattenedTasks[dropIndex];
      return targetItem?.task.id || null;
    }
    
    // For reordering, determine parent based on the depth we're inserting at
    // If dropping at the very beginning, it's root level
    if (dropIndex === 0) {
      return null;
    }
    
    // Look at the task immediately before the drop position
    const previousItem = flattenedTasks[dropIndex - 1];
    if (!previousItem) {
      return null; // Root level
    }
    
    // Also look at the task at the drop position (if it exists)
    const targetItem = flattenedTasks[dropIndex];
    
    // Enhanced root level detection: if previous item is at depth 0, we're likely at root level too
    if (previousItem.depth === 0) {
      return null;
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

  // Calculate position for acts_as_list using validated Rails-compatible logic
  function calculatePositionFromTarget(dropZone: DropZoneInfo | null, parentId: string | null, draggedTaskIds: string[]): number {
    // Resolve any boundary ambiguity
    const resolvedDropZone = resolveParentChildBoundary(dropZone);
    
    console.log('🎯 calculatePositionFromTarget called (Rails-compatible):', {
      dropZone,
      resolvedDropZone,
      parentId,
      draggedTaskIds
    });
    
    // Convert Svelte tasks to Rails task format
    const railsTasks: RailsTask[] = tasks.map(t => ({
      id: t.id,
      position: t.position,
      parent_id: t.parent_id || null
    }));
    
    // Use the Rails-compatible position calculator
    const result = railsCalculatePosition(railsTasks, resolvedDropZone, parentId, draggedTaskIds);
    
    console.log('🎯 Rails-compatible calculation result:', {
      calculatedPosition: result.calculatedPosition,
      reasoning: result.reasoning
    });
    
    return result.calculatedPosition;
  }
  
</script>

<div class="task-list">
  <!-- New Task Creation UI -->
  <div class="new-task-section">
    {#if showNewTaskInput}
      <div class="new-task-input-container">
        <div class="task-status-placeholder">
          <span class="status-emoji">✨</span>
        </div>
        <input
          bind:this={newTaskInput}
          bind:value={newTaskTitle}
          class="new-task-input"
          placeholder="Task title..."
          on:keydown={handleNewTaskKeydown}
          on:blur={hideNewTaskForm}
          disabled={isCreatingTask}
        />
        {#if isCreatingTask}
          <div class="creating-indicator">
            <span class="spinner">⏳</span>
          </div>
        {/if}
      </div>
    {:else}
      <button 
        class="new-task-placeholder"
        on:click={showNewTaskForm}
        disabled={isCreatingTask}
      >
        <div class="task-status-placeholder">
          <span class="status-emoji">➕</span>
        </div>
        <div class="placeholder-text">New task...</div>
      </button>
    {/if}
  </div>

  {#if tasks.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h4>No tasks yet</h4>
      <p>Click "New task..." above to add your first task.</p>
    </div>
  {:else}
    <!-- Sortable tasks container -->
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
      {#each flattenedTasks as renderItem, index (renderItem.task.id)}
        <div 
          class="task-item"
          class:completed={renderItem.task.status === 'successfully_completed'}
          class:in-progress={renderItem.task.status === 'in_progress'}
          class:cancelled={renderItem.task.status === 'cancelled' || renderItem.task.status === 'failed'}
          class:has-subtasks={renderItem.hasSubtasks}
          class:selected={$taskSelection.selectedTaskIds.has(renderItem.task.id)}
          class:task-selected-for-drag={$taskSelection.selectedTaskIds.has(renderItem.task.id)}
          class:multi-select-active={$taskSelection.isMultiSelectActive}
          class:selection-top={getSelectionPositionClass(renderItem.task.id, index, $taskSelection) === 'selection-top'}
          class:selection-middle={getSelectionPositionClass(renderItem.task.id, index, $taskSelection) === 'selection-middle'}
          class:selection-bottom={getSelectionPositionClass(renderItem.task.id, index, $taskSelection) === 'selection-bottom'}
          style="--depth: {renderItem.depth || 0}"
          data-task-id={renderItem.task.id}
          role="button"
          tabindex="0"
          aria-label="Task: {renderItem.task.title}. {$taskSelection.selectedTaskIds.has(renderItem.task.id) ? 'Selected' : 'Not selected'}. Click to select, Shift+click for range selection, Ctrl/Cmd+click to toggle."
          on:click={(e) => handleTaskClick(e, renderItem.task.id)}
          on:keydown={(e) => handleTaskKeydown(e, renderItem.task.id)}
        >
          <!-- Disclosure Triangle (if has subtasks) -->
          {#if renderItem.hasSubtasks}
            <button 
              class="disclosure-button"
              on:click|stopPropagation={() => toggleTaskExpansion(renderItem.task.id)}
              aria-expanded={renderItem.isExpanded}
              aria-label={renderItem.isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              <img 
                src={chevronRight} 
                alt={renderItem.isExpanded ? 'Expanded' : 'Collapsed'}
                class="chevron-icon"
              />
            </button>
          {:else}
            <div class="disclosure-spacer"></div>
          {/if}

          <!-- Task Status Button -->
          <div class="task-status">
            <button 
              class="status-emoji"
              on:click|stopPropagation={() => {
                const statusCycle = ['new_task', 'in_progress', 'successfully_completed'];
                const currentIndex = statusCycle.indexOf(renderItem.task.status);
                const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
                handleStatusChange(renderItem.task.id, nextStatus);
              }}
              title="Click to change status"
            >
              {getTaskStatusEmoji(renderItem.task.status)}
            </button>
          </div>
          
          <!-- Task Content -->
          <div class="task-content">
            <h5 class="task-title">{renderItem.task.title}</h5>
            
            <!-- Time Tracking Display -->
            {#if renderItem.task.status === 'in_progress' || (renderItem.task.accumulated_seconds && renderItem.task.accumulated_seconds > 0)}
              {@const _ = currentTime} <!-- Force reactivity on time changes -->
              {@const duration = calculateCurrentDuration(renderItem.task)}
              {@const formattedTime = formatTimeDuration(duration)}
              {#if formattedTime}
                <div class="time-tracking">
                  <span class="time-icon">⏱️</span>
                  <span class="time-duration" class:in-progress={renderItem.task.status === 'in_progress'}>
                    {formattedTime}
                  </span>
                </div>
              {/if}
            {/if}
          </div>

          <!-- Task Metadata (Assignment & Notes) -->
          <div class="task-metadata">
            <!-- Assignment Indicator -->
            {#if renderItem.task.assigned_to}
              <div class="assigned-indicator" title="Assigned to {renderItem.task.assigned_to.name}">
                <span class="assignee-initials">{renderItem.task.assigned_to.initials}</span>
              </div>
            {/if}

            <!-- Notes Indicator -->
            {#if renderItem.task.notes_count && renderItem.task.notes_count > 0}
              <div class="notes-indicator" title="{renderItem.task.notes_count} note{renderItem.task.notes_count > 1 ? 's' : ''}">
                <span class="notes-icon">📝</span>
                <span class="notes-count">{renderItem.task.notes_count}</span>
              </div>
            {/if}
          </div>

          <!-- Task Actions -->
          <div class="task-actions">
            <TaskInfoPopoverHeadless 
              task={renderItem.task}
              {jobId}
              {batchTaskDetails}
              on:task-updated={handleTaskUpdated}
            />
          </div>
        </div>
      {/each}
    </div>

    <!-- Error feedback only -->
    {#if feedback && feedback.includes('Failed')}
      <div class="task-list-footer">
        <div class="feedback-message error">
          {feedback}
        </div>
      </div>
    {/if}

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
          <button class="alert-dismiss" on:click={() => dismissDevelopmentAlert(alert.id)}>×</button>
        </div>
        
        {#if alert.details?.patternAnalysis}
          <div class="alert-details">
            <strong>Pattern:</strong> {alert.details.patternAnalysis}
          </div>
        {/if}
        
        {#if alert.actions}
          <div class="alert-actions">
            {#each alert.actions as action}
              <button class="alert-action-button" on:click={action.action}>
                {action.label}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
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

  .task-item {
    display: flex;
    align-items: flex-start;
    padding: 4px !important;
    padding-left: calc(4px + (var(--depth, 0) * 32px)) !important;
    border: none !important;
    border-radius: 8px !important;
    background: none !important;
    background-color: transparent !important;
    transition: all 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    user-select: none;
    position: relative;
    will-change: transform;
  }

  /* SortableJS classes */
  .task-item.task-ghost {
    opacity: 0.5;
    background-color: rgba(0, 122, 255, 0.1) !important;
  }

  .task-item.task-chosen {
    /* Removed opacity to eliminate dimming effect when clicking task rows */
  }

  .task-item.task-dragging {
    opacity: 0.9;
    transform: rotate(5deg);
    z-index: 1000;
  }

  .task-item.task-selected-for-drag {
    background-color: rgba(0, 122, 255, 0.2) !important;
  }

  /* Selection state styling */
  .task-item.selected {
    background-color: var(--accent-blue) !important;
    color: white !important;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75);
  }

  .task-item.multi-select-active.selected {
    background-color: var(--accent-blue) !important;
    color: white !important;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75);
  }

  .task-item.task-selected-for-drag {
    background-color: var(--accent-blue) !important;
    color: white !important;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75);
  }

  /* Consecutive selection styling */
  .task-item.selected.selection-middle {
    border-radius: 0 !important;
  }

  .task-item.selected.selection-top {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }

  .task-item.selected.selection-bottom {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }

  .task-item.completed .task-title,
  .task-item.completed .task-content {
    opacity: 0.75;
    color: #8E8E93;
  }

  .task-item.cancelled .task-title,
  .task-item.cancelled .task-content {
    opacity: 0.75;
    color: #8E8E93;
    text-decoration: line-through;
    text-decoration-color: #8E8E93;
    text-decoration-thickness: 1px;
  }

  .task-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .disclosure-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text-tertiary);
    transition: transform 0.2s ease;
  }

  .disclosure-button:hover {
    opacity: 0.8;
  }

  .chevron-icon {
    width: 12px;
    height: 12px;
    opacity: 0.7;
    transition: transform 0.2s ease;
    transform: rotate(0deg);
  }
  
  .disclosure-button[aria-expanded="true"] .chevron-icon {
    transform: rotate(90deg);
  }

  .disclosure-spacer {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .task-status {
    flex-shrink: 0;
    padding-top: 2px;
    position: relative;
    margin-right: 8px;
  }

  .status-emoji {
    font-size: 14px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .status-emoji:hover {
    opacity: 0.8;
  }

  .task-title {
    font-size: 17px;
    color: #FFFFFF;
    margin: 0;
    margin-bottom: 2px;
    word-wrap: break-word;
    font-weight: 400;
    line-height: 1.3;
    cursor: text;
    outline: none;
    display: inline-block;
    min-width: 75px;
    width: fit-content;
    max-width: 100%;
    user-select: text;
  }

  .task-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    pointer-events: none;
  }

  .task-actions > * {
    pointer-events: auto;
  }

  .task-action-button {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: none;
    border: none;
    color: var(--accent-blue);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    opacity: 0;
    pointer-events: none;
  }

  .task-item:hover .task-action-button {
    opacity: 0.7;
    pointer-events: auto;
  }

  .task-action-button:hover {
    opacity: 1 !important;
  }

  .task-action-button:active {
    transform: scale(0.95);
  }

  .task-action-button:disabled {
    opacity: 0;
    cursor: not-allowed;
  }

  .action-icon {
    font-size: 18px;
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

  .feedback-message {
    background-color: rgba(50, 215, 75, 0.2);
    color: var(--accent-green, #32D74B);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid rgba(50, 215, 75, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  .feedback-message.error {
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

  /* Visual feedback for drag & drop nesting */
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
    .task-item {
      padding: 4px !important;
    }

    .task-title {
      font-size: 16px;
    }

    .empty-state {
      padding: 32px 16px;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }
  }

  @media (max-width: 480px) {
    .task-title {
      font-size: 15px;
    }

    .disclosure-button,
    .disclosure-spacer {
      width: 16px;
      height: 16px;
    }

    .status-emoji {
      width: 18px;
      height: 18px;
      font-size: 12px;
    }

    .task-action-button {
      width: 20px;
      height: 20px;
    }

    .action-icon {
      font-size: 12px;
    }
  }

  /* Touch support for tablets */
  @media (hover: none) and (pointer: coarse) {
    .task-item {
      min-height: 44px;
      touch-action: manipulation;
    }
    
    .status-emoji {
      min-width: 44px;
      min-height: 44px;
    }
    
    .disclosure-button {
      min-width: 44px;
      min-height: 44px;
    }
    
    .task-action-button {
      opacity: 0.7;
      pointer-events: auto;
    }
    
    .task-item::before {
      content: '⋮⋮';
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-tertiary);
      font-size: 16px;
      opacity: 0.5;
      pointer-events: none;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .task-item:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }

    .task-action-button {
      border: 1px solid var(--border-primary);
    }
    
    .task-item.selected {
      background-color: var(--accent-blue) !important;
      color: white !important;
      text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75);
    }
  }

  /* New Task Creation Styles */
  .new-task-section {
    margin-bottom: 16px;
  }

  .new-task-placeholder {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px dashed var(--border-primary);
    border-radius: 8px;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 14px;
  }

  .new-task-placeholder:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-blue);
    color: var(--text-secondary);
  }

  .new-task-placeholder:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .new-task-input-container {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 2px solid var(--accent-blue);
    border-radius: 8px;
    box-shadow: 0 0 0 2px rgba(0, 163, 255, 0.2);
  }

  .task-status-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    flex-shrink: 0;
  }

  .task-status-placeholder .status-emoji {
    font-size: 14px;
  }

  .new-task-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    padding: 0;
  }

  .new-task-input::placeholder {
    color: var(--text-tertiary);
  }

  .placeholder-text {
    color: var(--text-tertiary);
    font-size: 14px;
  }

  .creating-indicator {
    display: flex;
    align-items: center;
    color: var(--text-secondary);
  }

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
  .status-emoji,
  .task-action-button,
  .new-task-placeholder {
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
</style>