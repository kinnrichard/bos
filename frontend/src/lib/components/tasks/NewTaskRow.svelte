<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TaskInputManager } from '$lib/utils/task-input-manager';
  import type { TaskCreationState } from '$lib/stores/taskCreation.svelte';
  import '../../styles/task-components.css';

  // Props
  let {
    mode = 'bottom-row',
    depth = 0,
    manager,
    taskState,
    onStateChange
  }: {
    mode?: 'bottom-row' | 'inline-after-task';
    depth?: number;
    manager: TaskInputManager;
    taskState?: TaskCreationState;
    onStateChange?: (changes: Partial<TaskCreationState>) => void;
  } = $props();

  const dispatch = createEventDispatcher();

  // Derive state from unified state object
  const isShowing = $derived(taskState?.isShowing ?? false);
  const title = $derived(taskState?.title ?? '');
  
  // Local state
  let inputElement = $state<HTMLInputElement>();

  function handleRowClick(event: MouseEvent) {
    if (mode === 'bottom-row' && !isShowing) {
      manager.show(event);
    }
  }

  function handleShowTask(event: MouseEvent) {
    manager.show(event);
  }

  // Focus input when showing and update state with input element
  $effect(() => {
    if (isShowing && inputElement) {
      inputElement.focus();
      onStateChange?.({ inputElement });
    }
  });
</script>

<div 
  class="task-item task-item-add-new"
  style="--depth: {depth}"
  onclick={handleRowClick}
>
  <!-- Disclosure Spacer -->
  <div class="disclosure-spacer"></div>

  <!-- Invisible Status for Spacing -->
  <div class="task-status">
    <div class="status-emoji">
      <img 
        src="/icons/plus-circle.svg" 
        alt="Add task" 
        style="width: 16px; height: 16px; opacity: 0.6; {mode === 'bottom-row' ? 'pointer-events: none;' : ''}" 
      />
    </div>
  </div>
  
  <!-- Task Content -->
  <div class="task-content">
    {#if isShowing}
      <input 
        class="task-title task-title-input"
        value={title}
        bind:this={inputElement}
        placeholder="New Task"
        onkeydown={manager.handlers.keydown}
        onblur={manager.handlers.blur}
        oninput={(e) => {
          const newTitle = e.target.value;
          onStateChange?.({ title: newTitle });
          dispatch('titlechange', { value: newTitle });
        }}
      />
    {:else if mode === 'bottom-row'}
      <h5 
        class="task-title add-task-placeholder"
        onclick={handleShowTask}
      >
        New Task
      </h5>
    {/if}
  </div>

  <!-- Task Metadata (empty for spacing) -->
  <div class="task-metadata"></div>

  <!-- Task Actions (empty - no info button) -->
  <div class="task-actions"></div>
</div>

<style>
  /* Component-specific styles will inherit from parent TaskList styles */
  .task-item-add-new {
    cursor: pointer;
  }
  
  .add-task-placeholder {
    opacity: 0.7;
    font-style: italic;
  }
  
  .add-task-placeholder:hover {
    opacity: 1;
  }
</style>