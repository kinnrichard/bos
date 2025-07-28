<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  // Custom slide transition that can be conditionally disabled
  function conditionalSlide(
    node: Element,
    params: { duration?: number; easing?: (t: number) => number; disabled?: boolean } = {}
  ) {
    if (params.disabled) {
      // Return a no-op transition
      return {
        duration: 0,
        css: () => '',
      };
    }
    // Use standard slide transition
    return slide(node, { duration: params.duration || 250, easing: params.easing || quintOut });
  }
  import { taskFilter, shouldShowTask } from '$lib/stores/taskFilter.svelte';
  import { taskPermissionHelpers } from '$lib/stores/taskPermissions.svelte';
  import { TaskHierarchyManager } from '$lib/services/TaskHierarchyManager';
  import type { BaseTask } from '$lib/services/TaskHierarchyManager';
  import {
    taskSelection,
    taskSelectionActions,
    getSelectionOrder,
  } from '$lib/stores/taskSelection.svelte';
  import { focusActions } from '$lib/stores/focusManager.svelte';
  import { Task as TaskModel } from '$lib/models/task';
  import { nativeDrag, clearAllVisualFeedback } from '$lib/utils/native-drag-action';
  import type { DragSortEvent, DragMoveEvent, DragStartEvent } from '$lib/utils/native-drag-action';
  import { calculateRelativePositionFromTarget } from '$lib/utils/position-calculator';
  // Direct position calculation imports (replacing client-acts-as-list.ts)
  import type { Task, DropZoneInfo } from '$lib/utils/position-calculator';
  import {
    calculatePosition,
    convertRelativeToPositionUpdates,
    type PositionUpdate,
    type RelativePositionUpdate,
  } from '$lib/shared/utils/positioning-v2';
  // NOTE: getDatabaseTimestamp import removed as it was unused
  import TaskRow from '../tasks/TaskRow.svelte';
  import NewTaskRow from '../tasks/NewTaskRow.svelte';
  import DeletionModal from '../ui/DeletionModal.svelte';
  import { FlipAnimator, createDebouncedAnimator } from '$lib/utils/flip-animation';

  // Import new DRY utilities
  import { createTaskInputManager } from '$lib/utils/task-input-manager';
  import { debugBusiness, debugComponent, debugUI } from '$lib/utils/debug';
  import { KeyboardHandler } from '$lib/utils/keyboard-handler';
  import { taskCreationManager } from '$lib/stores/taskCreation.svelte';

  // ✨ SVELTE 5 RUNES
  let {
    tasks = [],
    keptTasks = [],
    jobId = 'test',
    batchTaskDetails = null,
    isNewJobMode = false,
    onCancel = null,
    jobLoaded = false, // NEW: Indicates whether job data has actually loaded
  }: {
    tasks?: Array<Task>;
    keptTasks?: Array<Task>;
    jobId?: string;
    batchTaskDetails?: unknown;
    isNewJobMode?: boolean; // NEW: Hide certain UI in creation mode
    onCancel?: Function; // NEW: Cancel handler for creation mode
    jobLoaded?: boolean; // NEW: Prevents empty state flash during initial load
  } = $props();

  // Clean up any self-references in the data (for offline resilience)
  function cleanupSelfReferences<T extends Task>(taskList: T[]): T[] {
    return taskList.map((task) => {
      if (task.parent_id === task.id) {
        debugBusiness.workflow.warn(
          `[TaskList] Cleaning self-reference for task ${task.id} "${task.title}"`
        );
        return { ...task, parent_id: null };
      }
      return task;
    });
  }

  // Apply cleanup to both task arrays using $derived
  const cleanedTasks = $derived(cleanupSelfReferences(tasks));
  const cleanedKeptTasks = $derived(cleanupSelfReferences(keptTasks));

  // Task hierarchy management
  const hierarchyManager = new TaskHierarchyManager();

  // Derived state for UI capabilities using new permission system
  const canCreateTasks = $derived(taskPermissionHelpers.canCreateTasks);
  const canEditTasks = $derived(taskPermissionHelpers.canEditTasks);

  // Conditionally show new task row - search should show but be disabled in new job mode
  const showNewTaskRow = $derived(!isNewJobMode);
  // Always show search, but it can be disabled via toolbar
  // NOTE: showSearch removed as it was unused

  // NOTE: isDragging tracking disabled for performance
  // let _isDragging = $state(false);
  let dragFeedback = $state('');

  // Outside click and keyboard handling for task deselection
  let taskListContainer: HTMLElement;

  function handleOutsideClick(event: MouseEvent) {
    // Don't deselect if:
    // - No tasks are selected
    // - Modifier keys are held (for multi-select)
    // - Clicking within task elements
    if (!taskSelection.selectedTaskIds.size || event.metaKey || event.ctrlKey || event.shiftKey) {
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

    // Capture initial positions for animations
    if (tasksContainer && !FlipAnimator.prefersReducedMotion()) {
      const taskElements = Array.from(
        tasksContainer.querySelectorAll('.task-item')
      ) as HTMLElement[];
      flipAnimator.capturePositions(taskElements, (el) => el.dataset.taskId || '');
    }
  });

  // Clean up any lingering visual dragFeedback when component is destroyed
  onDestroy(() => {
    clearAllVisualFeedback();
    // Remove event listeners
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', keyboardHandler.handleKeydown);
    // Cleanup keyboard handler
    keyboardHandler.cleanup();
    // Cleanup animator
    flipAnimator.clear();
  });

  // Direct position calculation helpers (using positioning-v2.ts utilities)

  // Execute position updates using Task.updatePositions batch API
  async function executePositionUpdates(positionUpdates: PositionUpdate[]): Promise<void> {
    if (positionUpdates.length === 0) return;

    // NOTE: reorderedAt timestamp not currently used for position tracking
    // const _reorderedAt = Date.now();
    const batchUpdates = positionUpdates.map((update) => ({
      taskId: update.id,
      position: update.position,
      parent_id: update.parent_id !== undefined ? update.parent_id : undefined,
      repositioned_after_id: update.repositioned_after_id,
      position_finalized: false,
      repositioned_to_top: update.repositioned_after_id === null && update.parent_id === null,
      reason: `Direct position calculation (${update.position})`,
    }));

    await TaskModel.updatePositions(batchUpdates);
  }

  // Apply and execute position updates in one operation
  async function applyAndExecutePositionUpdates(
    tasks: Task[],
    positionUpdates: PositionUpdate[]
  ): Promise<void> {
    await executePositionUpdates(positionUpdates);
  }

  // NOTE: _ClientActsAsList was unused - comment preserved for context

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
  const deletionTitle = $derived.by(() => {
    if (tasksToDelete.length === 1) {
      const taskToDelete = cleanedTasks.find((t) => t.id === tasksToDelete[0]);
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
      title: {
        get: () => bottomTaskState.title,
        set: (value) => taskCreationManager.setTitle('bottom', value),
      },
      inputElement: { get: () => undefined }, // DOM handled locally in component
      isCreating: { get: () => false, set: (_v) => {} }, // No loading state needed
      isShowing: {
        get: () => bottomTaskState.isShowing,
        set: (value) =>
          value ? taskCreationManager.show('bottom') : taskCreationManager.hide('bottom'),
      },
    },
    {
      create: (shouldSelect) => createTask('bottom', shouldSelect),
      cancel: () => taskCreationManager.hide('bottom'),
    }
  );

  const inlineTaskManager = createTaskInputManager(
    {
      title: {
        get: () => inlineTaskState.title,
        set: (value) => taskCreationManager.setTitle('inline', value),
      },
      inputElement: { get: () => undefined }, // DOM handled locally in component
      isCreating: { get: () => false, set: (_v) => {} }, // No loading state needed
      isShowing: {
        get: () => inlineTaskState.isShowing,
        set: (value) =>
          value ? taskCreationManager.show('inline') : taskCreationManager.hide('inline'),
      },
    },
    {
      create: (shouldSelect) => createTask('inline', shouldSelect),
      cancel: () => taskCreationManager.hide('inline'),
    }
  );

  // Use pure reactive filtering with TaskHierarchyManager
  const hierarchicalTasks = $derived(
    hierarchyManager.organizeTasksHierarchicallyWithFilter(
      cleanedTasks as BaseTask[],
      shouldShowTask
    )
  );

  // Create a separate hierarchy from cleanedKeptTasks for position calculations
  // This includes ALL non-discarded tasks, regardless of filters
  const cleanedKeptTasksHierarchy = $derived(
    hierarchyManager.organizeTasksSimple(cleanedKeptTasks as BaseTask[])
  );

  // Track if we've done initial auto-expansion
  let hasAutoExpanded = false;
  let isAutoExpanding = false;

  // Animation context tracking system
  type AnimationContext = 'user-expansion' | 'nested-reveal' | 'auto-expansion' | 'none';
  let currentAnimationContext: AnimationContext = 'none';
  let animationInitiatorTaskId: string | null = null;
  let tasksBeingAnimated = new Set<string>();

  // Function to set animation context when user clicks disclosure buttons
  function setAnimationContext(context: AnimationContext, initiatorTaskId?: string) {
    currentAnimationContext = context;
    animationInitiatorTaskId = initiatorTaskId || null;
    tasksBeingAnimated.clear();

    // Auto-clear context after DOM updates to prevent interference
    if (context !== 'none') {
      tick().then(() => {
        setTimeout(() => {
          currentAnimationContext = 'none';
          animationInitiatorTaskId = null;
          tasksBeingAnimated.clear();
        }, 50);
      });
    }
  }

  // Function to check if a task should animate based on context
  function shouldAnimateTask(taskId: string): boolean {
    // Never animate during auto-expansion
    if (isAutoExpanding || currentAnimationContext === 'auto-expansion') {
      return false;
    }

    // During initial load, don't animate anything
    if (!hasAutoExpanded) {
      return false;
    }

    // Only animate for user-initiated expansions
    if (currentAnimationContext === 'user-expansion') {
      // Only animate the specific task the user clicked on
      return taskId === animationInitiatorTaskId;
    }

    // For nested reveals or any other case, don't animate
    return false;
  }

  // Auto-expand ALL tasks that have subtasks by default (only once on initial load)
  $effect(() => {
    if (hierarchicalTasks.length > 0 && !hasAutoExpanded) {
      isAutoExpanding = true;
      setAnimationContext('auto-expansion');

      // Disable triangle transitions during auto-expansion
      if (tasksContainer) {
        tasksContainer.classList.add('no-triangle-transitions');
      }

      hierarchyManager.autoExpandAll(hierarchicalTasks);
      hasAutoExpanded = true;

      // Re-enable triangle transitions after a brief delay to allow DOM updates
      setTimeout(() => {
        isAutoExpanding = false;
        setAnimationContext('none');
        if (tasksContainer) {
          tasksContainer.classList.remove('no-triangle-transitions');
        }
      }, 100);
    }
  });

  // Make rendering reactive to expansion state changes
  const flattenedTasks = $derived.by(() => {
    return hierarchyManager.flattenTasks(hierarchicalTasks);
  });

  // Use hierarchical tasks directly for recursive rendering with unlimited nesting
  // This allows slide animations at every level of the hierarchy

  // Flattened kept tasks for position calculations (includes all non-discarded tasks)
  const flattenedKeptTasks = $derived.by(() => {
    return hierarchyManager.flattenTasks(cleanedKeptTasksHierarchy);
  });

  // Check if task list is empty for positioning New Task button
  const hasNoTasks = $derived(hierarchicalTasks.length === 0);

  // Update flat task IDs for multi-select functionality
  const flatTaskIds = $derived(hierarchyManager.getFlatTaskIds(flattenedTasks));

  // Track previous task order for animation detection
  let previousTaskOrder: string[] = [];

  // Watch for task position changes and animate them (reactive animations)
  $effect(() => {
    // Access reactive dependencies
    const currentTasks = flattenedTasks;
    const currentTaskOrder = currentTasks.map((item) => item.task.id);

    // Skip animation if explicitly disabled, during slide transitions, or if this is the first render
    if (skipNextAnimation || isSlideAnimating || previousTaskOrder.length === 0) {
      debugUI.animation(
        'FLIP: Skipping reactive animation:',
        skipNextAnimation
          ? 'explicitly disabled'
          : isSlideAnimating
            ? 'slide animation in progress'
            : 'first render'
      );
      previousTaskOrder = currentTaskOrder;

      // Still capture positions for future animations
      if (tasksContainer && !FlipAnimator.prefersReducedMotion()) {
        tick().then(() => {
          const taskElements = Array.from(
            tasksContainer.querySelectorAll('.task-item')
          ) as HTMLElement[];
          if (taskElements.length > 0) {
            flipAnimator.capturePositions(taskElements, (el) => el.dataset.taskId || '');
          }
        });
      }
      return;
    }

    // Check if the order actually changed
    const orderChanged =
      currentTaskOrder.length !== previousTaskOrder.length ||
      currentTaskOrder.some((id, index) => id !== previousTaskOrder[index]);

    if (orderChanged && tasksContainer && !FlipAnimator.prefersReducedMotion()) {
      debugUI.animation('FLIP: Task order changed, triggering reactive animation');

      tick().then(() => {
        const taskElements = Array.from(
          tasksContainer.querySelectorAll('.task-item')
        ) as HTMLElement[];
        if (taskElements.length > 0) {
          animateDebounced(taskElements, (el) => el.dataset.taskId || '', {
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            stagger: 15,
          });
        }
      });
    }

    previousTaskOrder = currentTaskOrder;
  });

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
          metaKey: event.metaKey,
        } as MouseEvent;

        handleTaskClick(mockEvent, taskId);
      },
    },

    behavior: {
      wrapNavigation: true,
      preventDefault: ['ArrowUp', 'ArrowDown'],
    },
  });

  // Reference to the tasks container element for drag action updates
  let tasksContainer: HTMLElement;
  let dragActionInstance: { destroy(): void } | null = null;

  // FLIP animation setup
  // This debounced animator causes visual glitches; so I sent to 0ms
  const { animator: flipAnimator, animateDebounced } = createDebouncedAnimator(0);
  let skipNextAnimation = false;
  let isSlideAnimating = false; // Track slide transition state to prevent FLIP conflicts
  // NOTE: lastTaskCount removed as it was unused

  // Store action instance for manual updates
  function storeDragAction(node: HTMLElement, options: Record<string, unknown>) {
    dragActionInstance = nativeDrag(node, options);
    return dragActionInstance;
  }

  // Trigger drag action update when flattened tasks change (to handle new grandchildren)
  $effect(() => {
    if (dragActionInstance && flattenedTasks) {
      // Wait for DOM to update before setting draggable attributes
      tick().then(() => {
        dragActionInstance.update({
          onBeforeStart: handleBeforeSortStart,
          onStart: handleSortStart,
          onEnd: handleSortEnd,
          onSort: handleTaskReorder,
          onMove: handleMoveDetection,
        });
      });
    }
  });

  function toggleTaskExpansion(taskId: string) {
    // Set animation context for user-initiated expansion/collapse
    setAnimationContext('user-expansion', taskId);
    hierarchyManager.toggleExpansion(taskId);
  }

  // NOTE: isTaskExpanded wrapper function removed - template uses hierarchyManager.isTaskExpanded directly

  // NOTE: getStatusLabel function removed as it was unused

  // NOTE: formatDateTime function removed as it was unused

  // Time tracking utilities
  // Update time tracking display every second for in-progress tasks
  // TODO: This is broken and may need to be re-imagined. It shoud only show on the task-info popover.

  let timeTrackingInterval: ReturnType<typeof setInterval> | null = null;
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

  // Cancel current edit when switching to another task
  function cancelCurrentEdit() {
    const currentEditingTaskId = focusActions.getCurrentEditingTaskId();
    if (!currentEditingTaskId) return;

    // Clear focus through centralized manager
    focusActions.clearFocus();
    cancelEdit();
  }

  // Capture positions immediately after selection changes for better drag animation timing
  function capturePositionsAfterSelection() {
    if (!tasksContainer) return;

    // Always capture current positions for all tasks
    const taskElements = Array.from(tasksContainer.querySelectorAll('.task-item')) as HTMLElement[];
    flipAnimator.capturePositions(taskElements, (el) => el.dataset.taskId || '');

    // If there are multiple selected tasks, also capture their pre-drag positions now
    // This ensures we get clean positions before any drag operations begin
    const selectedElements = taskElements.filter(
      (el) => el.dataset.taskId && taskSelection.selectedTaskIds.has(el.dataset.taskId)
    );

    if (selectedElements.length > 1) {
      const selectionOrder = getSelectionOrder();
      flipAnimator.capturePreDragPositions(
        selectedElements,
        (el) => el.dataset.taskId || '',
        selectionOrder
      );
      debugUI.component('Selection: Captured pre-drag positions for multi-select:', {
        count: selectedElements.length,
        selectionOrder: selectionOrder.map((id) => id.substring(0, 8)),
      });
    }
  }

  // Multi-select click handler
  function handleTaskClick(event: MouseEvent, taskId: string) {
    event.stopPropagation();

    // Check if this is a click on the title of the currently editing task
    const currentEditingId = focusActions.getCurrentEditingTaskId();
    const isClickOnEditingTitle =
      currentEditingId === taskId && (event.target as HTMLElement).closest('.editable-title');

    // Cancel any existing edit before changing selection, UNLESS
    // we're clicking on the title of the task that's currently being edited
    if (currentEditingId !== null && !isClickOnEditingTitle) {
      cancelCurrentEdit();
    }

    if (event.shiftKey) {
      taskSelectionActions.handleRangeSelect(taskId, flatTaskIds);
    } else if (event.ctrlKey || event.metaKey) {
      taskSelectionActions.toggleTask(taskId);
    } else {
      taskSelectionActions.selectTask(taskId);
    }

    // Capture positions immediately after selection changes
    // This happens when elements are in their natural positions, before any drag styling
    capturePositionsAfterSelection();
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
        if (!canEditTasks) break; // Elegant guard clause
        editingTaskId = taskId;
        // Title editing now handled by contenteditable element
        // Focus will be handled by TaskRow component
        tick().then(() => {
          const titleInput = document.querySelector(
            `[data-task-id="${taskId}"] .task-title-input`
          ) as HTMLInputElement;
          if (titleInput) {
            titleInput.focus();
            titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
          }
        });
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
    let position: number;
    let parentId: string | undefined;
    let lastRootTask: Task | null = null;

    // Clear the form immediately to prevent visual glitch
    taskCreationManager.hide(type);

    // Calculate position based on creation type
    if (type === 'inline' && insertNewTaskAfter) {
      const afterTask = cleanedKeptTasks.find((t) => t.id === insertNewTaskAfter);
      if (afterTask) {
        parentId = afterTask.parent_id || undefined;

        // Get tasks in the same scope (sibling tasks with same parent)
        const scopeTasks = cleanedKeptTasks.filter(
          (t) => (t.parent_id || null) === (parentId || null)
        );

        // Find position after the target task
        const afterIndex = scopeTasks.findIndex((t) => t.id === insertNewTaskAfter);
        if (afterIndex !== -1 && afterIndex < scopeTasks.length - 1) {
          // Use integer positioning utility for conflict-free insertion
          const nextTask = scopeTasks[afterIndex + 1];
          const afterPosition = afterTask.position ?? 0;
          const nextPosition = nextTask.position ?? null;
          position = calculatePosition(afterPosition, nextPosition);
        } else {
          // Inserting at the end - use utility for consistent spacing
          position = calculatePosition(afterTask.position ?? 0, null);
        }
      } else {
        // After task not found - fall back to bottom creation
        console.error('[TaskList] After task not found:', insertNewTaskAfter);
        // Calculate position as if adding at bottom
        const rootTasks = cleanedKeptTasks.filter((t) => !t.parent_id);
        lastRootTask = rootTasks.length > 0 ? rootTasks[rootTasks.length - 1] : null;
        position = lastRootTask
          ? calculatePosition(lastRootTask.position ?? 0, null)
          : calculatePosition(null, null);
      }
    } else {
      // Bottom task creation - add at the end of root level tasks
      // Get the last root task from the existing tasks array
      const rootTasks = cleanedKeptTasks.filter((t) => !t.parent_id);
      lastRootTask = rootTasks.length > 0 ? rootTasks[rootTasks.length - 1] : null;

      if (lastRootTask) {
        position = calculatePosition(lastRootTask.position ?? 0, null);
      } else {
        // First task in the job
        position = calculatePosition(null, null);
      }
    }

    // Determine which task this is being positioned after
    let repositionedAfterId: string | number | null = null;
    if (type === 'inline' && insertNewTaskAfter) {
      repositionedAfterId = insertNewTaskAfter;
    } else if (type === 'bottom') {
      if (lastRootTask) {
        // Use the lastRootTask we already fetched above
        repositionedAfterId = lastRootTask.id;
      } else {
        // First task in the job - use null and set repositioned_to_top flag
        repositionedAfterId = null;
      }
    }

    // Determine if this is a top-of-list insertion
    const isTopOfList = repositionedAfterId === null && parentId === null && type === 'bottom';

    // Log the data being sent to create
    const createData = {
      title,
      job_id: jobId,
      status: 'new_task',
      position,
      repositioned_after_id: repositionedAfterId,
      parent_id: parentId,
      lock_version: 0,
      applies_to_all_targets: false,
      position_finalized: false, // Client-side positioning
      repositioned_to_top: isTopOfList,
    };

    debugBusiness.workflow('TaskList: Creating task with data:', createData);
    debugBusiness.workflow('TaskList: Position:', position, 'Type:', typeof position);
    debugBusiness.workflow('TaskList: RepositionedAfterId:', repositionedAfterId);
    debugBusiness.workflow('TaskList: ParentId:', parentId);

    try {
      const newTask = await TaskModel.create(createData);
      debugBusiness.workflow('TaskList: Task created successfully:', newTask);

      // Add the new task to our local tasks array
      if (type === 'inline' && insertNewTaskAfter) {
        // Insert new task at correct position based on visual hierarchy
        const visualIndex = flatTaskIds.indexOf(insertNewTaskAfter);
        if (visualIndex !== -1 && visualIndex < flatTaskIds.length - 1) {
          const nextTaskId = flatTaskIds[visualIndex + 1];
          const nextTaskIndex = cleanedTasks.findIndex((t) => t.id === nextTaskId);

          if (nextTaskIndex !== -1) {
            tasks = [
              ...cleanedTasks.slice(0, nextTaskIndex),
              newTask,
              ...cleanedTasks.slice(nextTaskIndex),
            ];
          } else {
            tasks = [...cleanedTasks, newTask];
          }
        } else {
          tasks = [...cleanedTasks, newTask];
        }

        // Update insertNewTaskAfter to point to the newly created task
        insertNewTaskAfter = newTask.id;
      } else {
        tasks = [...cleanedTasks, newTask];
      }

      // Select the newly created task only if requested (Return key, not blur)
      if (shouldSelectAfterCreate) {
        taskSelectionActions.selectTask(newTask.id);
      }

      // Skip animation for the next update since this is an addition
      skipNextAnimation = true;
      tick().then(() => {
        skipNextAnimation = false;
      });

      dragFeedback = 'Task created successfully!';
      setTimeout(() => (dragFeedback = ''), 2000);
    } catch (error: unknown) {
      console.error('[TaskList] Task creation failed:', error);
      console.error('[TaskList] Error details:', {
        message: error?.message,
        stack: error?.stack,
        error,
        taskData: createData,
      });
      debugBusiness.workflow.error('Task creation failed', { error, taskData: state });

      // Restore the input state on error
      taskCreationManager.show(type);
      taskCreationManager.setTitle(type, title);

      dragFeedback = 'Failed to create task - please try again';
      setTimeout(() => (dragFeedback = ''), 3000);
    }
  }

  // NOTE: handleNewTaskRowClick function removed as it was unused

  function handleTaskUpdated(event: CustomEvent) {
    const updatedTask = event.detail.task;

    // Update the task in our tasks array
    const taskIndex = cleanedTasks.findIndex((t) => t.id === updatedTask.id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...cleanedTasks[taskIndex], ...updatedTask };
      tasks = [...cleanedTasks]; // Trigger reactivity
    }
  }

  // Task status change handler using ActiveRecord pattern
  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      // Use ActiveRecord pattern - Zero.js handles optimistic updates and server sync
      const { Task } = await import('$lib/models/task');
      await Task.update(taskId, { status: newStatus });
    } catch (error: unknown) {
      debugBusiness.workflow.error('Task status update failed', { error, taskId, newStatus });

      if (error.code === 'INVALID_CSRF_TOKEN') {
        dragFeedback = 'Session expired - please try again';
      } else {
        dragFeedback = 'Failed to update task status - please try again';
      }
      setTimeout(() => (dragFeedback = ''), 3000);
    }
  }

  // Task title editing functions - using DRY cursor positioning
  function handleTitleClick(event: MouseEvent, taskId: string) {
    if (!canEditTasks) return; // Elegant guard clause

    event.stopPropagation(); // Prevent task selection
    taskSelectionActions.clearSelection(); // Clear any existing selection when editing

    // Enter edit mode
    editingTaskId = taskId;

    // Find the contenteditable element and register with focus manager
    tick().then(() => {
      const titleElement = document.querySelector(
        `[data-task-id="${taskId}"] .task-title`
      ) as HTMLElement;
      if (titleElement) {
        focusActions.setEditingElement(titleElement, taskId);
      }
    });
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

    let deletePromises: Promise<unknown>[] = []; // Declare outside try block

    try {
      // Clear selection
      taskSelectionActions.clearSelection();

      // Start deletion animation by marking tasks as deleting
      tasksToDeleteCopy.forEach((taskId) => {
        deletingTaskIds.add(taskId);
      });

      // Trigger reactivity
      deletingTaskIds = new Set(deletingTaskIds);

      // Delete tasks in parallel while animation is running using ActiveRecord-style API
      deletePromises = tasksToDeleteCopy.map(async (taskId) => {
        // Find the task data and create an ActiveRecord-style instance
        const taskData = cleanedTasks.find((t) => t.id === taskId);
        if (!taskData) {
          throw new Error(`Task with ID ${taskId} not found`);
        }

        const { Task } = await import('$lib/models/task');
        await Task.discard(taskData.id);
        return { id: taskData.id };
      });

      // Wait for both API calls and animation to complete
      const [,] = await Promise.all([
        Promise.all(deletePromises),
        new Promise((resolve) => setTimeout(resolve, animationDuration)),
      ]);

      // Clear deletion animation state
      tasksToDeleteCopy.forEach((taskId) => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = new Set(deletingTaskIds);

      // Skip animation for the next update since this is a deletion
      skipNextAnimation = true;
      tick().then(() => {
        skipNextAnimation = false;
      });

      // Show success dragFeedback
      dragFeedback = `Successfully discarded ${deletePromises.length} task${deletePromises.length === 1 ? '' : 's'}`;
      setTimeout(() => (dragFeedback = ''), 3000);
    } catch (error: unknown) {
      debugBusiness.workflow.error('Task discard failed', {
        error,
        taskCount: tasksToDeleteCopy.length,
      });

      // Clear animation state on error
      tasksToDeleteCopy.forEach((taskId) => {
        deletingTaskIds.delete(taskId);
      });
      deletingTaskIds = new Set(deletingTaskIds);

      dragFeedback = `Failed to discard tasks: ${error.message || 'Unknown error'}`;
      setTimeout(() => (dragFeedback = ''), 5000);
    } finally {
      isDeletingTasks = false;
    }
  }

  // Position capture function that runs BEFORE native drag modifies elements
  function capturePreDragPositions(draggedTaskId: string) {
    if (!tasksContainer || FlipAnimator.prefersReducedMotion()) return;

    const isMultiSelectDrag =
      draggedTaskId &&
      taskSelection.selectedTaskIds.has(draggedTaskId) &&
      taskSelection.selectedTaskIds.size > 1;
    const taskElements = Array.from(tasksContainer.querySelectorAll('.task-item')) as HTMLElement[];

    if (isMultiSelectDrag) {
      // Debug: Check if DOM order matches expected order
      // debugUI.layout('DEBUG: DOM Order vs Flattened Order:');
      // taskElements.forEach((el, index) => {
      //   const taskId = el.dataset.taskId;
      //   const flattenedIndex = flattenedTasks.findIndex((t) => t.task.id === taskId);
      //   const rect = el.getBoundingClientRect();
      //   const isSelected = taskId && taskSelection.selectedTaskIds.has(taskId);
      //   debugUI.layout(
      //     `DOM[${index}]: ${taskId?.substring(0, 8)} at y:${rect.y.toFixed(1)} | Flattened[${flattenedIndex}] | Selected: ${isSelected}`
      //   );
      // });

      // For multi-drag, capture positions of all selected tasks as pre-drag positions
      const selectedElements = taskElements.filter(
        (el) => el.dataset.taskId && taskSelection.selectedTaskIds.has(el.dataset.taskId)
      );
      debugUI.component(
        'Multi-Drag: Capturing pre-drag positions for',
        selectedElements.length,
        'selected tasks BEFORE native drag styling'
      );

      // Debug selected elements order
      // debugUI.layout('DEBUG: Selected elements in query order:');
      // selectedElements.forEach((el, index) => {
      //   const taskId = el.dataset.taskId;
      //   const rect = el.getBoundingClientRect();
      //   debugUI.layout(`Selected[${index}]: ${taskId?.substring(0, 8)} at y:${rect.y.toFixed(1)}`);
      // });

      // Get container bounds for debugging
      const containerRect = tasksContainer.getBoundingClientRect();
      debugUI.component('Multi-Drag: Container bounds:', {
        top: containerRect.top,
        left: containerRect.left,
        width: containerRect.width,
        height: containerRect.height,
      });

      // Ensure elements are visible and properly positioned before capturing
      const visibleSelectedElements = selectedElements.filter((el, _index) => {
        const rect = el.getBoundingClientRect();
        // NOTE: _taskId variable removed from debug code as it was unused
        const isVisible = rect.width > 0 && rect.height > 0 && rect.x >= -50 && rect.y >= -50;

        // NOTE: Enhanced debug logging removed

        return isVisible;
      });

      if (visibleSelectedElements.length > 0) {
        const selectionOrder = getSelectionOrder();
        flipAnimator.capturePreDragPositions(
          visibleSelectedElements,
          (el) => el.dataset.taskId || '',
          selectionOrder
        );
        // debugUI.interaction(
        //   'Multi-Drag: Using selection order:',
        //   selectionOrder.map((id) => id.substring(0, 8))
        // );
      } else {
        console.warn('[Multi-Drag] No visible selected elements found for pre-drag capture');
      }
    }

    // Always capture normal positions for all tasks (for non-selected task animations)
    flipAnimator.capturePositions(taskElements, (el) => el.dataset.taskId || '');
  }

  // Called BEFORE native drag applies styling - positions should already be captured at selection time
  function handleBeforeSortStart(event: DragStartEvent) {
    const draggedTaskId = event.item.dataset.taskId;
    if (draggedTaskId) {
      // console.log('[Drag] Starting drag operation for task:', draggedTaskId.substring(0, 8));

      // For single drag operations (not multi-select), we still need to capture positions
      if (
        !taskSelection.selectedTaskIds.has(draggedTaskId) ||
        taskSelection.selectedTaskIds.size === 1
      ) {
        capturePreDragPositions(draggedTaskId);
      } else {
        // console.log('[Drag] Using pre-captured positions from selection time for multi-drag');
      }
    }
  }

  // Native drag event handlers
  function handleSortStart(event: DragSortEvent) {
    // NOTE: isDragging assignment removed as variable was unused

    const draggedTaskId = event.item.dataset.taskId;

    // Check for multi-select drag for badge
    const selectedCount = taskSelection.selectedTaskIds.size;

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
    // NOTE: isDragging assignment removed as variable was unused

    // IMMEDIATELY capture current DOM positions before any cleanup or processing
    // This captures the actual destination positions while elements are transitioning
    let capturedCurrentPositions:
      | Map<string, { x: number; y: number; width: number; height: number }>
      | undefined;
    if (tasksContainer && !FlipAnimator.prefersReducedMotion()) {
      capturedCurrentPositions = new Map();
      const taskElements = Array.from(
        tasksContainer.querySelectorAll('.task-item')
      ) as HTMLElement[];
      taskElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const key = element.dataset.taskId || '';
        if (key) {
          capturedCurrentPositions!.set(key, {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }
      });
      // debugUI.animation(
      //   'FLIP: Captured current positions immediately at drag end for',
      //   capturedCurrentPositions.size,
      //   'elements'
      // );
    }

    // Clear all visual dragFeedback
    clearAllVisualFeedback();

    // Remove multi-drag badge if it exists
    const badge = event.item.querySelector('.multi-drag-badge');
    if (badge) {
      badge.remove();
    }

    // Clean up pre-drag positions (manual animations disabled - using reactive animations instead)
    flipAnimator.clearPreDragPositions();
    // debugUI.animation(
    //   'FLIP: Manual drag animations disabled - relying on reactive animations after Zero.js updates'
    // );
  }

  // Handle move detection during drag operations
  function handleMoveDetection(event: DragMoveEvent) {
    const { dropZone, related: targetElement } = event;

    if (!dropZone || !targetElement) {
      return true;
    }

    // Get all tasks being dragged (single or multi-select)
    const draggedElement = event.dragged;
    const draggedTaskId = draggedElement?.getAttribute('data-task-id');

    if (draggedTaskId) {
      // Check if this is a multi-select drag
      const draggedTaskIds =
        taskSelection.selectedTaskIds.has(draggedTaskId) && taskSelection.selectedTaskIds.size > 1
          ? Array.from(taskSelection.selectedTaskIds)
          : [draggedTaskId];

      // For nesting operations, validate all dragged tasks
      if (dropZone.mode === 'nest' && dropZone.targetTaskId) {
        // Prevent self-nesting
        if (draggedTaskIds.includes(dropZone.targetTaskId)) {
          return false; // This prevents the drop zone from being highlighted
        }

        // Prevent circular references (can't drop parent onto descendant)
        const wouldCreateCircular = draggedTaskIds.some((taskId) =>
          isDescendantOf(dropZone.targetTaskId, taskId)
        );

        if (wouldCreateCircular) {
          return false; // This prevents the drop zone from being highlighted
        }

        // For single-task operations, use existing validation
        if (draggedTaskIds.length === 1) {
          const validation = isValidNesting(draggedTaskId, dropZone.targetTaskId);
          if (!validation.valid) {
            return false;
          }
        }
      }
    }

    return true; // Allow the move
  }

  // Validation functions for nesting
  function isValidNesting(
    draggedTaskId: string,
    targetTaskId: string
  ): { valid: boolean; reason?: string } {
    // Rule 1: Can't nest task under itself
    if (draggedTaskId === targetTaskId) {
      return { valid: false, reason: 'Task cannot be nested under itself' };
    }

    const draggedTask = cleanedKeptTasks.find((t) => t.id === draggedTaskId);
    const targetTask = cleanedKeptTasks.find((t) => t.id === targetTaskId);

    if (!draggedTask || !targetTask) {
      return { valid: false, reason: 'Task not found' };
    }

    // Rule 2: Can't nest task under its own descendant (circular reference)
    if (isDescendantOf(targetTaskId, draggedTaskId)) {
      return {
        valid: false,
        reason: 'Cannot create circular reference - target is a descendant of the dragged task',
      };
    }

    return { valid: true };
  }

  function isDescendantOf(potentialDescendantId: string, ancestorId: string): boolean {
    const potentialDescendant = cleanedKeptTasks.find((t) => t.id === potentialDescendantId);
    if (!potentialDescendant || !potentialDescendant.parent_id) {
      return false;
    }

    if (potentialDescendant.parent_id === ancestorId) {
      return true;
    }

    return isDescendantOf(potentialDescendant.parent_id, ancestorId);
  }

  // NOTE: getTaskDepth function removed as it was unused

  // NOTE: createVisualOrderMap function removed as it was unused

  // Handle nesting a task under another task
  async function handleTaskNesting(draggedTaskId: string, targetTaskId: string) {
    // Validate nesting operation
    const validation = isValidNesting(draggedTaskId, targetTaskId);

    if (!validation.valid) {
      dragFeedback = validation.reason || 'Invalid nesting operation';
      setTimeout(() => (dragFeedback = ''), 3000);
      return;
    }

    const draggedTask = cleanedKeptTasks.find((t) => t.id === draggedTaskId);
    const targetTask = cleanedKeptTasks.find((t) => t.id === targetTaskId);

    if (!draggedTask || !targetTask) {
      debugBusiness.workflow.error('Could not find dragged or target task', {
        draggedTaskId,
        targetTaskId,
        availableTaskIds: cleanedKeptTasks.map((t) => t.id),
      });
      return;
    }

    try {
      // Auto-expand the target task to make the newly nested child visible
      hierarchyManager.expandTask(targetTaskId);

      // Calculate relative position for nesting
      const relativePosition = calculateRelativePosition(null, targetTaskId, [draggedTaskId]);

      // Convert relative position to position updates and execute via positioning-v2.ts utilities
      const positionUpdates = convertRelativeToPositionUpdates(cleanedKeptTasks, [
        relativePosition,
      ]);
      await applyAndExecutePositionUpdates(cleanedKeptTasks, positionUpdates);
    } catch (error: unknown) {
      debugBusiness.workflow.error('Task nesting failed', { error, draggedTaskId, targetTaskId });

      // Clear any lingering visual dragFeedback including badges
      clearAllVisualFeedback();

      dragFeedback = 'Failed to nest task - please try again';
      setTimeout(() => (dragFeedback = ''), 3000);
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
      const isMultiSelectNest =
        taskSelection.selectedTaskIds.has(draggedTaskId) && taskSelection.selectedTaskIds.size > 1;
      if (!isMultiSelectNest) {
        await handleTaskNesting(draggedTaskId, event.dropZone.targetTaskId);
        return;
      }
    }

    // Determine if this is a multi-select drag
    const isMultiSelectDrag =
      taskSelection.selectedTaskIds.has(draggedTaskId) && taskSelection.selectedTaskIds.size > 1;

    // Calculate newParentId for both single and multi-select operations
    let newParentId: string | undefined;
    const dropIndex = event.newIndex!;

    if (event.dropZone?.mode === 'nest' && event.dropZone.targetTaskId) {
      // For nesting: all tasks become children of the target task
      newParentId = event.dropZone.targetTaskId;
    } else {
      // For all reorder operations (and any other cases), calculate parent based on visual position
      // This properly handles root-level drops, depth-based parent assignment, etc.
      newParentId = calculateParentFromPosition(dropIndex, event.dropZone?.mode || 'reorder');
    }

    // Safety validation before proceeding
    if (newParentId) {
      // Get the task IDs that are being moved
      const taskIdsToMove = isMultiSelectDrag
        ? Array.from(taskSelection.selectedTaskIds)
        : [draggedTaskId];

      // Safety check: ensure no self-references
      if (taskIdsToMove.includes(newParentId)) {
        clearAllVisualFeedback();
        return; // Silently abort - this should never happen due to handleMoveDetection
      }

      // Safety check: prevent circular references
      const wouldCreateCircular = taskIdsToMove.some((taskId) =>
        isDescendantOf(newParentId, taskId)
      );

      if (wouldCreateCircular) {
        clearAllVisualFeedback();
        return; // Silently abort - this should never happen due to handleMoveDetection
      }
    }

    // Auto-expand target task for nesting operations
    if (event.dropZone?.mode === 'nest' && newParentId) {
      hierarchyManager.expandTask(newParentId);
    }

    // Declare relativeUpdates outside try block so it's accessible in catch
    const relativeUpdates: RelativePositionUpdate[] = [];

    try {
      // Get the task IDs that are being moved (again, for the rest of the function)
      const taskIdsToMove = isMultiSelectDrag
        ? Array.from(taskSelection.selectedTaskIds)
        : [draggedTaskId];

      if (isMultiSelectDrag && taskIdsToMove.length > 1) {
        // For multi-task operations: use sequential positioning to avoid circular references
        // Sort tasks by their actual visual order from flattenedTasks
        const sortedTaskIds = Array.from(taskSelection.selectedTaskIds);
        sortedTaskIds.sort((a, b) => {
          const indexA = flattenedTasks.findIndex((item) => item.task.id === a);
          const indexB = flattenedTasks.findIndex((item) => item.task.id === b);
          return indexA - indexB;
        });

        // Identify which selected tasks are roots (parent not in selection)
        // This preserves parent-child relationships during multi-drag
        const rootTaskIds = sortedTaskIds.filter((taskId) => {
          const task = cleanedKeptTasks.find((t) => t.id === taskId);
          return !task?.parent_id || !sortedTaskIds.includes(task.parent_id);
        });

        rootTaskIds.forEach((taskId, index) => {
          const currentTask = cleanedKeptTasks.find((t) => t.id === taskId);
          if (!currentTask) return;

          if (index === 0) {
            // First task: position appropriately without considering other moving tasks
            if (event.dropZone?.mode === 'nest') {
              // For nesting: find existing children (excluding tasks being moved)
              const existingChildren = cleanedKeptTasks.filter(
                (t) => t.parent_id === newParentId && !rootTaskIds.includes(t.id)
              );

              if (existingChildren.length > 0) {
                // Position after the last existing child
                const lastChild = existingChildren[existingChildren.length - 1];
                relativeUpdates.push({
                  id: taskId,
                  parent_id: newParentId,
                  after_task_id: lastChild.id,
                });
              } else {
                // No existing children, place at first position
                relativeUpdates.push({
                  id: taskId,
                  parent_id: newParentId,
                  position: 'first',
                });
              }
            } else {
              // For reordering: use the calculated drop position but exclude moving tasks from consideration
              const firstTaskRelativePos = calculateRelativePosition(
                event.dropZone,
                newParentId ?? null,
                rootTaskIds
              );
              relativeUpdates.push(firstTaskRelativePos);
            }
          } else {
            // Subsequent tasks: position after the previous task in the sequence
            const previousTaskId = rootTaskIds[index - 1];
            relativeUpdates.push({
              id: taskId,
              parent_id: newParentId,
              after_task_id: previousTaskId,
            });
          }
        });
      } else {
        // Single task operation: use standard relative positioning
        const singleTaskUpdate = calculateRelativePosition(
          event.dropZone,
          newParentId ?? null,
          taskIdsToMove
        );
        relativeUpdates.push(singleTaskUpdate);
      }

      // Convert relative updates to position updates using positioning-v2.ts utilities
      const positionUpdates = convertRelativeToPositionUpdates(cleanedKeptTasks, relativeUpdates);

      // Execute position updates using our batch API - it handles UI updates automatically
      await applyAndExecutePositionUpdates(cleanedKeptTasks, positionUpdates);
    } catch (error: unknown) {
      debugBusiness.workflow.error('Task reorder failed', { error, relativeUpdates });

      // Clear any lingering visual dragFeedback including badges
      clearAllVisualFeedback();

      // ReactiveRecord will revert UI automatically on server error
      dragFeedback = 'Failed to reorder tasks - please try again';
      setTimeout(() => (dragFeedback = ''), 3000);
    }
  }

  // Task tree rendering is now handled by TaskHierarchyManager

  // Calculate parent task based on drop position in flattened list
  function calculateParentFromPosition(
    dropIndex: number,
    dropMode: 'reorder' | 'nest'
  ): string | undefined {
    // Use flattenedKeptTasks for position calculations (all non-discarded tasks)
    // If explicitly nesting, the target becomes the parent
    if (dropMode === 'nest') {
      const targetItem = flattenedKeptTasks[dropIndex];
      return targetItem?.task.id;
    }

    // For reordering, determine parent based on the depth we're inserting at.
    // If dropping at the very beginning, it's root level
    if (dropIndex === 0) {
      return undefined;
    }

    // Look at the task immediately before the drop position
    const previousItem = flattenedKeptTasks[dropIndex - 1];
    if (!previousItem) {
      return undefined; // Root level
    }

    // Also look at the task at the drop position (if it exists)
    const targetItem = flattenedKeptTasks[dropIndex];

    // Special case: dropping between a parent and its first child
    // If the target item is a child of the previous item, we should become a child too
    if (targetItem && targetItem.task.parent_id === previousItem.task.id) {
      return previousItem.task.id; // Become child of the parent
    }

    // Enhanced root level detection: if previous item is at depth 0 and we're not inserting as its child
    if (previousItem.depth === 0 && (!targetItem || targetItem.depth === 0)) {
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

    const targetTask = cleanedKeptTasks.find((t) => t.id === dropZone.targetTaskId);
    if (!targetTask) return dropZone;

    // If dropping below a task that has children, and the first child is immediately after it
    if (dropZone.position === 'below') {
      const hasChildren = cleanedKeptTasks.some((t) => t.parent_id === targetTask.id);
      if (hasChildren) {
        // For "below parent with children", prefer staying at parent level
        // rather than becoming first child (user can drag to middle of task to nest)
      }
    }

    return dropZone; // Return as-is for now, let parent calculation handle it
  }

  // Calculate relative position using the new simplified API
  function calculateRelativePosition(
    dropZone: DropZoneInfo | null,
    parentId: string | null,
    draggedTaskIds: string[]
  ): RelativePositionUpdate {
    // Resolve any boundary ambiguity
    const resolvedDropZone = resolveParentChildBoundary(dropZone);

    // Convert Svelte tasks to Rails task format and sort by position
    // Important: Sort to use ReactiveRecord's true positions, not DOM order during drag
    const railsTasks: Task[] = cleanedKeptTasks
      .map((t) => ({
        id: t.id,
        position: t.position || 0,
        parent_id: t.parent_id,
        title: t.title,
      }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Use the new relative position calculator
    const result = calculateRelativePositionFromTarget(
      railsTasks,
      resolvedDropZone,
      parentId,
      draggedTaskIds
    );

    return result.relativePosition;
  }

  // NOTE: Legacy calculatePositionFromTarget function removed as per TODO comment
</script>

<div class="task-list" bind:this={taskListContainer}>
  <!-- Tasks container - always show to include new task row -->
  <div
    class="tasks-container"
    data-testid="task-list"
    use:storeDragAction={{
      onBeforeStart: handleBeforeSortStart,
      onStart: handleSortStart,
      onEnd: handleSortEnd,
      onSort: handleTaskReorder,
      onMove: handleMoveDetection,
    }}
    bind:this={tasksContainer}
  >
    <!-- Add New Task Row at top when list is empty -->
    {#if canCreateTasks && hasNoTasks && showNewTaskRow}
      <NewTaskRow
        mode="bottom-row"
        depth={0}
        manager={newTaskManager}
        taskState={bottomTaskState}
        isEmptyList={true}
        onStateChange={(changes) => taskCreationManager.updateState('bottom', changes)}
        on:titlechange={(e) => taskCreationManager.setTitle('bottom', e.detail.value)}
      />
    {/if}

    <!-- Only show empty state when job has actually loaded AND tasks are truly empty -->
    {#if cleanedTasks.length === 0 && jobLoaded}
      {#if isNewJobMode}
        <!-- NEW: New job empty state -->
        <div class="empty-state empty-state--new-job">
          <div class="empty-content">
            <h3>Creating New Job</h3>
            <p>Give your job a name to get started. You can add tasks once the job is created.</p>
            {#if onCancel}
              <button class="cancel-link" onclick={onCancel}> Cancel </button>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Existing "No tasks" empty state -->
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h4>{taskFilter.showDeleted ? 'No deleted tasks' : 'No tasks yet'}</h4>
          {#if canCreateTasks}
            <p>Click "New Task" above to get started.</p>
          {:else}
            <p>Clear the deleted filter to view active tasks.</p>
          {/if}
        </div>
      {/if}
    {/if}

    {#if hierarchicalTasks.length > 0}
      {#each hierarchicalTasks as task (task.id)}
        {@render renderTaskWithSubtasks(task)}
      {/each}
    {/if}

    {#snippet renderTaskWithSubtasks(task)}
      <!-- Render the task -->
      <TaskRow
        {task}
        depth={0}
        hasSubtasks={task.subtasks && task.subtasks.length > 0}
        isExpanded={hierarchyManager.isTaskExpanded(task.id)}
        isSelected={taskSelection.selectedTaskIds.has(task.id)}
        isEditing={editingTaskId === task.id}
        isDeleting={deletingTaskIds.has(task.id)}
        canEdit={canEditTasks}
        {jobId}
        {batchTaskDetails}
        {currentTime}
        on:taskaction={handleTaskAction}
      />

      <!-- Inline New Task Row for this task -->
      {#if canCreateTasks && insertNewTaskAfter === task.id && inlineTaskState.isShowing && showNewTaskRow}
        <NewTaskRow
          mode="inline-after-task"
          depth={0}
          manager={inlineTaskManager}
          taskState={inlineTaskState}
          onStateChange={(changes) => taskCreationManager.updateState('inline', changes)}
          on:titlechange={(e) => taskCreationManager.setTitle('inline', e.detail.value)}
        />
      {/if}

      <!-- Animated subtask container with recursive rendering -->
      {#if task.subtasks && task.subtasks.length > 0 && hierarchyManager.isTaskExpanded(task.id)}
        <div
          class="subtask-animation-container"
          transition:conditionalSlide|global={{
            disabled: !shouldAnimateTask(task.id),
          }}
          onintrostart={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = true;
          }}
          onintroend={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = false;
          }}
          onoutrostart={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = true;
          }}
          onoutroend={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = false;
          }}
        >
          {#each task.subtasks as subtask (subtask.id)}
            {@render renderSubtask(subtask, 1)}
          {/each}
        </div>
      {/if}
    {/snippet}

    {#snippet renderSubtask(task, depth)}
      <!-- Render the subtask -->
      <TaskRow
        {task}
        {depth}
        hasSubtasks={task.subtasks && task.subtasks.length > 0}
        isExpanded={hierarchyManager.isTaskExpanded(task.id)}
        isSelected={taskSelection.selectedTaskIds.has(task.id)}
        isEditing={editingTaskId === task.id}
        isDeleting={deletingTaskIds.has(task.id)}
        canEdit={canEditTasks}
        {jobId}
        {batchTaskDetails}
        {currentTime}
        on:taskaction={handleTaskAction}
      />

      <!-- Inline New Task Row for this subtask -->
      {#if canCreateTasks && insertNewTaskAfter === task.id && inlineTaskState.isShowing && showNewTaskRow}
        <NewTaskRow
          mode="inline-after-task"
          {depth}
          manager={inlineTaskManager}
          taskState={inlineTaskState}
          onStateChange={(changes) => taskCreationManager.updateState('inline', changes)}
          on:titlechange={(e) => taskCreationManager.setTitle('inline', e.detail.value)}
        />
      {/if}

      <!-- Animated nested subtask container (recursive!) -->
      {#if task.subtasks && task.subtasks.length > 0 && hierarchyManager.isTaskExpanded(task.id)}
        <div
          class="subtask-animation-container"
          transition:conditionalSlide|global={{
            disabled: !shouldAnimateTask(task.id),
          }}
          onintrostart={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = true;
          }}
          onintroend={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = false;
          }}
          onoutrostart={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = true;
          }}
          onoutroend={() => {
            if (shouldAnimateTask(task.id)) isSlideAnimating = false;
          }}
        >
          {#each task.subtasks as nestedSubtask (nestedSubtask.id)}
            {@render renderSubtask(nestedSubtask, depth + 1)}
          {/each}
        </div>
      {/if}
    {/snippet}

    <!-- Add New Task Row at bottom when tasks exist -->
    {#if canCreateTasks && !hasNoTasks && showNewTaskRow}
      <NewTaskRow
        mode="bottom-row"
        depth={0}
        manager={newTaskManager}
        taskState={bottomTaskState}
        isEmptyList={false}
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
  title={deletionTitle}
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

  .empty-state--new-job {
    padding: 40px 20px;
  }

  .empty-state--new-job .empty-content h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px 0;
  }

  .empty-state--new-job .empty-content p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .cancel-link {
    background: none;
    border: none;
    color: var(--accent-blue);
    font-size: 14px;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .cancel-link:hover {
    color: var(--accent-blue-hover);
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
    color: var(--accent-green, #32d74b);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid rgba(50, 215, 75, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  .dragFeedback-message.error {
    background-color: rgba(255, 69, 58, 0.2);
    color: var(--accent-red, #ff453a);
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
    background: linear-gradient(90deg, #007aff, #0099ff);
    border-radius: 2px;
    box-shadow: 0 1px 4px rgba(0, 122, 255, 0.4);
    pointer-events: none;
    z-index: 1000;
  }

  :global([role='button'][data-task-id].drag-nest-target) {
    background-color: var(--accent-blue) !important;
    color: white !important;
    text-shadow: 0.5px 0.5px 2px rgba(0, 0, 0, 0.75) !important;
    border-radius: 8px !important;
    transition: none !important;
  }

  /* Subtask animation container */
  .subtask-animation-container {
    overflow: hidden;
    transform-origin: top;
    /* Ensure proper height calculation for slide transition */
    display: block;
    /* Remove any margin collapse issues */
    border-top: 0;
    border-bottom: 0;
    /* Ensure child elements don't affect container height calculation */
    contain: layout;
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
