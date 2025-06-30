<script lang="ts">
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { selectedTaskStatuses, shouldShowTask } from '$lib/stores/taskFilter';
  
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
  
  export let jobId: string; // Used for future drag & drop functionality

  // Track collapsed/expanded state of tasks with subtasks
  let expandedTasks = new Set<string>();

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
    
    return rootTasks;
  }

  $: hierarchicalTasks = organizeTasksHierarchically(tasks, $selectedTaskStatuses);
  
  // Make rendering reactive to expandedTasks state changes
  $: flattenedTasks = (() => {
    // Include expandedTasks in dependency by referencing it
    const _ = expandedTasks; 
    return hierarchicalTasks.flatMap(task => renderTaskTree(task, 0));
  })();
  
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
  
  // Debug: Log when flattened tasks change
  $: {
    console.log('Flattened tasks updated:', flattenedTasks.length, 'items');
  }

  function toggleTaskExpansion(taskId: string) {
    console.log('Toggling task expansion for:', taskId, 'Currently expanded:', expandedTasks.has(taskId));
    if (expandedTasks.has(taskId)) {
      expandedTasks.delete(taskId);
    } else {
      expandedTasks.add(taskId);
    }
    expandedTasks = expandedTasks; // Trigger reactivity
    console.log('New expanded state:', expandedTasks);
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

  // Future: This will be enhanced with drag & drop functionality
  // and status change actions as mentioned in the story requirements
  function handleTaskClick(taskId: string) {
    // Placeholder for future task detail/edit functionality
    console.log('Task clicked:', taskId);
  }

  function handleStatusChange(taskId: string, newStatus: string) {
    // Placeholder for future status change functionality
    console.log('Status change:', taskId, newStatus);
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
    
    // Debug logging
    if (hasSubtasks) {
      console.log(`Rendering task "${task.title}" at depth ${depth}, has ${task.subtasks.length} subtasks, expanded: ${isExpanded}`);
    }
    
    // Add the current task
    result.push({
      task,
      depth,
      hasSubtasks,
      isExpanded
    });
    
    // Add subtasks if expanded
    if (hasSubtasks && isExpanded) {
      console.log(`Adding ${task.subtasks.length} subtasks for "${task.title}"`);
      for (const subtask of task.subtasks) {
        result.push(...renderTaskTree(subtask, depth + 1));
      }
    }
    
    console.log(`renderTaskTree for "${task.title}" returning ${result.length} items`);
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
    <div class="tasks-container">
      {#each flattenedTasks as renderItem (renderItem.task.id)}
        <div 
          class="task-item"
          class:completed={renderItem.task.status === 'successfully_completed'}
          class:in-progress={renderItem.task.status === 'in_progress'}
          class:cancelled={renderItem.task.status === 'cancelled' || renderItem.task.status === 'failed'}
          class:has-subtasks={renderItem.hasSubtasks}
          style="--depth: {renderItem.depth}"
          data-task-id={renderItem.task.id}
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
              on:click={() => handleStatusChange(renderItem.task.id, renderItem.task.status)}
              disabled
              title="Change status (coming soon)"
            >
              {getTaskStatusEmoji(renderItem.task.status)}
            </button>
          </div>
          
          <!-- Task Content -->
          <div class="task-content">
            <h5 class="task-title">{renderItem.task.title}</h5>
          </div>

          <!-- Task Actions (Hidden, shown on hover) -->
          <div class="task-actions">
            <button 
              class="task-action-button"
              on:click={() => handleTaskClick(renderItem.task.id)}
              disabled
              title="Task details (coming soon)"
            >
              <span class="action-icon">ⓘ</span>
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Drag & Drop Placeholder -->
    <div class="task-list-footer">
      <p class="feature-note">
        🔄 Drag & drop reordering and status changes coming soon
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
    transition: opacity 0.2s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: default;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    position: relative;
    will-change: transform;
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

  .task-list-footer {
    margin-top: 20px;
    padding: 12px;
    text-align: center;
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

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .task-item:hover {
      background-color: rgba(255, 255, 255, 0.1) !important;
    }

    .task-action-button {
      border: 1px solid var(--border-primary);
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