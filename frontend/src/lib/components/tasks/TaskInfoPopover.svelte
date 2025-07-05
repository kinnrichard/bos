<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tasksService, type Task } from '$lib/api/tasks';
  import { formatDateTime } from '$lib/utils/date';
  
  export let task: Task;
  export let jobId: string;
  export let isVisible = false;
  export let position = { top: 0, left: 0 };
  
  const dispatch = createEventDispatcher();
  
  let taskDetails: any = null;
  let loading = false;
  let error = '';
  let noteText = '';
  let addingNote = false;
  
  // Load task details when popover becomes visible
  $: if (isVisible && task && !taskDetails) {
    loadTaskDetails();
  }
  
  async function loadTaskDetails() {
    loading = true;
    error = '';
    
    try {
      taskDetails = await tasksService.getTaskDetails(jobId, task.id);
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
        taskDetails.notes.unshift(response.note);
      }
      
      // Update task notes count
      task.notes_count = (task.notes_count || 0) + 1;
      
      noteText = '';
      
      // Notify parent component of the update
      dispatch('task-updated', { task });
      
    } catch (err: any) {
      error = 'Failed to add note';
      console.error('Failed to add note:', err);
    } finally {
      addingNote = false;
    }
  }
  
  async function assignTask(technicianId: string | null) {
    try {
      await tasksService.assignTask(jobId, task.id, technicianId);
      
      // Update task assignment
      if (technicianId && taskDetails && taskDetails.available_technicians) {
        const technician = taskDetails.available_technicians.find(t => t.id === technicianId);
        if (technician) {
          task.assigned_to = {
            id: technician.id,
            name: technician.name,
            initials: technician.initials || technician.name.split(' ').map(n => n[0]).join('').toUpperCase()
          };
        }
      } else {
        task.assigned_to = undefined;
      }
      
      // Notify parent component of the update
      dispatch('task-updated', { task });
      
    } catch (err: any) {
      error = 'Failed to update assignment';
      console.error('Failed to assign task:', err);
    }
  }
  
  function close() {
    dispatch('close');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }
  
  function handleNoteKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      addNote();
    }
  }
  
  // Reset state when task changes
  $: if (task) {
    taskDetails = null;
    error = '';
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isVisible}
  <!-- Backdrop -->
  <div class="popover-backdrop" on:click={close} on:keydown={handleKeydown} role="presentation"></div>
  
  <!-- Popover -->
  <div 
    class="task-info-popover"
    style="top: {position.top}px; left: {position.left}px;"
  >
    <div class="popover-header">
      <h3>Task Details</h3>
      <button class="close-button" on:click={close} title="Close">
        <span>✕</span>
      </button>
    </div>
    
    <div class="popover-content">
      {#if loading}
        <div class="loading-state">
          <span class="spinner">⏳</span>
          <span>Loading task details...</span>
        </div>
      {:else if error}
        <div class="error-state">
          <span>❌</span>
          <span>{error}</span>
          <button on:click={loadTaskDetails}>Retry</button>
        </div>
      {:else if taskDetails}
        <!-- Task Info -->
        <div class="task-info-section">
          <h4>{task.title}</h4>
          <div class="task-meta">
            <div class="meta-item">
              <span class="label">Status:</span>
              <span class="status-badge status-{task.status}">
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <div class="meta-item">
              <span class="label">Created:</span>
              <span>{formatDateTime(task.created_at)}</span>
            </div>
            {#if task.updated_at !== task.created_at}
              <div class="meta-item">
                <span class="label">Updated:</span>
                <span>{formatDateTime(task.updated_at)}</span>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Assignment Section -->
        <div class="assignment-section">
          <h5>Assignment</h5>
          <div class="assignment-controls">
            <button 
              class="assignment-option"
              class:active={!task.assigned_to}
              on:click={() => assignTask(null)}
            >
              Unassigned
            </button>
            {#if taskDetails.available_technicians}
              {#each taskDetails.available_technicians as tech}
                <button 
                  class="assignment-option"
                  class:active={task.assigned_to?.id === tech.id}
                  on:click={() => assignTask(tech.id)}
                >
                  <span class="tech-initials">{tech.initials || tech.name.split(' ').map(n => n[0]).join('')}</span>
                  {tech.name}
                </button>
              {/each}
            {/if}
          </div>
        </div>
        
        <!-- Notes Section -->
        <div class="notes-section">
          <h5>Notes</h5>
          
          <!-- Add Note -->
          <div class="add-note">
            <textarea 
              bind:value={noteText}
              on:keydown={handleNoteKeydown}
              placeholder="Add a note..."
              rows="2"
              disabled={addingNote}
            ></textarea>
            <button 
              on:click={addNote}
              disabled={!noteText.trim() || addingNote}
              class="add-note-button"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
          
          <!-- Existing Notes -->
          {#if taskDetails.notes && taskDetails.notes.length > 0}
            <div class="notes-list">
              {#each taskDetails.notes as note}
                <div class="note-item">
                  <div class="note-header">
                    <span class="note-author">{note.user_name}</span>
                    <span class="note-date">{formatDateTime(note.created_at)}</span>
                  </div>
                  <div class="note-content">{note.content}</div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="no-notes">
              <span>📝</span>
              <span>No notes yet</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .popover-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
  }
  
  .task-info-popover {
    position: fixed;
    width: 400px;
    max-width: 90vw;
    max-height: 80vh;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    overflow: hidden;
  }
  
  .popover-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-primary);
  }
  
  .popover-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }
  
  .close-button:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  .popover-content {
    max-height: 60vh;
    overflow-y: auto;
    padding: 20px;
  }
  
  .loading-state,
  .error-state {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px;
    text-align: center;
    color: var(--text-secondary);
  }
  
  .task-info-section {
    margin-bottom: 20px;
  }
  
  .task-info-section h4 {
    margin: 0 0 12px 0;
    color: var(--text-primary);
    font-size: 18px;
  }
  
  .task-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .meta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
  }
  
  .label {
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .status-badge.status-new_task {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
  
  .status-badge.status-in_progress {
    background: rgba(0, 163, 255, 0.2);
    color: var(--accent-blue);
  }
  
  .status-badge.status-successfully_completed {
    background: rgba(50, 215, 75, 0.2);
    color: #32D74B;
  }
  
  .assignment-section,
  .notes-section {
    margin-bottom: 20px;
  }
  
  .assignment-section h5,
  .notes-section h5 {
    margin: 0 0 12px 0;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
  }
  
  .assignment-controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .assignment-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s ease;
  }
  
  .assignment-option:hover {
    background: var(--bg-tertiary);
  }
  
  .assignment-option.active {
    background: var(--accent-blue);
    color: white;
    border-color: var(--accent-blue);
  }
  
  .tech-initials {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 10px;
    font-weight: 600;
  }
  
  .assignment-option.active .tech-initials {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  .add-note {
    margin-bottom: 16px;
  }
  
  .add-note textarea {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    margin-bottom: 8px;
  }
  
  .add-note textarea:focus {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(0, 163, 255, 0.2);
  }
  
  .add-note textarea::placeholder {
    color: var(--text-tertiary);
  }
  
  .add-note-button {
    background: var(--accent-blue);
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .add-note-button:hover:not(:disabled) {
    background: #0089E0;
  }
  
  .add-note-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .notes-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .note-item {
    padding: 12px;
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border-primary);
  }
  
  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  
  .note-author {
    font-weight: 500;
    color: var(--text-primary);
    font-size: 12px;
  }
  
  .note-date {
    color: var(--text-tertiary);
    font-size: 11px;
  }
  
  .note-content {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.4;
  }
  
  .no-notes {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 14px;
  }
  
  .spinner {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>