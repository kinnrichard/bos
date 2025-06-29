<script lang="ts">
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  
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

  // Organize tasks into hierarchical structure
  function organizeTasksHierarchically(taskList: typeof tasks) {
    const taskMap = new Map();
    const rootTasks: any[] = [];
    
    // First pass: create map of all tasks
    taskList.forEach(task => {
      taskMap.set(task.id, {
        ...task,
        subtasks: []
      });
    });
    
    // Second pass: organize into hierarchy
    taskList.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id);
      if (task.parent_id && taskMap.has(task.parent_id)) {
        taskMap.get(task.parent_id).subtasks.push(taskWithSubtasks);
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });
    
    return rootTasks;
  }

  $: hierarchicalTasks = organizeTasksHierarchically(tasks);
  
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
      {#each hierarchicalTasks as task (task.id)}
        {@const hasSubtasks = task.subtasks && task.subtasks.length > 0}
        {@const isExpanded = isTaskExpanded(task.id)}
        {#each renderTaskTree(task, 0) as renderItem}
          <div 
            class="task-item"
            class:completed={renderItem.task.status === 'successfully_completed'}
            class:in-progress={renderItem.task.status === 'in_progress'}
            class:cancelled={renderItem.task.status === 'cancelled' || renderItem.task.status === 'failed'}
            class:has-subtasks={renderItem.hasSubtasks}
            style="--depth: {renderItem.depth}"
            data-task-id={renderItem.task.id}
          >
          <!-- Task Main Content -->
          <div class="task-content">
            <div class="task-header">
              <!-- Disclosure Triangle -->
              <div class="task-disclosure">
                {#if renderItem.hasSubtasks}
                  <button 
                    class="disclosure-button"
                    on:click={() => toggleTaskExpansion(renderItem.task.id)}
                    aria-label={renderItem.isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                  >
                    <img 
                      src={renderItem.isExpanded ? chevronDown : chevronRight} 
                      alt={renderItem.isExpanded ? 'Expanded' : 'Collapsed'}
                      class="chevron-icon"
                    />
                  </button>
                {:else}
                  <div class="disclosure-spacer"></div>
                {/if}
              </div>
              
              <div class="task-status">
                <span class="status-emoji">{getTaskStatusEmoji(renderItem.task.status)}</span>
                <span class="status-label">{getStatusLabel(renderItem.task.status)}</span>
              </div>
              <div class="task-meta">
                <span class="task-updated">{formatDateTime(renderItem.task.updated_at)}</span>
              </div>
            </div>

            <div class="task-body">
              <h5 class="task-title">{renderItem.task.title}</h5>
            </div>
          </div>

          <!-- Task Actions (Placeholder for future functionality) -->
          <div class="task-actions">
            <button 
              class="task-action-button"
              on:click={() => handleTaskClick(renderItem.task.id)}
              disabled
              title="Task details (coming soon)"
            >
              <span class="action-icon">📝</span>
            </button>
            
            <!-- Status Change Button (Future Enhancement) -->
            {#if renderItem.task.status !== 'successfully_completed'}
              <button 
                class="task-action-button"
                on:click={() => handleStatusChange(renderItem.task.id, 'successfully_completed')}
                disabled
                title="Mark complete (coming soon)"
              >
                <span class="action-icon">✅</span>
              </button>
            {/if}
          </div>
        </div>
        {/each}
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
    gap: 16px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
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
    gap: 8px;
  }

  .task-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    padding-left: calc(16px + (var(--depth, 0) * 24px));
    background-color: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    transition: all 0.15s ease;
    cursor: pointer;
    position: relative;
  }

  .task-item.has-subtasks {
    border-left: 3px solid var(--accent-blue);
  }

  .task-item:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }

  .task-item.completed {
    opacity: 0.7;
    border-color: var(--accent-green);
  }

  .task-item.in-progress {
    border-color: var(--accent-blue);
  }

  .task-item.cancelled {
    opacity: 0.6;
    border-color: var(--accent-red);
  }

  .task-content {
    flex: 1;
    min-width: 0;
  }

  .task-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
  }

  .task-disclosure {
    display: flex;
    align-items: center;
    width: 20px;
    flex-shrink: 0;
  }

  .disclosure-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    border-radius: 2px;
    transition: all 0.15s ease;
  }

  .disclosure-button:hover {
    background-color: var(--bg-tertiary);
  }

  .chevron-icon {
    width: 12px;
    height: 12px;
    opacity: 0.7;
    transition: opacity 0.15s ease;
  }

  .disclosure-button:hover .chevron-icon {
    opacity: 1;
  }

  .disclosure-spacer {
    width: 16px;
    height: 16px;
  }

  .task-status {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .status-emoji {
    font-size: 14px;
  }

  .status-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .task-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .task-updated {
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .task-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .task-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }

  .task-action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: none;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
    opacity: 0.6;
  }

  .task-action-button:not(:disabled) {
    opacity: 1;
  }

  .task-action-button:not(:disabled):hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
    color: var(--text-primary);
  }

  .task-action-button:disabled {
    cursor: not-allowed;
  }

  .action-icon {
    font-size: 12px;
  }

  .task-list-footer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-primary);
  }

  .feature-note {
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: center;
    margin: 0;
    font-style: italic;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .task-item {
      padding: 12px;
      gap: 8px;
    }

    .task-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .task-meta {
      align-self: flex-end;
    }

    .task-actions {
      flex-direction: row;
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
    .task-item {
      padding: 10px;
    }

    .task-actions {
      gap: 2px;
    }

    .task-action-button {
      width: 24px;
      height: 24px;
    }

    .action-icon {
      font-size: 10px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .task-item {
      border-width: 2px;
    }

    .task-item.completed,
    .task-item.in-progress,
    .task-item.cancelled {
      border-width: 3px;
    }

    .task-action-button {
      border-width: 2px;
    }

    .task-list-footer {
      border-top-width: 2px;
    }
  }
</style>