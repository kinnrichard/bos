<script lang="ts">
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { selectedTaskStatuses, shouldShowTask } from '$lib/stores/taskFilter';
  import { taskSelection, type TaskSelectionState } from '$lib/stores/taskSelection';
  import { tasksService } from '$lib/api/tasks';
  import { dndzone, TRIGGERS, SOURCES } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { quintOut } from 'svelte/easing';
  
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
  }>;
  
  export let jobId: string; // Used for drag & drop functionality

  // Track collapsed/expanded state of tasks with subtasks
  let expandedTasks = new Set<string>();
  
  // Drag & drop state
  let draggedTaskId: string | null = null;
  let isDragging = false;
  let dragFeedback = '';
  
  // Multi-select state
  let flatTaskIds: string[] = [];
  
  // Track optimistic updates for rollback
  let optimisticUpdates = new Map<string, { originalPosition: number; originalParentId?: string }>();
  
  // Animation duration for smooth transitions
  const flipDurationMs = 300;

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
  
  // Auto-expand tasks that have subtasks by default
  $: {
    if (hierarchicalTasks.length > 0) {
      hierarchicalTasks.forEach(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          expandedTasks.add(task.id);
        }
      });
      expandedTasks = expandedTasks; // Trigger reactivity
    }
  }
  
  
  // Make rendering reactive to expandedTasks state changes
  $: flattenedTasks = (() => {
    // Include expandedTasks in dependency by referencing it
    const _ = expandedTasks; 
    return hierarchicalTasks.flatMap(task => renderTaskTree(task, 0));
  })();
  
  // Update flat task IDs for multi-select functionality
  $: flatTaskIds = flattenedTasks.map(item => item.task.id);
  
  // Prepare tasks for drag & drop (svelte-dnd-action format)
  $: dndItems = flattenedTasks.map(item => ({
    id: item.task.id,
    ...item
  }));
  
  // Debug: Log hierarchical tasks to see the structure
  $: {
    if (hierarchicalTasks.length > 0) {
      console.log('Hierarchical tasks:', hierarchicalTasks);
      hierarchicalTasks.forEach(task => {
        if (task.subtasks.length > 0) {
          console.log(`Task "${task.title}" has ${task.subtasks.length} subtasks:`, task.subtasks);
        }
      });
    }
  }
  

  function toggleTaskExpansion(taskId: string) {
    if (expandedTasks.has(taskId)) {
      expandedTasks.delete(taskId);
    } else {
      expandedTasks.add(taskId);
    }
    expandedTasks = expandedTasks; // Trigger reactivity
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

  // Multi-select click handler
  function handleTaskClick(event: MouseEvent, taskId: string) {
    // Prevent event bubbling to avoid conflicts
    event.stopPropagation();
    
    if (event.shiftKey) {
      // Shift+click: range selection
      taskSelection.selectRange(taskId, flatTaskIds);
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: toggle selection
      taskSelection.toggleTask(taskId);
    } else {
      // Normal click: single selection
      taskSelection.selectTask(taskId);
    }
  }

  // Keyboard handler for accessibility
  function handleTaskKeydown(event: KeyboardEvent, taskId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      
      // Treat as click with current modifier keys
      const mockEvent = {
        stopPropagation: () => {},
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey
      } as MouseEvent;
      
      handleTaskClick(mockEvent, taskId);
    }
  }

  // Task status change handler with optimistic updates
  async function handleStatusChange(taskId: string, newStatus: string) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const originalStatus = task.status;
    
    // Optimistic update
    task.status = newStatus;
    tasks = [...tasks]; // Trigger reactivity
    
    try {
      await tasksService.updateTaskStatus(jobId, taskId, newStatus);
      console.log('Status updated successfully:', taskId, newStatus);
    } catch (error) {
      // Rollback on error
      task.status = originalStatus;
      tasks = [...tasks];
      console.error('Failed to update status:', error);
      dragFeedback = 'Failed to update task status';
      setTimeout(() => dragFeedback = '', 3000);
    }
  }

  // Track multi-select drag state
  let isMultiSelectDrag = false;
  let multiSelectDragCount = 0;

  // Drag & drop handlers
  function handleDndConsider(event: CustomEvent) {
    // Update visual state during drag
    const items = event.detail.items;
    
    // Check if dragging has started
    if (event.detail.info && event.detail.info.trigger === TRIGGERS.DRAG_STARTED) {
      isDragging = true;
      
      // Check if we're dragging a selected task with multiple selections
      const draggedItem = event.detail.info.id;
      isMultiSelectDrag = $taskSelection.selectedTaskIds.has(draggedItem) && $taskSelection.selectedTaskIds.size > 1;
      multiSelectDragCount = $taskSelection.selectedTaskIds.size;
      
      if (isMultiSelectDrag) {
        dragFeedback = `Moving ${multiSelectDragCount} selected tasks...`;
      } else {
        dragFeedback = 'Reordering task...';
      }
    }
    
    // Update dndItems to maintain reactivity during drag
    dndItems = items;
  }

  async function handleDndFinalize(event: CustomEvent) {
    const items = event.detail.items;
    
    // End dragging state
    isDragging = false;
    draggedTaskId = null;
    
    // Reset multi-select drag state
    const wasMultiSelectDrag = isMultiSelectDrag;
    isMultiSelectDrag = false;
    multiSelectDragCount = 0;
    
    let positionUpdates: Array<{id: string, position: number}> = [];
    
    if (wasMultiSelectDrag) {
      // Handle multi-select drag: move all selected tasks as a contiguous group
      const draggedItem = event.detail.info?.id;
      const draggedIndex = items.findIndex((item: any) => item.id === draggedItem);
      const selectedTaskIds = Array.from($taskSelection.selectedTaskIds);
      
      // Sort selected tasks by their current position to maintain relative order
      const selectedTasks = selectedTaskIds
        .map(id => tasks.find(t => t.id === id))
        .filter(Boolean)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Get all tasks and separate selected from non-selected
      const allTasks = tasks.slice().sort((a, b) => (a.position || 0) - (b.position || 0));
      const nonSelectedTasks = allTasks.filter(task => !selectedTaskIds.includes(task.id));
      
      // Insert selected tasks as a group at the drop position
      const insertPosition = draggedIndex;
      const reorderedTasks = [
        ...nonSelectedTasks.slice(0, insertPosition),
        ...selectedTasks,
        ...nonSelectedTasks.slice(insertPosition)
      ];
      
      // Calculate new positions for all tasks
      reorderedTasks.forEach((task, index) => {
        const newPosition = index + 1;
        
        // Store original for rollback
        optimisticUpdates.set(task.id, {
          originalPosition: task.position || 0,
          originalParentId: task.parent_id
        });
        
        positionUpdates.push({
          id: task.id,
          position: newPosition
        });
      });
      
    } else {
      // Handle single task drag (existing logic)
      positionUpdates = items.map((item: any, index: number) => {
        const newPosition = index + 1;
        const originalTask = tasks.find(t => t.id === item.id);
        
        // Store original for rollback
        optimisticUpdates.set(item.id, {
          originalPosition: originalTask?.position || 0,
          originalParentId: originalTask?.parent_id
        });
        
        return {
          id: item.id,
          position: newPosition
        };
      });
    }
    
    // Apply optimistic updates to tasks array
    tasks = tasks.map(task => {
      const update = positionUpdates.find(u => u.id === task.id);
      if (update) {
        return { ...task, position: update.position };
      }
      return task;
    });
    
    try {
      // Send batch reorder to server  
      await tasksService.batchReorderTasks(jobId, { positions: positionUpdates });
      
      dragFeedback = 'Tasks reordered successfully!';
      setTimeout(() => dragFeedback = '', 2000);
      
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
      
      dragFeedback = error.response?.data?.error || 'Failed to reorder tasks';
      setTimeout(() => dragFeedback = '', 5000);
      
      optimisticUpdates.clear();
    }
  }

  // Recursive function to render task tree with proper depth and visibility
  function renderTaskTree(task: any, depth: number): Array<{
    task: any;
    depth: number;
    hasSubtasks: boolean;
    isExpanded: boolean;
  }> {
    const result = [];
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = isTaskExpanded(task.id);
    
    // Add the current task
    result.push({
      task,
      depth,
      hasSubtasks,
      isExpanded
    });
    
    // Add subtasks if expanded
    if (hasSubtasks && isExpanded) {
      for (const subtask of task.subtasks) {
        result.push(...renderTaskTree(subtask, depth + 1));
      }
    }
    
    return result;
  }
</script>

<div class="task-list">
  {#if tasks.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h4>No tasks yet</h4>
      <p>Tasks will appear here when they are added to this job.</p>
    </div>
  {:else}
    <div 
      class="tasks-container"
      use:dndzone={{
        items: dndItems,
        flipDurationMs: 200,
        type: 'tasks',
        dragDisabled: false,
        dropTargetStyle: {},
        morphDisabled: true,
        dropFromOthersDisabled: true
      }}
      on:consider={handleDndConsider}
      on:finalize={handleDndFinalize}
    >
      {#each dndItems as renderItem (renderItem.id)}
        {@const isSelected = $taskSelection.selectedTaskIds.has(renderItem.task.id)}
        {@const isDraggedItem = draggedTaskId === renderItem.task.id}
        <div 
          class="task-item"
          class:completed={renderItem.task.status === 'successfully_completed'}
          class:in-progress={renderItem.task.status === 'in_progress'}
          class:cancelled={renderItem.task.status === 'cancelled' || renderItem.task.status === 'failed'}
          class:has-subtasks={renderItem.hasSubtasks}
          class:selected={isSelected}
          class:dragging={isDraggedItem}
          class:multi-select-active={$taskSelection.isMultiSelectActive}
          style="--depth: {renderItem.depth}"
          data-task-id={renderItem.task.id}
          role="button"
          tabindex="0"
          aria-label="Task: {renderItem.task.title}. {isSelected ? 'Selected' : 'Not selected'}. Click to select, Shift+click for range selection, Ctrl/Cmd+click to toggle."
          animate:flip={{ duration: flipDurationMs, easing: quintOut }}
          on:click={(e) => handleTaskClick(e, renderItem.task.id)}
          on:keydown={(e) => handleTaskKeydown(e, renderItem.task.id)}
        >
          <!-- Disclosure Triangle (if has subtasks) -->
          {#if renderItem.hasSubtasks}
            <button 
              class="disclosure-button"
              on:click={() => toggleTaskExpansion(renderItem.task.id)}
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
                // Cycle through statuses: new_task -> in_progress -> successfully_completed -> new_task
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
            
            <!-- Multi-select drag indicator -->
            {#if isDragging && isMultiSelectDrag && $taskSelection.selectedTaskIds.has(renderItem.task.id)}
              <div class="multi-drag-badge">
                +{multiSelectDragCount - 1} more
              </div>
            {/if}
          </div>

          <!-- Task Actions (Hidden, shown on hover) -->
          <div class="task-actions">
            {#if isSelected}
              <div class="selection-indicator" title="Selected">✓</div>
            {/if}
            <button 
              class="task-action-button"
              on:click|stopPropagation={() => console.log('Task details:', renderItem.task.id)}
              title="Task details (coming soon)"
              disabled
            >
              <span class="action-icon">ⓘ</span>
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Drag & Drop Feedback and Multi-Select Info -->
    <div class="task-list-footer">
      {#if dragFeedback}
        <div class="feedback-message" class:error={dragFeedback.includes('Failed')}>
          {dragFeedback}
        </div>
      {/if}
      
      {#if $taskSelection.isMultiSelectActive}
        <div class="multi-select-info">
          {$taskSelection.selectedTaskIds.size} tasks selected
          <button 
            class="clear-selection"
            on:click={() => taskSelection.clearSelection()}
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      {/if}
      
      <p class="feature-note">
        💡 Drag to reorder • Click status to change • Shift/Cmd+click to select multiple
      </p>
    </div>
  {/if}
</div>

<style>
  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0; /* Remove gap to match Rails tight spacing */
    background-color: var(--bg-black);
  }

  /* Drop indicator styles for blue line */
  :global(.task-item.drop-target-above)::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #007AFF;
    border-radius: 2px;
    z-index: 1000;
  }

  :global(.task-item.drop-target-below)::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #007AFF;
    border-radius: 2px;
    z-index: 1000;
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
    gap: 0; /* No gap between tasks like Rails */
  }

  .task-item {
    display: flex;
    align-items: flex-start;
    padding: 4px !important; /* Match Rails minimal padding */
    padding-left: calc(4px + (var(--depth, 0) * 32px)) !important; /* Rails indentation */
    border: none !important;
    border-radius: 8px !important;
    background: none !important;
    background-color: transparent !important;
    transition: all 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    position: relative;
    will-change: transform;
  }

  /* Selection state styling */
  .task-item.selected {
    background-color: rgba(0, 163, 255, 0.15) !important;
    border-left: 3px solid var(--accent-blue) !important;
    padding-left: calc(1px + (var(--depth, 0) * 32px)) !important; /* Adjust for border */
  }

  /* Multi-select mode styling */
  .task-item.multi-select-active {
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 6px !important;
  }

  .task-item.multi-select-active.selected {
    border: 1px solid var(--accent-blue) !important;
    background-color: rgba(0, 163, 255, 0.2) !important;
  }

  /* Dragging state styling - minimal visual changes */
  .task-item.dragging {
    opacity: 0.8;
    z-index: 1000;
    /* Override selection styling during drag */
    background-color: transparent !important;
    border: none !important;
    border-left: none !important;
    padding-left: calc(4px + (var(--depth, 0) * 32px)) !important; /* Reset padding */
  }

  /* Multi-select drag badge */
  .multi-drag-badge {
    display: inline-block;
    background-color: var(--accent-blue);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .task-item.has-subtasks {
    /* Remove border styling, Rails doesn't use this */
  }

  .task-item:hover {
    /* Subtle hover effect like Rails */
    background-color: rgba(255, 255, 255, 0.05) !important;
  }

  .task-item.completed {
    /* Apply opacity to individual elements, not the whole task */
  }

  .task-item.completed .task-title,
  .task-item.completed .task-content,
  .task-item.completed .task-meta {
    opacity: 0.75;
    color: #8E8E93;
  }

  .task-item.in-progress {
    /* Remove border styling for status, Rails uses different approach */
  }

  .task-item.cancelled .task-title,
  .task-item.cancelled .task-content,
  .task-item.cancelled .task-meta {
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

  .task-header {
    display: flex;
    align-items: center;
    margin-bottom: 0; /* Rails doesn't have margin here */
    gap: 0; /* Rails uses tighter spacing */
  }

  .task-disclosure {
    display: flex;
    align-items: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-right: 4px; /* Space between chevron and status */
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
    transition: transform 0.2s ease, opacity 0.15s ease;
    display: block;
    transform: rotate(0deg); /* Default: pointing right */
  }
  
  /* When expanded, rotate chevron-right 90 degrees to point down */
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

  .status-label {
    display: none; /* Hide status label to match Rails minimal design */
  }

  .task-meta {
    display: none; /* Hide metadata in main view like Rails */
  }

  .task-updated {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .task-body {
    flex: 1;
    min-width: 0;
  }

  .task-title {
    font-size: 17px; /* Match Rails title size */
    color: #FFFFFF; /* Rails white color */
    margin: 0;
    margin-bottom: 2px;
    word-wrap: break-word;
    font-weight: 400; /* Rails uses normal weight */
    line-height: 1.3;
    cursor: text;
    outline: none;
    display: inline-block;
    min-width: 75px;
    width: fit-content;
    max-width: 100%;
    user-select: text;
  }

  .task-description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .task-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    pointer-events: none; /* Allow clicks to pass through container */
  }

  .task-actions > * {
    pointer-events: auto; /* Enable on children */
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

  /* Show action buttons on task hover - Rails behavior */
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

  /* Selection indicator */
  .selection-indicator {
    background-color: var(--accent-blue);
    color: white;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    margin-right: 4px;
    animation: scaleIn 0.2s ease-out;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Drag & drop visual feedback */
  .tasks-container:global(.drag-active) {
    background-color: rgba(0, 163, 255, 0.05);
    border-radius: 8px;
    border: 2px dashed var(--accent-blue);
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

  /* Feedback messages */
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

  /* Multi-select info */
  .multi-select-info {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: rgba(0, 163, 255, 0.15);
    color: var(--accent-blue);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    border: 1px solid rgba(0, 163, 255, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  .clear-selection {
    background: none;
    border: none;
    color: var(--accent-blue);
    cursor: pointer;
    padding: 2px;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    transition: all 0.15s ease;
  }

  .clear-selection:hover {
    background-color: rgba(0, 163, 255, 0.2);
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

  .feature-note {
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: center;
    margin: 0;
    font-style: italic;
    opacity: 0.7;
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
      min-height: 44px; /* iOS touch target minimum */
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
    
    /* Show action buttons always on touch devices */
    .task-action-button {
      opacity: 0.7;
      pointer-events: auto;
    }
    
    /* Improve drag handle for touch */
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
    
    .task-item.dragging::before {
      display: none;
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
      border-left: 4px solid var(--accent-blue) !important;
    }
  }

  /* Smooth transitions for better UX */
  .task-item,
  .disclosure-button,
  .status-emoji,
  .task-action-button {
    transition: all 0.15s ease;
  }
</style>