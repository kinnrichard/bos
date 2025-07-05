<script lang="ts">
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { selectedTaskStatuses, shouldShowTask } from '$lib/stores/taskFilter';
  import { taskSelection, type TaskSelectionState } from '$lib/stores/taskSelection';
  import { tasksService } from '$lib/api/tasks';
  import { sortable, showDropIndicator, hideDropIndicator } from '$lib/utils/sortable-action';
  import type { SortableEvent } from 'sortablejs';

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
  }>;
  
  export let jobId: string;

  // Track collapsed/expanded state of tasks with subtasks
  let expandedTasks = new Set<string>();
  
  // Drag & drop state
  let isDragging = false;
  let feedback = '';
  
  // Multi-select state
  let flatTaskIds: string[] = [];
  
  // Track optimistic updates for rollback
  let optimisticUpdates = new Map<string, { originalPosition: number; originalParentId?: string }>();

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
      expandedTasks = expandedTasks;
    }
  }
  
  // Make rendering reactive to expandedTasks state changes
  $: flattenedTasks = (() => {
    const _ = expandedTasks; 
    return hierarchicalTasks.flatMap(task => renderTaskTree(task, 0));
  })();
  
  // Update flat task IDs for multi-select functionality
  $: flatTaskIds = flattenedTasks.map(item => item.task.id);

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
  function handleSortStart(event: SortableEvent) {
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

  function handleSortEnd(event: SortableEvent) {
    isDragging = false;
    
    // Remove multi-drag badge if it exists
    const badge = event.item.querySelector('.multi-drag-badge');
    if (badge) {
      badge.remove();
    }
    
    // Handle the actual reordering
    if (event.oldIndex !== undefined && event.newIndex !== undefined && event.oldIndex !== event.newIndex) {
      handleTaskReorder(event);
    }
  }

  async function handleTaskReorder(event: SortableEvent) {
    const draggedTaskId = event.item.dataset.taskId;
    if (!draggedTaskId) return;

    // Determine if this is a multi-select drag
    const isMultiSelectDrag = $taskSelection.selectedTaskIds.has(draggedTaskId) && $taskSelection.selectedTaskIds.size > 1;
    
    let positionUpdates: Array<{id: string, position: number}> = [];
    
    if (isMultiSelectDrag) {
      // Handle multi-select drag: move all selected tasks as a contiguous group
      const selectedTaskIds = Array.from($taskSelection.selectedTaskIds);
      const selectedTasks = selectedTaskIds
        .map(id => tasks.find(t => t.id === id))
        .filter(Boolean)
        .sort((a, b) => (a!.position || 0) - (b!.position || 0));
      
      const allTasks = tasks.slice().sort((a, b) => (a.position || 0) - (b.position || 0));
      const nonSelectedTasks = allTasks.filter(task => !selectedTaskIds.includes(task.id));
      
      // Insert selected tasks as a group at the drop position
      const insertPosition = event.newIndex!;
      const reorderedTasks = [
        ...nonSelectedTasks.slice(0, insertPosition),
        ...selectedTasks,
        ...nonSelectedTasks.slice(insertPosition)
      ];
      
      // Calculate new positions for all tasks
      reorderedTasks.forEach((task, index) => {
        const newPosition = index + 1;
        
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
      // Handle single task drag
      const currentTasks = [...flattenedTasks.map(item => item.task)];
      const draggedTask = currentTasks[event.oldIndex!];
      const newIndex = event.newIndex!;
      
      // Remove from old position
      currentTasks.splice(event.oldIndex!, 1);
      // Insert at new position
      currentTasks.splice(newIndex, 0, draggedTask);
      
      positionUpdates = currentTasks.map((task, index) => {
        optimisticUpdates.set(task.id, {
          originalPosition: task.position || 0,
          originalParentId: task.parent_id
        });
        
        return {
          id: task.id,
          position: index + 1
        };
      });
    }
    
    // Apply optimistic updates
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
</script>

<div class="task-list">
  {#if tasks.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h4>No tasks yet</h4>
      <p>Tasks will appear here when they are added to this job.</p>
    </div>
  {:else}
    <!-- Sortable tasks container -->
    <div 
      class="tasks-container"
      use:sortable={{
        animation: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        ghostClass: 'task-ghost',
        chosenClass: 'task-chosen',
        dragClass: 'task-dragging',
        multiDrag: true,
        multiDragKey: 'ctrl',
        selectedClass: 'task-selected-for-drag',
        fallbackTolerance: 0,
        emptyInsertThreshold: 5,
        onStart: handleSortStart,
        onEnd: handleSortEnd
      }}
    >
      {#each flattenedTasks as renderItem, index (renderItem.task.id)}
        <div 
          class="task-item"
          class:completed={renderItem.task.status === 'successfully_completed'}
          class:in-progress={renderItem.task.status === 'in_progress'}
          class:cancelled={renderItem.task.status === 'cancelled' || renderItem.task.status === 'failed'}
          class:has-subtasks={renderItem.hasSubtasks}
          class:selected={$taskSelection.selectedTaskIds.has(renderItem.task.id)}
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
          </div>

          <!-- Task Actions -->
          <div class="task-actions">
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
    opacity: 0.8;
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

  /* Global SortableJS drop indicator styles */
  :global(.sortable-drop-indicator) {
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

  /* Smooth transitions */
  .task-item,
  .disclosure-button,
  .status-emoji,
  .task-action-button {
    transition: all 0.15s ease;
  }
</style>