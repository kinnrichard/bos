<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { formatTimeDuration, calculateCurrentDuration } from '$lib/utils/taskRowHelpers';
  import TaskInfoPopoverHeadless from './TaskInfoPopoverHeadless.svelte';
  import '../../styles/task-components.css';
  
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
    editingTitle = '',
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
    editingTitle?: string;
    jobId?: string;
    batchTaskDetails?: any;
    currentTime?: number;
  } = $props();

  const dispatch = createEventDispatcher();

  // Local state for title editing
  let titleInputElement = $state<HTMLInputElement>();

  function handleTaskClick(event: MouseEvent) {
    if (isEditing) return;
    dispatch('taskaction', {
      type: 'click',
      taskId: task.id,
      data: { event }
    });
  }

  function handleTaskKeydown(event: KeyboardEvent) {
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
    const statusCycle = ['new_task', 'in_progress', 'successfully_completed'];
    const currentIndex = statusCycle.indexOf(task.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    dispatch('taskaction', {
      type: 'statusChange',
      taskId: task.id,
      data: { newStatus: nextStatus }
    });
  }

  function handleTitleClick(event: MouseEvent) {
    dispatch('taskaction', {
      type: 'titleClick',
      taskId: task.id,
      data: { 
        event, 
        originalTitle: task.title 
      }
    });
  }

  function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      dispatch('taskaction', {
        type: 'saveEdit',
        taskId: task.id,
        data: { newTitle: editingTitle }
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dispatch('taskaction', {
        type: 'cancelEdit',
        taskId: task.id
      });
    }
  }

  function handleTitleBlur() {
    dispatch('taskaction', {
      type: 'saveEdit',
      taskId: task.id,
      data: { newTitle: editingTitle }
    });
  }

  function handleTaskUpdated(event: CustomEvent) {
    dispatch('taskaction', {
      type: 'taskUpdated',
      taskId: task.id,
      data: event.detail
    });
  }

  // Focus title input when editing starts
  $effect(() => {
    if (isEditing && titleInputElement) {
      titleInputElement.focus();
    }
  });
</script>

<div 
  class="task-item"
  class:completed={task.status === 'successfully_completed'}
  class:in-progress={task.status === 'in_progress'}
  class:cancelled={task.status === 'cancelled' || task.status === 'failed'}
  class:has-subtasks={hasSubtasks}
  class:selected={isSelected}
  class:task-selected-for-drag={isSelected}
  class:task-deleting={isDeleting}
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
      onclick={handleStatusChange}
      title="Click to change status"
    >
      {getTaskStatusEmoji(task.status)}
    </button>
  </div>
  
  <!-- Task Content -->
  <div class="task-content">
    {#if isEditing}
      <input 
        class="task-title task-title-input"
        bind:value={editingTitle}
        bind:this={titleInputElement}
        onkeydown={handleTitleKeydown}
        onblur={handleTitleBlur}
      />
    {:else}
      <h5 
        class="task-title"
        onclick={handleTitleClick}
      >
        {task.title}
      </h5>
    {/if}
    
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
    <TaskInfoPopoverHeadless 
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