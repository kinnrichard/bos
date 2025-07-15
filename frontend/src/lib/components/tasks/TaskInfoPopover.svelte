<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { tasksService, type Task } from '$lib/api/tasks';
  import { getContext } from 'svelte';
  import { formatDateTime } from '$lib/utils/date';
  import { getTaskStatusEmoji, getTaskStatusLabel } from '$lib/config/emoji';
  import BasePopover from '../ui/BasePopover.svelte';
  
  let {
    task,
    jobId,
    batchTaskDetails = null, // Optional batch details data
    isSelected = false // Whether this task is selected
  } = $props();
  
  const dispatch = createEventDispatcher();
  
  let taskDetails = $state(null);
  let loading = $state(false);
  let error = $state('');
  let noteText = $state('');
  let addingNote = $state(false);
  let timelineContainer = $state();
  let currentTime = $state(Date.now());
  let timer: any;
  
  // Helper function to generate user initials with proper typing
  function getUserInitials(name: string): string {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  }
  
  // Forward popover instance from BasePopover
  let basePopover = $state();

  // Update timer every second for in-progress tasks
  $effect(() => {
    if (basePopover && basePopover.expanded && task?.status === 'in_progress') {
      timer = setInterval(() => {
        currentTime = Date.now();
      }, 1000);
    } else if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });
  
  // Clean up timer when component is destroyed
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
  
  // Load task details when popover becomes expanded
  $effect(() => {
    if (basePopover && basePopover.expanded && task && !taskDetails) {
      loadTaskDetails();
    }
  });

  // Check for batch details data when it becomes available
  $effect(() => {
    if (batchTaskDetails && batchTaskDetails.data && task && !taskDetails) {
      checkBatchDetails();
    }
  });
  
  // Reset state when task changes
  $effect(() => {
    if (task) {
      taskDetails = null;
      error = '';
    }
  });
  
  function checkBatchDetails() {
    if (!batchTaskDetails?.data || !task) return;
    
    // Find this task's details in the batch data
    const taskDetailData = batchTaskDetails.data.find((t: any) => t.id === task.id);
    if (taskDetailData) {
      // Transform the JSON:API format to match the expected format
      taskDetails = {
        id: taskDetailData.id,
        title: taskDetailData.attributes.title,
        status: taskDetailData.attributes.status,
        position: taskDetailData.attributes.position,
        parent_id: taskDetailData.attributes.parent_id,
        created_at: taskDetailData.attributes.created_at,
        updated_at: taskDetailData.attributes.updated_at,
        completed_at: taskDetailData.attributes.completed_at,
        notes: taskDetailData.attributes.notes || [],
        activity_logs: taskDetailData.attributes.activity_logs || [],
        // Don't include available_technicians - they're already cached via useUsersQuery
      };
      
      // Auto-scroll to bottom after content loads
      setTimeout(() => {
        if (timelineContainer) {
          timelineContainer.scrollTop = timelineContainer.scrollHeight;
        }
      }, 0);
    }
  }

  async function loadTaskDetails() {
    // First check if we have batch details available
    if (batchTaskDetails?.data) {
      checkBatchDetails();
      if (taskDetails) return; // Exit early if batch details provided the data
    }
    
    // Fall back to individual API call if batch details not available
    loading = true;
    error = '';
    
    try {
      taskDetails = await tasksService.getTaskDetails(jobId, task.id);
      // Auto-scroll to bottom after content loads
      setTimeout(() => {
        if (timelineContainer) {
          timelineContainer.scrollTop = timelineContainer.scrollHeight;
        }
      }, 0);
    } catch (err: any) {
      error = 'Failed to load task details';
      console.error('Failed to load task details:', err);
    } finally {
      loading = false;
    }
  }
  
  async function addNote() {
    if (!noteText.trim() || addingNote) return;
    
    addingNote = true;
    
    try {
      const response = await tasksService.addNote(jobId, task.id, noteText.trim());
      
      // Update task details with new note
      if (taskDetails && taskDetails.notes) {
        taskDetails.notes.push(response.note);
      }
      
      // Update task via ActiveRecord pattern
      const { Task } = await import('$lib/models/task');
      await Task.update(task.id, { 
        notes_count: (task.notes_count || 0) + 1 
      });
      
      noteText = '';
      
      // Auto-scroll to bottom to show new note
      setTimeout(() => {
        if (timelineContainer) {
          timelineContainer.scrollTop = timelineContainer.scrollHeight;
        }
      }, 0);
      
      // Notify parent component of the update
      dispatch('task-updated', { task });
      
    } catch (err: any) {
      error = 'Failed to add note';
      console.error('Failed to add note:', err);
    } finally {
      addingNote = false;
    }
  }
  
  function handleNoteKeydown(event: KeyboardEvent) {
    if ((event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      addNote();
    }
  }
  
  // Timeline and formatting functions
  function formatTimeDuration(seconds: number): string {
    if (!seconds || seconds === 0) return '0 min';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours >= 1) {
      if (minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${hours}h`;
      }
    } else {
      return `${Math.max(minutes, 1)}m`;
    }
  }

  function calculateCurrentDuration(task: any): number {
    if (task.status !== 'in_progress' || !task.in_progress_since) {
      return task.accumulated_seconds || 0;
    }
    
    const startTime = new Date(task.in_progress_since).getTime();
    const currentSessionSeconds = Math.floor((currentTime - startTime) / 1000);
    
    return (task.accumulated_seconds || 0) + currentSessionSeconds;
  }

  function formatTimeOnly(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function formatHeaderDate(timestamp: string): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }


  // Build timeline items from task details
  function getTimelineItems(taskDetails: any): any[] {
    if (!taskDetails) return [];
    
    let items: any[] = [];
    
    // Add activity logs (created, status changes, etc.)
    if (taskDetails.activity_logs) {
      taskDetails.activity_logs.forEach((log: any) => {
        if (log.action === 'created') {
          items.push({
            type: 'created',
            timestamp: log.created_at,
            user: log.user_name ? { name: log.user_name } : null,
            log: log
          });
        } else if (log.action === 'status_changed') {
          items.push({
            type: 'status_change',
            timestamp: log.created_at,
            user: log.user_name ? { name: log.user_name } : null,
            status: log.metadata?.new_status,
            log: log
          });
        }
      });
    }
    
    // If no created log exists, add a fallback created item
    const hasCreatedLog = items.some(item => item.type === 'created');
    if (!hasCreatedLog) {
      items.push({
        type: 'created',
        timestamp: task.created_at,
        user: null
      });
    }
    
    // Add notes
    if (taskDetails.notes) {
      taskDetails.notes.forEach((note: any) => {
        items.push({
          type: 'note',
          timestamp: note.created_at,
          user: { name: note.user_name },
          content: note.content,
          note: note
        });
      });
    }
    
    // Sort by timestamp
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Group timeline items by user and date
  function groupTimelineItems(items: any[]): any[] {
    const grouped: any[] = [];
    let currentUser: string | null = null;
    let currentDate: string | null = null;
    
    items.forEach(item => {
      const itemDate = new Date(item.timestamp).toDateString();
      const itemUser = item.user?.name || 'System';
      
      if (currentUser !== itemUser || currentDate !== itemDate) {
        grouped.push({
          type: 'header',
          user: item.user,
          timestamp: item.timestamp
        });
        currentUser = itemUser;
        currentDate = itemDate;
      }
      
      grouped.push(item);
    });
    
    return grouped;
  }
</script>

<div class="task-info-popover-container">
  <!-- Task Info Button (Trigger) -->
  <BasePopover 
    bind:popover={basePopover}
    preferredPlacement="left"
    panelWidth="380px"
  >
    <svelte:fragment slot="trigger" let:popover>
      <button 
        class="task-action-button"
        title="Task details"
        use:popover.button
        onclick={(e) => e.stopPropagation()}
      >
        <img src="/icons/{isSelected ? 'info' : 'info-blue'}.svg" alt="Info" class="action-icon" />
      </button>
    </svelte:fragment>

    <!-- Popover content with scrolling -->
    <div class="popover-content-scrollable">
      <!-- Header -->
      <div class="popover-header">
        <h3>Task Info</h3>
        {#if task.status === 'in_progress' || (task.accumulated_seconds && task.accumulated_seconds > 0)}
          {@const _ = currentTime} <!-- Force reactivity -->
          {@const duration = calculateCurrentDuration(task)}
          <div class="header-duration">
            <span class="timer-icon">⏱️</span>
            <span class="timer-display" class:active={task.status === 'in_progress'}>
              {formatTimeDuration(duration)}
            </span>
          </div>
        {/if}
      </div>

      {#if loading}
        <div class="timeline-section">
          <div class="loading-state">
            <span class="spinner">⏳</span>
            <span>Loading task details...</span>
          </div>
        </div>
      {:else if error}
        <div class="timeline-section">
          <div class="error-state">
            <span>❌</span>
            <span>{error}</span>
            <button onclick={loadTaskDetails}>Retry</button>
          </div>
        </div>
      {:else if taskDetails}
        <!-- Timeline section -->
        <div class="timeline-section">
          <div class="timeline-container" bind:this={timelineContainer}>
            {#each groupTimelineItems(getTimelineItems(taskDetails)) as item}
              {#if item.type === 'header'}
                <div class="timeline-header">
                  <div class="timeline-header-left">
                    {#if item.user}
                      <span class="timeline-header-icon user-avatar" style="background-color: #4A90E2; color: white;">
                        {getUserInitials(item.user.name)}
                      </span>
                    {/if}
                    <span class="timeline-header-user">{item.user?.name || 'System'}</span>
                  </div>
                  <span class="timeline-header-date">{formatHeaderDate(item.timestamp)}</span>
                </div>
              {:else if item.type === 'created'}
                <div class="timeline-item">
                  <div class="timeline-row">
                    <div class="timeline-content">
                      <span class="timeline-emoji">⚫</span>
                      <span class="timeline-label">Created</span>
                    </div>
                    <div class="timeline-time">
                      <span>{formatTimeOnly(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              {:else if item.type === 'status_change'}
                <div class="timeline-item">
                  <div class="timeline-row">
                    <div class="timeline-content">
                      <span class="timeline-emoji">{getTaskStatusEmoji(item.status)}</span>
                      <span class="timeline-label">{getTaskStatusLabel(item.status)}</span>
                    </div>
                    <div class="timeline-time">
                      <span>{formatTimeOnly(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              {:else if item.type === 'note'}
                <div class="timeline-item timeline-item--note" data-note-id={item.note?.id}>
                  <div class="timeline-row">
                    <div class="timeline-content">
                      <span class="timeline-emoji">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 19.8242 17.998"
                          width="18"
                          height="18"
                          style="display: block;"
                        >
                          <path
                            d="M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258Z"
                            fill="currentColor"
                            fill-opacity="0.85"
                          />
                          <path
                            d="M4.61914 8.11523L14.873 8.11523C15.2148 8.11523 15.4785 7.8418 15.4785 7.5C15.4785 7.16797 15.2148 6.91406 14.873 6.91406L4.61914 6.91406C4.25781 6.91406 4.00391 7.16797 4.00391 7.5C4.00391 7.8418 4.25781 8.11523 4.61914 8.11523Z"
                            fill="currentColor"
                            fill-opacity="0.85"
                          />
                          <path
                            d="M4.61914 11.0547L14.873 11.0547C15.2148 11.0547 15.4785 10.8008 15.4785 10.4688C15.4785 10.1172 15.2148 9.85352 14.873 9.85352L4.61914 9.85352C4.25781 9.85352 4.00391 10.1172 4.00391 10.4688C4.00391 10.8008 4.25781 11.0547 4.61914 11.0547Z"
                            fill="currentColor"
                            fill-opacity="0.85"
                          />
                          <path
                            d="M4.61914 13.9941L11.1328 13.9941C11.4746 13.9941 11.7383 13.7402 11.7383 13.4082C11.7383 13.0664 11.4746 12.793 11.1328 12.793L4.61914 12.793C4.25781 12.793 4.00391 13.0664 4.00391 13.4082C4.00391 13.7402 4.25781 13.9941 4.61914 13.9941Z"
                            fill="currentColor"
                            fill-opacity="0.85"
                          />
                        </svg>
                      </span>
                      <span class="timeline-note">{item.content}</span>
                    </div>
                    <div class="timeline-time">
                      <span>{formatTimeOnly(item.timestamp)}</span>
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Add note section -->
        <div class="add-note-section">
          <textarea
            class="note-input"
            bind:value={noteText}
            onkeydown={handleNoteKeydown}
            placeholder="Add a note..."
            rows="2"
            disabled={addingNote}
          ></textarea>
          <div class="note-actions">
            <button
              class="button button--primary"
              onclick={addNote}
              disabled={!noteText.trim() || addingNote}
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </BasePopover>
</div>

<style>
  /* Note color variable to match Rails */
  :root {
    --note-color: #FBB827;
  }

  .task-info-popover-container {
    position: relative;
    display: inline-block;
  }

  /* Button styling handled by parent TaskList component */
  .task-action-button {
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
    margin-top: 2.75px !important;
  }

  /* Action icon (SVG) styling */
  .action-icon {
    width: 18px;
    height: 18px;
  }

  /* Popover content wrapper with scrolling */
  .popover-content-scrollable {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 500px;
  }

  /* Header */
  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-secondary);
    flex-shrink: 0;
  }

  .popover-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-duration {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: var(--text-muted);
  }

  .timer-icon {
    font-size: 16px;
  }

  .timer-display {
    font-variant-numeric: tabular-nums;
  }
  
  .timer-display.active {
    color: var(--status-in-progress-text);
  }

  /* Timeline section */
  .timeline-section {
    padding: 16px;
    flex: 1;
  }

  .timeline-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timeline-item {
    margin-left: 26px; /* Indent to align with user name (20px icon + 6px gap) */
  }
  
  .timeline-item--note .timeline-content {
    flex: 1;
  }

  .timeline-item--note .timeline-note {
    font-size: 14px;
    color: var(--text-primary); /* Same offwhite as status changes */
    white-space: pre-wrap;
    word-break: break-word;
  }

  .timeline-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: nowrap; /* Default to no wrapping */
  }

  .timeline-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .timeline-emoji {
    font-size: 16px;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .timeline-emoji svg {
    width: 18px;
    height: 18px;
    color: var(--note-color);
  }

  .timeline-label {
    font-weight: 600; /* Make status changes bold */
    color: var(--text-primary);
    white-space: nowrap;
  }

  .timeline-time {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
    margin-left: auto;
  }

  /* Timeline headers */
  .timeline-header {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 8px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between; /* Space between left and right content */
    gap: 6px;
  }
  
  .timeline-header:first-child {
    margin-top: 0;
  }
  
  .timeline-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .timeline-header-user {
    font-weight: 600; /* Bold technician name */
  }
  
  .timeline-header-date {
    margin-left: auto; /* Push date to the right */
    font-weight: 600; /* Bold date */
  }
  
  .timeline-header-icon {
    /* User avatar styling is handled by .user-avatar class */
    /* Just ensure proper size for timeline context */
    width: 20px;
    height: 20px;
    font-size: 12px; /* Match the increased font size from earlier */
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Note-specific styling */
  .timeline-item--note .timeline-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: nowrap; /* Prevent wrapping by default */
  }
  
  .timeline-item--note .timeline-content {
    flex: 1 1 auto;
    min-width: 0; /* Allow content to shrink */
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  
  .timeline-note {
    word-break: break-word;
    white-space: pre-wrap;
    color: var(--text-primary); /* Ensure consistent offwhite color */
  }
  
  .timeline-item--note .timeline-time {
    flex-shrink: 0; /* Never shrink the time */
    margin-left: 12px; /* Ensure consistent spacing */
  }

  /* Add note section */
  .add-note-section {
    padding: 16px;
    border-top: 1px solid var(--border-secondary);
    background: var(--bg-primary);
    flex-shrink: 0;
    margin-top: auto; /* Push to bottom of scrollable area */
  }

  .note-input {
    width: 100%;
    min-height: 60px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    transition: border-color 0.2s ease;
    color: var(--text-primary);
  }

  .note-input:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 1px #0969da;
  }

  .note-input::placeholder {
    color: var(--text-muted);
  }

  .note-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  /* Button styles */
  .button {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .button--primary {
    background: #0969da;
    color: white;
  }

  .button--primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loading and error states */
  .loading-state,
  .error-state {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
    justify-content: center;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive behavior is handled automatically by the positioning utilities */
</style>