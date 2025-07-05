<script lang="ts">
  import { createPopover } from 'svelte-headlessui';
  import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { tasksService, type Task } from '$lib/api/tasks';
  import { formatDateTime } from '$lib/utils/date';
  import Portal from '../ui/Portal.svelte';
  import { 
    calculatePopoverPosition, 
    debounce,
    type PopoverPosition 
  } from '$lib/utils/popover-positioning';
  
  export let task: Task;
  export let jobId: string;
  
  const popover = createPopover();
  const dispatch = createEventDispatcher();
  
  let taskDetails: any = null;
  let loading = false;
  let error = '';
  let noteText = '';
  let addingNote = false;
  let timelineContainer: HTMLElement;
  let currentTime = Date.now();
  let timer: any;
  let panelElement: HTMLElement;
  let buttonElement: HTMLElement;
  
  // Portal positioning
  let position: PopoverPosition = {
    top: 0,
    left: 0,
    placement: 'left',
    arrowPosition: { top: 0, left: 0 }
  };
  let isPositioned = false;
  let mutationObserver: MutationObserver | null = null;
  
  // Update timer every second for in-progress tasks
  $: if ($popover.expanded && task?.status === 'in_progress') {
    timer = setInterval(() => {
      currentTime = Date.now();
    }, 1000);
  } else if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  // Clean up timer when component is destroyed
  onDestroy(() => {
    if (timer) clearInterval(timer);
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    window.removeEventListener('scroll', debouncedUpdatePosition, true);
    window.removeEventListener('resize', debouncedUpdatePosition);
  });
  
  // Set up scroll and resize listeners
  onMount(() => {
    window.addEventListener('scroll', debouncedUpdatePosition, true);
    window.addEventListener('resize', debouncedUpdatePosition);
  });
  
  // Handle keyboard events
  function handleKeydown(event: KeyboardEvent) {
    if (!$popover.expanded) return;
    if (event.key === 'Escape') {
      popover.close();
    }
  }
  
  // Handle outside clicks
  function handleOutsideClick(event: MouseEvent) {
    if (!$popover.expanded) return;
    if (panelElement && !panelElement.contains(event.target as Node) && !buttonElement.contains(event.target as Node)) {
      popover.close();
    }
  }
  
  // Load task details when popover becomes expanded
  $: if ($popover.expanded && task && !taskDetails) {
    loadTaskDetails();
  }
  
  // Calculate position when popover opens
  $: if ($popover.expanded && buttonElement) {
    // Calculate initial position immediately using estimated dimensions
    updatePositionImmediate();
  }
  
  // Set up content change observer when panel is mounted
  $: if ($popover.expanded && buttonElement && panelElement) {
    setupContentObserver();
    // Also do an immediate update with actual dimensions
    tick().then(() => updatePosition());
  }
  
  // Clean up observer when popover closes
  $: if (!$popover.expanded && mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  
  function updatePositionImmediate() {
    if (!buttonElement) return;
    
    // Use estimated dimensions for immediate positioning to avoid flicker
    const estimatedDimensions = { width: 380, height: 500 };
    const newPosition = calculatePopoverPosition(
      { element: buttonElement, preferredPlacement: 'left' },
      estimatedDimensions
    );
    
    position = newPosition;
    isPositioned = true;
  }
  
  function updatePosition() {
    if (!buttonElement || !panelElement) return;
    
    // Use actual panel dimensions for precise positioning
    const panelRect = panelElement.getBoundingClientRect();
    const actualDimensions = { 
      width: panelRect.width || 380, 
      height: panelRect.height || 500 
    };
    
    const newPosition = calculatePopoverPosition(
      { element: buttonElement, preferredPlacement: 'left' },
      actualDimensions
    );
    
    
    position = newPosition;
  }
  
  function setupContentObserver() {
    if (!panelElement || mutationObserver) return;
    
    // Create observer to watch for content changes
    mutationObserver = new MutationObserver((mutations) => {
      // Check if any mutations actually changed content
      const hasContentChange = mutations.some(mutation => 
        mutation.type === 'childList' || 
        mutation.type === 'characterData' ||
        (mutation.type === 'attributes' && mutation.attributeName === 'style')
      );
      
      if (hasContentChange) {
        // Debounce position updates to avoid excessive recalculation
        debouncedUpdatePosition();
      }
    });
    
    // Start observing changes to the panel content
    mutationObserver.observe(panelElement, {
      childList: true,       // Watch for added/removed child elements
      subtree: true,         // Watch for changes in descendants
      characterData: true,   // Watch for text content changes
      attributes: true,      // Watch for attribute changes (like style)
      attributeFilter: ['style', 'class'] // Only watch relevant attributes
    });
  }
  
  const debouncedUpdatePosition = debounce(() => {
    if ($popover.expanded) {
      updatePosition();
    }
  }, 10);
  
  // Reset state when task changes
  $: if (task) {
    taskDetails = null;
    error = '';
  }
  
  async function loadTaskDetails() {
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
      
      // Update task notes count
      task.notes_count = (task.notes_count || 0) + 1;
      
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

  function getStatusEmoji(status: string): string {
    switch (status) {
      case 'new_task': return '⚪';
      case 'in_progress': return '🔵';
      case 'successfully_completed': return '✅';
      case 'unsuccessfully_completed': return '❌';
      case 'on_hold': return '⏸️';
      default: return '❓';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'new_task': return 'New Task';
      case 'in_progress': return 'In Progress';
      case 'successfully_completed': return 'Completed Successfully';
      case 'unsuccessfully_completed': return 'Completed Unsuccessfully';
      case 'on_hold': return 'On Hold';
      default: return status?.replace('_', ' ') || 'Unknown';
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
  <!-- Info Button (Trigger) -->
  <button 
    class="task-action-button"
    use:popover.button
    bind:this={buttonElement}
    title="Task details"
    on:click|stopPropagation
  >
    <span class="action-icon">ⓘ</span>
  </button>
</div>

<!-- Global event handlers (must be at top level) -->
<svelte:window on:click={handleOutsideClick} on:keydown={handleKeydown} />

<!-- Popover Panel (rendered via Portal) -->
<Portal enabled={$popover.expanded}>
  {#if $popover.expanded}
    <!-- Separate arrow element -->
    <div 
      class="popover-arrow panel-{position.placement}"
      style="
        position: fixed;
        top: {position.arrowPosition.top}px;
        left: {position.arrowPosition.left}px;
        opacity: {isPositioned ? 1 : 0};
        transition: opacity 0.2s ease;
        z-index: 2001;
      "
    ></div>

    <div 
      class="task-info-popover-panel"
      use:popover.panel
      bind:this={panelElement}
      style="
        position: fixed;
        top: {position.top}px;
        left: {position.left}px;
        max-width: {position.maxWidth ? position.maxWidth + 'px' : '380px'};
        max-height: {position.maxHeight ? position.maxHeight + 'px' : 'calc(100vh - 100px)'};
        opacity: {isPositioned ? 1 : 0};
        transition: opacity 0.2s ease;
        z-index: 2000;
      "
    >
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
              <button on:click={loadTaskDetails}>Retry</button>
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
                          {item.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
                        <span class="timeline-emoji">{getStatusEmoji(item.status)}</span>
                        <span class="timeline-label">{getStatusLabel(item.status)}</span>
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
              on:keydown={handleNoteKeydown}
              placeholder="Add a note..."
              rows="2"
              disabled={addingNote}
            ></textarea>
            <div class="note-actions">
              <button
                class="button button--primary"
                on:click={addNote}
                disabled={!noteText.trim() || addingNote}
              >
                {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</Portal>

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
  }

  .task-info-popover-panel {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    width: 380px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    /* Position and z-index are handled via inline styles for portal */
  }

  /* Arrow styles - separate DOM elements with CSS border triangles */
  .popover-arrow {
    width: 20px;
    height: 20px;
    pointer-events: none;
  }

  /* Bottom placement (arrow points up to button) */
  .panel-bottom::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 12px solid var(--border-primary);
  }

  .panel-bottom::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid var(--bg-secondary);
  }

  /* Top placement (arrow points down to button) */
  .panel-top::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid var(--border-primary);
  }

  .panel-top::after {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-top: 10px solid var(--bg-secondary);
  }

  /* Left placement (arrow points right to button) */
  .panel-left::before {
    content: '';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 12px solid var(--border-primary);
  }

  .panel-left::after {
    content: '';
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-left: 10px solid var(--bg-secondary);
  }

  /* Right placement (arrow points left to button) */
  .panel-right::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-right: 12px solid var(--border-primary);
  }

  .panel-right::after {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid var(--bg-secondary);
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