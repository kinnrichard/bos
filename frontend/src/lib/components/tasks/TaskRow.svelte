<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTaskEmoji } from '$lib/config/emoji';
  import { formatTimeDuration, calculateCurrentDuration } from '$lib/utils/taskRowHelpers';
  import { focusActions } from '$lib/stores/focusManager.svelte';
  import { taskPermissionHelpers } from '$lib/stores/taskPermissions.svelte';
  import EditableTitle from '../ui/EditableTitle.svelte';
  import TaskInfoPopover from './TaskInfoPopover.svelte';
  import '../../styles/task-components.css';
  import '../../styles/focus-ring.css';
  
  // Use static SVG URLs for better compatibility
  const chevronRight = '/icons/chevron-right.svg';

  // Props
  let { 
    task, 
    depth = 0, 
    hasSubtasks = false, 
    isExpanded = false, 
    isSelected = false, 
    isEditing = false, 
    isDeleting = false,
    canEdit = true,
    jobId = '',
    batchTaskDetails = null,
    currentTime = Date.now()
  }: {
    task: any;
    depth?: number;
    hasSubtasks?: boolean;
    isExpanded?: boolean;
    isSelected?: boolean;
    isEditing?: boolean;
    isDeleting?: boolean;
    canEdit?: boolean;
    jobId?: string;
    batchTaskDetails?: any;
    currentTime?: number;
  } = $props();

  const dispatch = createEventDispatcher();
  
  // Derive task-specific permissions
  const taskCanEdit = $derived(canEdit && taskPermissionHelpers.canEditTask(task));
  const taskCanChangeStatus = $derived(canEdit && taskPermissionHelpers.canChangeStatus(task));

  // Dispatch helper for editing events
  function handleEditingChange(editing: boolean) {
    if (!canEdit && editing) return; // Prevent entering edit mode if not allowed
    
    if (editing) {
      // When entering edit mode, dispatch titleClick to notify parent
      dispatch('taskaction', {
        type: 'titleClick',
        taskId: task.id,
        data: { 
          event: new MouseEvent('click'), 
          originalTitle: task.title 
        }
      });
    } else {
      // When exiting edit mode, dispatch cancelEdit
      dispatch('taskaction', {
        type: 'cancelEdit',
        taskId: task.id
      });
    }
  }

  async function handleSaveTitle(newTitle: string) {
    dispatch('taskaction', {
      type: 'saveEdit',
      taskId: task.id,
      data: { newTitle }
    });
  }

  function handleTaskClick(event: MouseEvent) {
    // Always dispatch click event so parent can cancel edit mode
    // Parent will handle the logic of what to do when editing
    dispatch('taskaction', {
      type: 'click',
      taskId: task.id,
      data: { event }
    });
  }

  function handleTaskKeydown(event: KeyboardEvent) {
    // Don't handle keyboard events when task is being edited
    if (isEditing) {
      return;
    }
    
    dispatch('taskaction', {
      type: 'keydown',
      taskId: task.id,
      data: { event }
    });
  }

  function handleToggleExpansion(event: MouseEvent) {
    event.stopPropagation();
    dispatch('taskaction', {
      type: 'toggleExpansion',
      taskId: task.id
    });
  }

  function handleStatusChange(event: MouseEvent) {
    event.stopPropagation();
    
    // Check if status change is allowed
    if (!taskCanChangeStatus) {
      return;
    }
    
    const statusCycle = ['new_task', 'in_progress', 'successfully_completed'];
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    dispatch('taskaction', {
      type: 'statusChange',
      taskId: task.id,
      data: { newStatus: nextStatus }
    });
  }

  // Handle editing state changes from EditableTitle
  // The EditableTitle component now manages its own click handling

  function handleTaskUpdated(event: CustomEvent) {
    dispatch('taskaction', {
      type: 'taskUpdated',
      taskId: task.id,
      data: event.detail
    });
  }

  // Focus management is now handled by the centralized focus store
  // The focus store coordinates all focus operations to prevent race conditions
</script>

<div 
  class="task-item focus-ring"
  class:completed={task.status === 'successfully_completed'}
  class:in-progress={task.status === 'in_progress'}
  class:cancelled={task.status === 'cancelled' || task.status === 'failed'}
  class:has-subtasks={hasSubtasks}
  class:selected={isSelected}
  class:task-selected-for-drag={isSelected}
  class:task-deleting={isDeleting}
  class:non-editable={!taskCanEdit}
  style="--depth: {depth || 0}"
  data-task-id={task.id}
  role="button"
  tabindex="0"
  aria-label="Task: {task.title}. {isSelected ? 'Selected' : 'Not selected'}. Click to select, Shift+click for range selection, Ctrl/Cmd+click to toggle."
  onclick={handleTaskClick}
  onkeydown={handleTaskKeydown}
>
  <!-- Disclosure Triangle (if has subtasks) -->
  {#if hasSubtasks}
    <button 
      class="disclosure-button"
      onclick={handleToggleExpansion}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
    >
      <img 
        src={chevronRight} 
        alt={isExpanded ? 'Expanded' : 'Collapsed'}
        class="chevron-icon"
        class:expanded={isExpanded}
      />
    </button>
  {:else}
    <div class="disclosure-spacer"></div>
  {/if}

  <!-- Task Status Button -->
  <div class="task-status">
    <button 
      class="status-emoji"
      class:disabled={!taskCanChangeStatus}
      onclick={handleStatusChange}
      title={taskCanChangeStatus ? "Click to change status" : "Status cannot be changed"}
      disabled={!taskCanChangeStatus}
    >
      {getTaskEmoji(task)}
    </button>
  </div>
  
  <!-- Task Content -->
  <div class="task-content">
    <EditableTitle
      value={task.title}
      tag="h5"
      className="task-title"
      placeholder="Untitled Task"
      isEditing={isEditing}
      onEditingChange={handleEditingChange}
      onSave={handleSaveTitle}
      onClick={handleTaskClick}
      editable={taskCanEdit}
    />
    
    <!-- Time Tracking Display -->
    {#if task.status === 'in_progress' || (task.accumulated_seconds && task.accumulated_seconds > 0)}
      {@const _ = currentTime} <!-- Force reactivity on time changes -->
      {@const duration = calculateCurrentDuration(task)}
      {@const formattedTime = formatTimeDuration(duration)}
      {#if formattedTime}
        <div class="time-tracking">
          <span class="time-icon">⏱️</span>
          <span class="time-duration" class:in-progress={task.status === 'in_progress'}>
            {formattedTime}
          </span>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Task Metadata (Assignment & Notes) -->
  <div class="task-metadata">
    <!-- Assignment Indicator -->
    {#if task.assigned_to}
      <div class="assigned-indicator" title="Assigned to {task.assigned_to.name}">
        <span class="assignee-initials">{task.assigned_to.initials}</span>
      </div>
    {/if}

    <!-- Notes Indicator -->
    {#if task.notes_count && task.notes_count > 0}
      <div class="notes-indicator" title="{task.notes_count} note{task.notes_count > 1 ? 's' : ''}">
        <span class="notes-icon">📝</span>
        <span class="notes-count">{task.notes_count}</span>
      </div>
    {/if}
  </div>

  <!-- Task Actions -->
  <div class="task-actions">
    <TaskInfoPopover 
      {task}
      {jobId}
      {batchTaskDetails}
      isSelected={isSelected}
      on:task-updated={handleTaskUpdated}
    />
  </div>
</div>

<style>
  /* Component-specific styles will inherit from parent TaskList styles */
  .chevron-icon.expanded {
    transform: rotate(90deg);
  }
</style>