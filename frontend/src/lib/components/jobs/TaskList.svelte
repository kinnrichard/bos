<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { selectedTaskStatuses, shouldShowTask } from '$lib/stores/taskFilter';
  import { taskSelection, type TaskSelectionState } from '$lib/stores/taskSelection';
  import { tasksService } from '$lib/api/tasks';
  import { nativeDrag, addDropIndicator, addNestHighlight, clearAllVisualFeedback } from '$lib/utils/native-drag-action';
  import type { DragSortEvent, DragMoveEvent } from '$lib/utils/native-drag-action';
  import { calculateRelativePositionFromTarget, calculatePositionFromTarget as railsCalculatePosition } from '$lib/utils/position-calculator';
  import { ClientActsAsList as RailsClientActsAsList } from '$lib/utils/client-acts-as-list';
  import type { Task as RailsTask, DropZoneInfo, PositionUpdate, RelativePositionUpdate } from '$lib/utils/position-calculator';
  import TaskInfoPopoverHeadless from '../tasks/TaskInfoPopoverHeadless.svelte';
  import Portal from '../ui/Portal.svelte';

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
  
  // Outside click and keyboard handling for task deselection
  let taskListContainer: HTMLElement;

  function handleOutsideClick(event: MouseEvent) {
    // Don't deselect if:
    // - No tasks are selected
    // - Modifier keys are held (for multi-select)
    // - Clicking within task elements
    if (!$taskSelection.selectedTaskIds.size ||
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
      taskSelection.clearSelection();
    }
  }

  // Arrow key navigation for single task selection
  function handleArrowNavigation(direction: 'up' | 'down') {
    if ($taskSelection.selectedTaskIds.size !== 1) return;
    
    const currentTaskId = Array.from($taskSelection.selectedTaskIds)[0];
    const currentIndex = flatTaskIds.indexOf(currentTaskId);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (direction === 'up') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : flatTaskIds.length - 1; // Wrap to bottom
    } else {
      nextIndex = currentIndex < flatTaskIds.length - 1 ? currentIndex + 1 : 0; // Wrap to top
    }
    
    const nextTaskId = flatTaskIds[nextIndex];
    taskSelection.selectTask(nextTaskId);
    
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
                     activeElement?.isContentEditable ||
                     editingTaskId !== null ||
                     showInlineNewTaskInput;

    // ESC key handling
    if (event.key === 'Escape') {
      if (showInlineNewTaskInput) {
        // Cancel inline new task
        event.preventDefault();
        cancelInlineNewTask();
      } else if ($taskSelection.selectedTaskIds.size > 0 && !isEditing) {
        // Clear selection if not editing
        event.preventDefault();
        taskSelection.clearSelection();
        
        // Remove focus ring by blurring the currently focused element
        if (document.activeElement && document.activeElement !== document.body) {
          (document.activeElement as HTMLElement).blur();
        }
      }
    }

    // Arrow key navigation
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !isEditing) {
      const selectedCount = $taskSelection.selectedTaskIds.size;
      
      if (selectedCount === 0) {
        // No selection: down arrow selects first, up arrow selects last
        event.preventDefault(); // Prevent page scroll
        if (flatTaskIds.length > 0) {
          const taskId = event.key === 'ArrowDown' ? flatTaskIds[0] : flatTaskIds[flatTaskIds.length - 1];
          taskSelection.selectTask(taskId);
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
      const selectedCount = $taskSelection.selectedTaskIds.size;
      
      if (selectedCount === 0) {
        // No selection: activate bottom "New Task" row
        event.preventDefault();
        showNewTaskForm();
      } else if (selectedCount === 1) {
        // Single selection: check if it's the last task
        event.preventDefault();
        const selectedTaskId = Array.from($taskSelection.selectedTaskIds)[0];
        const selectedTaskIndex = flatTaskIds.indexOf(selectedTaskId);
        const isLastTask = selectedTaskIndex === flatTaskIds.length - 1;
        
        if (isLastTask) {
          // Last task selected: activate bottom "New Task" row (cleaner UX)
          taskSelection.clearSelection();
          showNewTaskForm();
        } else {
          // Not last task: create inline new task as sibling
          insertNewTaskAfter = selectedTaskId;
          showInlineNewTaskInput = true;
          inlineNewTaskTitle = '';
          taskSelection.clearSelection(); // Clear selection when creating new task
          
          // Focus inline input after DOM update
          tick().then(() => {
            if (inlineNewTaskInput) {
              inlineNewTaskInput.focus();
            }
          });
        }
      }
      // Multiple selections: do nothing
    }

    // Delete key for task deletion
    if ((event.key === 'Delete' || event.key === 'Backspace') && !isEditing) {
      const selectedCount = $taskSelection.selectedTaskIds.size;
      
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

  // Clean up any lingering visual feedback when component is destroyed
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
  
  // Task title editing state
  let editingTaskId: string | null = null;
  let editingTitle = '';
  let originalTitle = '';
  let titleInput: HTMLInputElement;
  
  // Inline new task state (for Return key with selection)
  let insertNewTaskAfter: string | null = null;
  let showInlineNewTaskInput = false;
  let inlineNewTaskTitle = '';
  let inlineNewTaskInput: HTMLInputElement;

  // Task deletion state
  let showDeleteConfirmationModal = false;
  let tasksToDelete: string[] = [];
  let isDeletingTasks = false;
  let deleteButton: HTMLButtonElement;
  let modalContainer: HTMLElement;
  let deletingTaskIds = new Set<string>();
  const animationDuration = 300; // ms for height collapse animation
  

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

  async function createNewTask(shouldSelectAfterCreate: boolean = false) {
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
      
      // Select the newly created task only if requested (Return key, not blur)
      if (shouldSelectAfterCreate) {
        taskSelection.selectTask(response.task.id);
      }
      
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
      await createNewTask(true); // Return key should select newly created task
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hideNewTaskForm();
    }
  }

  function handleNewTaskBlur() {
    // Save on blur if there's content, otherwise cancel
    if (newTaskTitle.trim() !== '' && !isCreatingTask) {
      createNewTask(false); // Blur should not select newly created task
    } else if (!isCreatingTask) {
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

  // Task title editing functions
  function handleTitleClick(event: MouseEvent, taskId: string, currentTitle: string) {
    event.stopPropagation(); // Prevent task selection
    taskSelection.clearSelection(); // Clear any existing selection when editing
    
    // Store click position for cursor positioning
    const clickX = event.clientX;
    const titleElement = event.target as HTMLElement;
    
    // Enter edit mode
    editingTaskId = taskId;
    editingTitle = currentTitle;
    originalTitle = currentTitle;
    
    // Focus the input after DOM update
    tick().then(() => {
      if (titleInput) {
        titleInput.focus();
        
        // Calculate cursor position based on click location
        try {
          // Get the title element's bounding box
          const titleRect = titleElement.getBoundingClientRect();
          const relativeX = clickX - titleRect.left;
          
          // Create a temporary span to measure text width
          const tempSpan = document.createElement('span');
          tempSpan.style.cssText = window.getComputedStyle(titleElement).cssText;
          tempSpan.style.position = 'absolute';
          tempSpan.style.visibility = 'hidden';
          tempSpan.style.whiteSpace = 'nowrap';
          document.body.appendChild(tempSpan);
          
          // Find the closest character position
          let bestPosition = 0;
          let bestDistance = Infinity;
          
          for (let i = 0; i <= currentTitle.length; i++) {
            tempSpan.textContent = currentTitle.substring(0, i);
            const textWidth = tempSpan.getBoundingClientRect().width;
            const distance = Math.abs(relativeX - textWidth);
            
            if (distance < bestDistance) {
              bestDistance = distance;
              bestPosition = i;
            }
          }
          
          // Clean up
          document.body.removeChild(tempSpan);
          
          // Set cursor position
          titleInput.setSelectionRange(bestPosition, bestPosition);
        } catch (e) {
          // Fallback if cursor positioning fails
          titleInput.setSelectionRange(editingTitle.length, editingTitle.length);
        }
      }
    });
  }

  async function saveTitle(taskId: string, newTitle: string) {
    if (newTitle.trim() === '' || newTitle === originalTitle) {
      cancelEdit();
      return;
    }

    try {
      const result = await tasksService.updateTask(jobId, taskId, { title: newTitle.trim() });
      
      if (result.status === 'success') {
        editingTaskId = null;
        editingTitle = '';
        originalTitle = '';
        
        // Use existing task update handler to maintain consistency
        handleTaskUpdated({ detail: result } as CustomEvent);
      }
    } catch (error) {
      console.error('Failed to update task title:', error);
      feedback = 'Failed to update task title - please try again';
      setTimeout(() => feedback = '', 3000);
      
      // Revert to original title
      editingTitle = originalTitle;
    }
  }

  function cancelEdit() {
    editingTaskId = null;
    editingTitle = '';
    originalTitle = '';
  }

  function handleEditKeydown(event: KeyboardEvent, taskId: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveTitle(taskId, editingTitle);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  }

  function handleEditBlur(taskId: string) {
    // Save on blur
    saveTitle(taskId, editingTitle);
  }

  // Inline new task functions
  async function createInlineTask(parentId: string | null, shouldSelectAfterCreate: boolean = false) {
    if (inlineNewTaskTitle.trim() === '') {
      cancelInlineNewTask();
      return;
    }

    try {
      isCreatingTask = true;
      
      // Build task data with relative positioning
      const taskData = { 
        title: inlineNewTaskTitle.trim(),
        parent_id: parentId
      };

      // Use relative positioning if inserting after a specific task
      if (insertNewTaskAfter) {
        taskData.after_task_id = insertNewTaskAfter;
      }
      // If no specific position, server will append at end automatically

      const result = await tasksService.createTask(jobId, taskData);
      
      if (result.status === 'success') {
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
                result.task,
                ...tasks.slice(nextTaskIndex)
              ];
            } else {
              // Fallback: append at end
              tasks = [...tasks, result.task];
            }
          } else {
            // Selected task is last in visual order, or not found - append at end
            tasks = [...tasks, result.task];
          }
        } else {
          // No specific position: append at end
          tasks = [...tasks, result.task];
        }
        
        // Clear inline state
        cancelInlineNewTask();
        
        // Update insertNewTaskAfter to point to the newly created task
        // This ensures subsequent new tasks will be positioned after this one
        insertNewTaskAfter = result.task.id;
        
        // Select the newly created task only if requested (Return key, not blur)
        if (shouldSelectAfterCreate) {
          taskSelection.selectTask(result.task.id);
        }
        
        feedback = 'Task created successfully';
        setTimeout(() => feedback = '', 2000);
      }
    } catch (error) {
      console.error('Failed to create inline task:', error);
      feedback = 'Failed to create task - please try again';
      setTimeout(() => feedback = '', 3000);
    } finally {
      isCreatingTask = false;
    }
  }

  function cancelInlineNewTask() {
    insertNewTaskAfter = null;
    showInlineNewTaskInput = false;
    inlineNewTaskTitle = '';
  }

  function handleInlineNewTaskKeydown(event: KeyboardEvent, parentId: string | null) {
    if (event.key === 'Enter') {
      event.preventDefault();
      createInlineTask(parentId, true); // Return key should select newly created task
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelInlineNewTask();
    }
  }

  function handleInlineNewTaskBlur(parentId: string | null) {
    // Save on blur, but only if not already creating a task (prevents double submission)
    if (!isCreatingTask) {
      createInlineTask(parentId, false); // Blur should not select newly created task
    }
  }

  // Task deletion functions
  async function showDeleteConfirmation() {
    tasksToDelete = Array.from($taskSelection.selectedTaskIds);
    showDeleteConfirmationModal = true;
    
    // Focus the modal container first to capture events, then the delete button
    await tick();
    if (modalContainer) {
      modalContainer.focus();
    }
    if (deleteButton) {
      deleteButton.focus();
    }
  }

  function cancelDeleteConfirmation() {
    showDeleteConfirmationModal = false;
    tasksToDelete = [];
    
    // Return focus to task list container
    if (taskListContainer) {
      taskListContainer.focus();
    }
  }

  function handleModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelDeleteConfirmation();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!isDeletingTasks) {
        confirmDeleteTasks();
      }
    }
  }

  async function confirmDeleteTasks() {
    if (tasksToDelete.length === 0 || isDeletingTasks) return;

    isDeletingTasks = true;
    const tasksToDeleteCopy = [...tasksToDelete]; // Copy for async operations

    try {
      // Phase 1: Close modal and return focus first
      showDeleteConfirmationModal = false;
      
      // Return focus to task list container
      if (taskListContainer) {
        taskListContainer.focus();
      }

      // Clear selection
      taskSelection.clearSelection();

      // Phase 2: Start deletion animation by marking tasks as deleting
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.add(taskId);
      });
      
      // Trigger reactivity
      deletingTaskIds = deletingTaskIds;

      // Delete tasks in parallel while animation is running
      const deletePromises = tasksToDeleteCopy.map(taskId => 
        tasksService.deleteTask(jobId, taskId)
      );

      // Wait for both API calls and animation to complete
      const [, ] = await Promise.all([
        Promise.all(deletePromises),
        new Promise(resolve => setTimeout(resolve, animationDuration))
      ]);

      // Phase 3: Remove tasks from UI after animation completes
      tasks = tasks.filter(task => !tasksToDeleteCopy.includes(task.id));

      // Clear deletion animation state
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = deletingTaskIds;

      // Show success feedback
      feedback = `Successfully deleted ${deletePromises.length} task${deletePromises.length === 1 ? '' : 's'}`;
      setTimeout(() => feedback = '', 3000);

    } catch (error: any) {
      console.error('Failed to delete tasks:', error);
      
      // Clear animation state on error
      tasksToDeleteCopy.forEach(taskId => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = deletingTaskIds;
      
      feedback = `Failed to delete tasks: ${error.message || 'Unknown error'}`;
      setTimeout(() => feedback = '', 5000);
    } finally {
      isDeletingTasks = false;
      tasksToDelete = []; // Clear the original array
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

      // Calculate relative position for nesting
      const relativePosition = calculateRelativePosition(null, targetTaskId, [draggedTaskId]);
      
      // Call API to nest the task using relative positioning
      if (relativePosition.before_task_id) {
        await tasksService.nestTaskRelative(jobId, draggedTaskId, targetTaskId, {
          before_task_id: relativePosition.before_task_id
        });
      } else if (relativePosition.after_task_id) {
        await tasksService.nestTaskRelative(jobId, draggedTaskId, targetTaskId, {
          after_task_id: relativePosition.after_task_id
        });
      } else {
        await tasksService.nestTaskRelative(jobId, draggedTaskId, targetTaskId, {
          position: relativePosition.position as 'first' | 'last'
        });
      }
      
      // Clear optimistic updates on success
      optimisticUpdates.clear();
      
    } catch (error: any) {
      console.error('Failed to nest task:', error);
      
      // Clear any lingering visual feedback including badges
      clearAllVisualFeedback();
      
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
    
    // Calculate newParentId for both single and multi-select operations
    let newParentId: string | null;
    const dropIndex = event.newIndex!;
    
    if (event.dropZone?.mode === 'nest' && event.dropZone.targetTaskId) {
      // For nesting: all tasks become children of the target task
      newParentId = event.dropZone.targetTaskId;
    } else if (event.dropZone?.mode === 'reorder' && event.dropZone.targetTaskId) {
      // For reordering: use target task's parent
      const targetTask = tasks.find(t => t.id === event.dropZone.targetTaskId);
      newParentId = targetTask?.parent_id || null;
    } else {
      newParentId = calculateParentFromPosition(dropIndex, event.dropZone?.mode || 'reorder');
    }
    
    // Store original state for potential rollback
    const taskStateBeforeOperation = tasks.map(t => ({...t})); // Deep snapshot
    
    // Store optimistic update info for rollback
    if (isMultiSelectDrag) {
      const selectedTaskIds = Array.from($taskSelection.selectedTaskIds);
      selectedTaskIds.forEach(taskId => {
        optimisticUpdates.set(taskId, {
          originalPosition: tasks.find(t => t.id === taskId)?.position || 0,
          originalParentId: tasks.find(t => t.id === taskId)?.parent_id
        });
      });
    } else {
      optimisticUpdates.set(draggedTaskId, {
        originalPosition: tasks.find(t => t.id === draggedTaskId)?.position || 0,
        originalParentId: tasks.find(t => t.id === draggedTaskId)?.parent_id
      });
    }
    
    // Auto-expand target task for nesting operations
    if (event.dropZone?.mode === 'nest' && newParentId && !expandedTasks.has(newParentId)) {
      expandedTasks.add(newParentId);
      expandedTasks = expandedTasks; // Trigger Svelte reactivity
    }
    
    try {
      // Get the task IDs that are being moved
      const taskIdsToMove = isMultiSelectDrag 
        ? Array.from($taskSelection.selectedTaskIds)
        : [draggedTaskId];
      
      // Calculate relative positioning for each task
      const relativeUpdates: RelativePositionUpdate[] = [];
      
      if (isMultiSelectDrag && taskIdsToMove.length > 1) {
        // For multi-task operations: use sequential positioning to avoid circular references
        // Sort tasks by their visual order in the hierarchy (not just position within parent)
        const visualOrderMap = createVisualOrderMap(tasks);
        const sortedTaskIds = Array.from($taskSelection.selectedTaskIds);
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
              ).sort((a, b) => a.position - b.position);
              
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
              const firstTaskRelativePos = calculateRelativePosition(event.dropZone, newParentId, [taskId]);
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
        const singleTaskUpdate = calculateRelativePosition(event.dropZone, newParentId, taskIdsToMove);
        relativeUpdates.push(singleTaskUpdate);
      }
      
      console.log('📡 Sending relative position updates to server:', {
        jobId,
        relativeUpdates,
        draggedTaskId,
        dropZone: event.dropZone
      });
      
      // 🔮 Client-side position prediction BEFORE server call using sequential processing
      const predictionResult = RailsClientActsAsList.applyRelativePositioning(tasks, relativeUpdates);
      const clientPredictedPositions = new Map(predictionResult.updatedTasks.map(t => [t.id, t.position]));
      
      console.log('🔮 Client position prediction based on relative updates:', {
        relativeUpdates,
        sequentialOperations: predictionResult.operations,
        predictedFinalPositions: Object.fromEntries(clientPredictedPositions),
        tasksBeforeOperation: taskStateBeforeOperation.map(t => ({ id: t.id, position: t.position, parent_id: t.parent_id }))
      });
      
      // Apply client-side position calculation for optimistic updates
      tasks = RailsClientActsAsList.applyRelativePositioning(tasks, relativeUpdates).updatedTasks;
      
      console.log('🎯 Client state updated from relative positioning:', {
        newTaskPositions: tasks.map(t => ({ id: t.id, position: t.position, parent_id: t.parent_id }))
      });
      
      // Send batch reorder to server using relative positioning
      const serverResponse = await tasksService.batchReorderTasksRelative(jobId, { 
        relative_positions: relativeUpdates 
      });
      
      console.log('✅ Server update successful', serverResponse);
      
      // 🔍 Log final task positions from server response
      if (serverResponse.tasks) {
        const finalPositions = serverResponse.tasks
          .filter(t => (t.parent_id || null) === event.parentId)
          .sort((a, b) => a.position - b.position)
          .map(t => ({
            id: t.id.substring(0, 8),
            title: t.title?.substring(0, 15) + (t.title?.length > 15 ? '...' : ''),
            position: t.position
          }));
        
        console.log('📋 Final task order from server:', finalPositions);
        
        // Highlight the moved task
        const movedTaskFinal = serverResponse.tasks.find(t => t.id === draggedTaskId);
        if (movedTaskFinal) {
          console.log('🎯 Moved task final position:', {
            id: movedTaskFinal.id.substring(0, 8),
            title: movedTaskFinal.title,
            finalPosition: movedTaskFinal.position,
            requestedRelativeUpdate: relativeUpdates[0]
          });
        }
      }
      
      // 🔍 Log client visual state after server response
      const clientVisualState = tasks
        .filter(t => (t.parent_id || null) === event.parentId)
        .sort((a, b) => a.position - b.position)
        .map(t => ({
          id: t.id.substring(0, 8),
          title: t.title?.substring(0, 15) + (t.title?.length > 15 ? '...' : ''),
          position: t.position
        }));
      
      console.log('🖥️ Client visual state after operation:', clientVisualState);
      
      // 🔍 Compare client prediction vs server reality
      await compareClientVsServer(clientPredictedPositions, taskStateBeforeOperation, relativeUpdates, event);
      
      // Clear optimistic updates on success
      optimisticUpdates.clear();
      
    } catch (error: any) {
      console.error('Failed to reorder tasks:', error);
      
      // Clear any lingering visual feedback including badges
      clearAllVisualFeedback();
      
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
    relativeUpdates: RelativePositionUpdate[],
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
        console.log('🔄 Relative updates sent:', relativeUpdates);
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
    const railsTasks: RailsTask[] = tasks.map(t => ({
      id: t.id,
      position: t.position,
      parent_id: t.parent_id || null,
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
      tasks.map(t => ({ id: t.id, position: t.position, parent_id: t.parent_id || null, title: t.title })),
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
          class:task-deleting={deletingTaskIds.has(renderItem.task.id)}
          style="--depth: {renderItem.depth || 0}"
          data-task-id={renderItem.task.id}
          role="button"
          tabindex="0"
          aria-label="Task: {renderItem.task.title}. {$taskSelection.selectedTaskIds.has(renderItem.task.id) ? 'Selected' : 'Not selected'}. Click to select, Shift+click for range selection, Ctrl/Cmd+click to toggle."
          on:click={(e) => editingTaskId === renderItem.task.id ? null : handleTaskClick(e, renderItem.task.id)}
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
            {#if editingTaskId === renderItem.task.id}
              <input 
                class="task-title task-title-input"
                bind:value={editingTitle}
                bind:this={titleInput}
                on:keydown={(e) => handleEditKeydown(e, renderItem.task.id)}
                on:blur={() => handleEditBlur(renderItem.task.id)}
              />
            {:else}
              <h5 
                class="task-title"
                on:click={(e) => handleTitleClick(e, renderItem.task.id, renderItem.task.title)}
              >
                {renderItem.task.title}
              </h5>
            {/if}
            
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
              isSelected={$taskSelection.selectedTaskIds.has(renderItem.task.id)}
              on:task-updated={handleTaskUpdated}
            />
          </div>
        </div>
        
        <!-- Inline New Task Row (appears after this task if selected) -->
        {#if insertNewTaskAfter === renderItem.task.id && showInlineNewTaskInput}
          <div 
            class="task-item task-item-add-new"
            style="--depth: {renderItem.depth || 0}"
          >
            <!-- Disclosure Spacer -->
            <div class="disclosure-spacer"></div>

            <!-- Invisible Status for Spacing -->
            <div class="task-status">
              <div class="status-emoji" style="opacity: 0">⭐</div>
            </div>
            
            <!-- Task Content -->
            <div class="task-content">
              <input 
                class="task-title task-title-input"
                bind:value={inlineNewTaskTitle}
                bind:this={inlineNewTaskInput}
                placeholder="New Task"
                on:keydown={(e) => handleInlineNewTaskKeydown(e, renderItem.task.parent_id)}
                on:blur={() => handleInlineNewTaskBlur(renderItem.task.parent_id)}
                disabled={isCreatingTask}
              />
              {#if isCreatingTask}
                <div class="creating-indicator">
                  <span class="spinner">⏳</span>
                </div>
              {/if}
            </div>

            <!-- Task Metadata (empty for spacing) -->
            <div class="task-metadata"></div>

            <!-- Task Actions (empty - no info button) -->
            <div class="task-actions"></div>
          </div>
        {/if}
      {/each}
    {/if}
      
    <!-- Add New Task Row -->
      <div 
        class="task-item task-item-add-new"
        style="--depth: 0"
      >
        <!-- Disclosure Spacer -->
        <div class="disclosure-spacer"></div>

        <!-- Invisible Status for Spacing -->
        <div class="task-status">
          <div class="status-emoji" style="opacity: 0">⭐</div>
        </div>
        
        <!-- Task Content -->
        <div class="task-content">
          {#if showNewTaskInput}
            <input 
              class="task-title task-title-input"
              bind:value={newTaskTitle}
              bind:this={newTaskInput}
              placeholder="New Task"
              on:keydown={handleNewTaskKeydown}
              on:blur={handleNewTaskBlur}
              disabled={isCreatingTask}
            />
            {#if isCreatingTask}
              <div class="creating-indicator">
                <span class="spinner">⏳</span>
              </div>
            {/if}
          {:else}
            <h5 
              class="task-title add-task-placeholder"
              on:click={showNewTaskForm}
            >
              New Task
            </h5>
          {/if}
        </div>

        <!-- Task Metadata (empty for spacing) -->
        <div class="task-metadata"></div>

        <!-- Task Actions (empty - no info button) -->
        <div class="task-actions"></div>
      </div>
  </div>

  <!-- Error feedback only -->
  {#if feedback && feedback.includes('Failed')}
    <div class="task-list-footer">
      <div class="feedback-message error">
        {feedback}
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

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmationModal}
  <Portal>
    <div class="modal-backdrop" on:click={cancelDeleteConfirmation} on:keydown|stopPropagation={handleModalKeydown}>
      <div class="modal-container" bind:this={modalContainer} on:click|stopPropagation tabindex="-1">
        <div class="warning-icon">
          <svg class="w-12 h-12" viewBox="0 0 26.6504 24.0723" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect height="24.0723" opacity="0" width="26.6504" x="0" y="0"></rect>
              <path d="M3.26172 23.8672L23.0176 23.8672C25.0586 23.8672 26.2891 22.4414 26.2891 20.6348C26.2891 20.0488 26.123 19.4434 25.8008 18.8867L15.9277 1.62109C15.3125 0.537109 14.2285 0 13.1445 0C12.0508 0 10.9766 0.537109 10.3613 1.62109L0.488281 18.8867C0.15625 19.4531 0 20.0488 0 20.6348C0 22.4414 1.23047 23.8672 3.26172 23.8672Z" fill="#ffd60a"></path>
              <path d="M13.1445 15.5078C12.5781 15.5078 12.2656 15.1758 12.2559 14.5898L12.0996 7.71484C12.0898 7.12891 12.5195 6.70898 13.1348 6.70898C13.7402 6.70898 14.1797 7.13867 14.1699 7.72461L14.0137 14.5898C14.0039 15.1855 13.6816 15.5078 13.1445 15.5078ZM13.1445 19.5801C12.4512 19.5801 11.8652 19.0234 11.8652 18.3496C11.8652 17.666 12.4414 17.1094 13.1445 17.1094C13.8379 17.1094 14.4238 17.6562 14.4238 18.3496C14.4238 19.0332 13.8281 19.5801 13.1445 19.5801Z" fill="white"></path>
            </g>
          </svg>
        </div>
        
        <h2 class="modal-title">
          Are you sure you want to delete {#if tasksToDelete.length === 1}
            {@const taskToDelete = tasks.find(t => t.id === tasksToDelete[0])}
            {#if taskToDelete}"{taskToDelete.title}"{:else}"this task"{/if}
          {:else}"{tasksToDelete.length} tasks"{/if}?
        </h2>
        
        <p class="modal-description">
          This item will be deleted immediately. You can't undo this action.
        </p>
        
        <div class="modal-buttons">
          <button class="button button--secondary" on:click={cancelDeleteConfirmation} disabled={isDeletingTasks}>
            Cancel
          </button>
          <button class="button button--danger" bind:this={deleteButton} on:click={confirmDeleteTasks} disabled={isDeletingTasks}>
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

  .task-item {
    display: flex;
    align-items: flex-start;
    padding: 4px !important;
    padding-left: calc(4px + (var(--depth, 0) * 32px)) !important;
    border: none !important;
    border-radius: 8px !important;
    background: none !important;
    background-color: transparent !important;
    transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s ease, margin 0.3s ease, padding 0.3s ease;
    cursor: pointer;
    user-select: none;
    position: relative;
    will-change: transform;
    outline: none; /* Remove browser focus ring */
    overflow: hidden;
  }

  /* Task deletion animation */
  .task-item.task-deleting {
    height: 0 !important;
    opacity: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    pointer-events: none;
    transform: scale(0.95);
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

  .task-title-input {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    color: inherit;
    outline: none;
    width: fit-content;
    min-width: 75px;
    max-width: 100%;
    resize: none;
  }

  /* Add New Task Row Styling */
  .task-item-add-new {
    /* Exclude from selection and hover effects */
    pointer-events: none;
  }

  .task-item-add-new .task-content {
    /* Re-enable pointer events for the text area only */
    pointer-events: auto;
  }

  .add-task-placeholder {
    opacity: 0.5;
    cursor: pointer;
  }

  .add-task-placeholder:hover {
    opacity: 0.7;
  }

  .creating-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-secondary);
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
    margin-top: 2.75px;
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

  /* Delete Confirmation Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(2px);
  }

  .modal-container {
    background: #000000;
    border: 1px solid #374151;
    border-radius: 24px;
    padding: 32px;
    width: 100%;
    max-width: 28rem;
    outline: none;
    box-shadow: 0 20px 30px rgba(0, 0, 0, 0.3);
  }

  .warning-icon {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
  }

  .warning-icon svg {
    height: 48px;
    width: 48px;
  }

  .modal-title {
    color: white;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .modal-description {
    color: #d1d5db;
    margin-bottom: 32px;
    font-size: 16px;
    line-height: 1.5;
  }

  .modal-buttons {
    display: flex;
    gap: 16px;
  }

  .button {
    border-radius: 9999px;
    padding: 12px 32px;
    font-weight: 500;
    flex: 1;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
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
    color: #fca5a5;
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