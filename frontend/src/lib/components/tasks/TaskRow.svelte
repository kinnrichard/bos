<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTaskStatusEmoji } from '$lib/config/emoji';
  import { formatTimeDuration, calculateCurrentDuration } from '$lib/utils/taskRowHelpers';
  import { focusActions } from '$lib/stores/focusManager.svelte';
  import TaskInfoPopover from './TaskInfoPopover.svelte';
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
    jobId?: string;
    batchTaskDetails?: any;
    currentTime?: number;
  } = $props();

  const dispatch = createEventDispatcher();

  // Local state for title editing
  let titleElement = $state<HTMLHeadingElement>();
  let originalTitle = $state('');

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
    // Prevent event from bubbling up to parent task div
    event.stopPropagation();
    dispatch('taskaction', {
      type: 'titleClick',
      taskId: task.id,
      data: { 
        event, 
        originalTitle: task.title 
      }
    });
  }

  function handleTitleFocus() {
    if (titleElement) {
      originalTitle = titleElement.textContent || '';
      // Enable spellcheck when focused
      titleElement.setAttribute('spellcheck', 'true');
    }
  }

  function handleTitleKeydown(event: KeyboardEvent) {
    // Always prevent keyboard events from bubbling when editing title
    event.stopPropagation();
    
    if (event.key === 'Enter') {
      event.preventDefault();
      const newTitle = titleElement?.textContent || '';
      dispatch('taskaction', {
        type: 'saveEdit',
        taskId: task.id,
        data: { newTitle }
      });
      // Exit edit mode immediately
      if (titleElement) {
        titleElement.blur();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (titleElement) {
        titleElement.textContent = originalTitle;
        titleElement.blur();
      }
      dispatch('taskaction', {
        type: 'cancelEdit',
        taskId: task.id
      });
    }
    // For all other keys (including spacebar), allow default behavior but prevent bubbling
  }

  function handleTitleBlur() {
    if (titleElement) {
      // Disable spellcheck when blurred to hide suggestions
      titleElement.setAttribute('spellcheck', 'false');
    }
    
    // Only process blur if not transitioning and this task is being edited
    if (!focusActions.isTransitioning() && focusActions.isTaskBeingEdited(task.id)) {
      const newTitle = titleElement?.textContent || '';
      dispatch('taskaction', {
        type: 'saveEdit',
        taskId: task.id,
        data: { newTitle }
      });
    }
  }

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
    <h5 
      class="task-title"
      contenteditable="true"
      spellcheck="false"
      onclick={handleTitleClick}
      onkeydown={handleTitleKeydown}
      onblur={handleTitleBlur}
      onfocus={handleTitleFocus}
      bind:this={titleElement}
    >
      {task.title}
    </h5>
    
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