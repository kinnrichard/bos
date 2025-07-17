# Epic-008 Svelte 5 Integration Guide
*Reactive Patterns with ReactiveRecord and Svelte 5 Runes*

**Version**: 1.0  
**Generated**: 2025-07-13  
**Epic**: Epic-008 - ActiveRecord Implementation  

---

## 🎯 Overview

Epic-008 provides seamless integration with Svelte 5's new runes system through ReactiveRecord. This guide covers reactive patterns, performance optimization, and best practices for building dynamic UIs with real-time data updates.

### Key Benefits

- ✅ **Automatic UI updates** when data changes
- ✅ **Svelte 5 runes integration** with $state and $derived
- ✅ **Real-time synchronization** with Zero.js
- ✅ **Type-safe reactive queries** with full TypeScript support
- ✅ **Memory efficient** with automatic cleanup
- ✅ **Performance optimized** with intelligent caching

---

## 📋 Table of Contents

1. [Svelte 5 Runes Overview](#svelte-5-runes-overview)
2. [ReactiveRecord Integration](#reactiverecord-integration)
3. [Basic Reactive Patterns](#basic-reactive-patterns)
4. [Advanced Reactive Patterns](#advanced-reactive-patterns)
5. [Real-Time Data Synchronization](#real-time-data-synchronization)
6. [Performance Optimization](#performance-optimization)
7. [Memory Management](#memory-management)
8. [Error Handling in Reactive Context](#error-handling-in-reactive-context)
9. [Testing Reactive Components](#testing-reactive-components)

---

## Svelte 5 Runes Overview

### Understanding Svelte 5 Runes

Svelte 5 introduces a new reactivity system based on "runes" - special functions that create reactive state:

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  // $state - reactive state
  let count = $state(0)
  
  // $derived - computed values
  let doubled = $derived(count * 2)
  
  // $effect - side effects
  $effect(() => {
    console.log('Count is now:', count)
  })
  
  // ReactiveRecord queries integrate seamlessly
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  // Reactive data from queries
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
  $: error = tasksQuery.error
</script>

<div>
  <p>Count: {count} (Doubled: {doubled})</p>
  <button on:click={() => count++}>Increment</button>
  
  {#if isLoading}
    Loading tasks...
  {:else}
    <p>Found {tasks.length} tasks</p>
  {/if}
</div>
```

### Runes vs Legacy Reactivity

| Legacy Svelte | Svelte 5 Runes | Epic-008 Integration |
|---------------|----------------|---------------------|
| `let count = 0` | `let count = $state(0)` | `$: tasks = tasksQuery.data` |
| `$: doubled = count * 2` | `let doubled = $derived(count * 2)` | `$: taskCount = $derived(tasks.length)` |
| `$: { sideEffect() }` | `$effect(() => { sideEffect() })` | Automatic with ReactiveRecord |

---

## ReactiveRecord Integration

### Basic Query Integration

ReactiveRecord queries work seamlessly with Svelte 5 runes:

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // Reactive query - updates automatically when data changes
  const tasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  
  // Svelte 5 reactive statements
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
  $: error = tasksQuery.error
  
  // Derived reactive values
  $: taskCount = tasks.length
  $: hasHighPriorityTasks = tasks.some(task => task.priority === 1)
  $: completionRate = tasks.filter(t => t.status === 2).length / taskCount
</script>

<div class="task-dashboard">
  <h2>Job Tasks ({taskCount})</h2>
  
  {#if isLoading}
    <div class="loading-spinner">Loading...</div>
  {:else if error}
    <div class="error-message">Error: {error.message}</div>
  {:else}
    <div class="stats">
      <div class="stat">
        <span class="value">{taskCount}</span>
        <span class="label">Total Tasks</span>
      </div>
      <div class="stat" class:urgent={hasHighPriorityTasks}>
        <span class="value">{hasHighPriorityTasks ? 'Yes' : 'No'}</span>
        <span class="label">High Priority</span>
      </div>
      <div class="stat">
        <span class="value">{Math.round(completionRate * 100)}%</span>
        <span class="label">Complete</span>
      </div>
    </div>
    
    <div class="task-list">
      {#each tasks as task (task.id)}
        <div class="task-item" class:high-priority={task.priority === 1}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <span class="priority">Priority: {task.priority}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

### Multiple Query Coordination

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // Multiple coordinated reactive queries
  const activeTasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  const completedTasksQuery = ReactiveTask.where({ job_id: jobId, status: 2 })
  const overdueTasksQuery = ReactiveTask.where({ 
    job_id: jobId, 
    status: 1 
  }).where('due_date', '<', Date.now())
  
  // Reactive state from multiple queries
  $: activeTasks = activeTasksQuery.data
  $: completedTasks = completedTasksQuery.data
  $: overdueTasks = overdueTasksQuery.data
  
  // Combined loading state
  $: isLoading = activeTasksQuery.isLoading || 
                 completedTasksQuery.isLoading || 
                 overdueTasksQuery.isLoading
  
  // Derived statistics
  $: totalTasks = activeTasks.length + completedTasks.length
  $: completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks.length / totalTasks) * 100) 
    : 0
  $: urgentCount = overdueTasks.length
  
  // Reactive CSS classes
  $: dashboardClass = [
    'dashboard',
    isLoading && 'loading',
    urgentCount > 0 && 'has-urgent',
    completionPercentage === 100 && 'complete'
  ].filter(Boolean).join(' ')
</script>

<div class={dashboardClass}>
  <header class="dashboard-header">
    <h1>Project Dashboard</h1>
    {#if isLoading}
      <span class="loading-indicator">Updating...</span>
    {/if}
  </header>
  
  <div class="summary-cards">
    <div class="card">
      <span class="number">{activeTasks.length}</span>
      <span class="label">Active</span>
    </div>
    
    <div class="card">
      <span class="number">{completedTasks.length}</span>
      <span class="label">Completed</span>
    </div>
    
    <div class="card" class:urgent={urgentCount > 0}>
      <span class="number">{urgentCount}</span>
      <span class="label">Overdue</span>
    </div>
    
    <div class="card">
      <span class="number">{completionPercentage}%</span>
      <span class="label">Progress</span>
    </div>
  </div>
  
  <div class="progress-bar">
    <div 
      class="progress-fill" 
      style="width: {completionPercentage}%"
    ></div>
  </div>
</div>
```

---

## Basic Reactive Patterns

### 1. Single Record Display

```svelte
<!-- TaskDetail.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy } from 'svelte'
  
  export let taskId: string
  
  // Single record reactive query
  const taskQuery = ReactiveTask.find(taskId)
  
  // Reactive state
  $: task = taskQuery.data
  $: isLoading = taskQuery.isLoading
  $: error = taskQuery.error
  
  // Derived properties
  $: isOverdue = task?.due_date && task.due_date < Date.now()
  $: priorityLabel = task?.priority === 1 ? 'High' : 
                    task?.priority === 2 ? 'Medium' : 'Low'
  $: statusLabel = task?.status === 1 ? 'Active' : 
                   task?.status === 2 ? 'Complete' : 'Pending'
  
  // Cleanup
  onDestroy(() => {
    taskQuery.destroy()
  })
</script>

{#if isLoading}
  <div class="loading">Loading task...</div>
{:else if error}
  <div class="error">Error: {error.message}</div>
{:else if task}
  <article class="task-detail" class:overdue={isOverdue}>
    <header>
      <h1>{task.title}</h1>
      <div class="badges">
        <span class="status status-{task.status}">{statusLabel}</span>
        <span class="priority priority-{task.priority}">{priorityLabel}</span>
        {#if isOverdue}
          <span class="overdue-badge">Overdue</span>
        {/if}
      </div>
    </header>
    
    <div class="content">
      <p>{task.description}</p>
      
      {#if task.due_date}
        <p class="due-date">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </p>
      {/if}
      
      <div class="metadata">
        <small>Created: {new Date(task.created_at).toLocaleDateString()}</small>
        <small>Updated: {new Date(task.updated_at).toLocaleDateString()}</small>
      </div>
    </div>
  </article>
{:else}
  <div class="not-found">Task not found</div>
{/if}
```

### 2. Collection with Filtering

```svelte
<!-- TaskList.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // Filter state using Svelte 5 runes
  let statusFilter = $state(1) // Active by default
  let priorityFilter = $state(null)
  let searchTerm = $state('')
  
  // Reactive query that updates when filters change
  $: baseQuery = ReactiveTask.where({ job_id: jobId })
  $: filteredQuery = statusFilter 
    ? baseQuery.where({ status: statusFilter })
    : baseQuery
  
  // For more complex filtering, we'll filter in the template
  $: allTasks = filteredQuery.data
  $: tasks = allTasks.filter(task => {
    const matchesPriority = !priorityFilter || task.priority === priorityFilter
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesPriority && matchesSearch
  })
  
  $: isLoading = filteredQuery.isLoading
  $: error = filteredQuery.error
  
  // Derived counts
  $: totalCount = allTasks.length
  $: filteredCount = tasks.length
  
  function clearFilters() {
    statusFilter = null
    priorityFilter = null
    searchTerm = ''
  }
</script>

<div class="task-list-container">
  <header class="list-header">
    <h2>Tasks ({filteredCount} of {totalCount})</h2>
    
    <div class="filters">
      <input 
        bind:value={searchTerm} 
        placeholder="Search tasks..."
        class="search-input"
      />
      
      <select bind:value={statusFilter}>
        <option value={null}>All Statuses</option>
        <option value={1}>Active</option>
        <option value={2}>Complete</option>
        <option value={3}>Pending</option>
      </select>
      
      <select bind:value={priorityFilter}>
        <option value={null}>All Priorities</option>
        <option value={1}>High</option>
        <option value={2}>Medium</option>
        <option value={3}>Low</option>
      </select>
      
      <button on:click={clearFilters}>Clear Filters</button>
    </div>
  </header>
  
  {#if isLoading}
    <div class="loading">Loading tasks...</div>
  {:else if error}
    <div class="error">Error: {error.message}</div>
  {:else if tasks.length === 0}
    <div class="empty-state">
      {#if totalCount === 0}
        No tasks found for this job.
      {:else}
        No tasks match your filters.
      {/if}
    </div>
  {:else}
    <div class="task-grid">
      {#each tasks as task (task.id)}
        <div class="task-card" class:high-priority={task.priority === 1}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <div class="task-meta">
            <span class="priority">Priority: {task.priority}</span>
            <span class="status">Status: {task.status}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
```

### 3. Form with Reactive Validation

```svelte
<!-- TaskForm.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  import type { CreateTaskData, UpdateTaskData } from '$lib/models'
  
  export let taskId: string | null = null
  export let jobId: string
  
  // Load existing task if editing
  const existingTaskQuery = taskId ? ReactiveTask.find(taskId) : null
  
  // Form state using Svelte 5 runes
  let title = $state('')
  let description = $state('')
  let priority = $state(2)
  let dueDate = $state('')
  let isSaving = $state(false)
  
  // Reactive validation
  $: titleValid = title.trim().length >= 3
  $: dueDateValid = !dueDate || new Date(dueDate) > new Date()
  $: formValid = titleValid && dueDateValid
  
  // Validation messages
  $: titleError = title.length > 0 && !titleValid 
    ? 'Title must be at least 3 characters' 
    : null
  $: dueDateError = dueDate && !dueDateValid 
    ? 'Due date must be in the future' 
    : null
  
  // Auto-populate form when existing task loads
  $: if (existingTaskQuery?.data) {
    const task = existingTaskQuery.data
    title = task.title
    description = task.description || ''
    priority = task.priority
    dueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''
  }
  
  async function saveTask() {
    if (!formValid || isSaving) return
    
    isSaving = true
    
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).getTime() : null,
        status: 1,
        applies_to_all_targets: false,
        lock_version: 1
      }
      
      if (taskId) {
        await ReactiveTask.update(taskId, taskData as UpdateTaskData)
      } else {
        await ReactiveTask.create({
          ...taskData,
          job_id: jobId
        } as CreateTaskData)
        
        // Clear form after successful creation
        title = ''
        description = ''
        priority = 2
        dueDate = ''
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      isSaving = false
    }
  }
</script>

<form on:submit|preventDefault={saveTask} class="task-form">
  <h2>{taskId ? 'Edit' : 'Create'} Task</h2>
  
  <div class="field">
    <label for="title">Title *</label>
    <input 
      id="title"
      bind:value={title}
      placeholder="Enter task title..."
      class:error={titleError}
      required
    />
    {#if titleError}
      <span class="error-message">{titleError}</span>
    {/if}
  </div>
  
  <div class="field">
    <label for="description">Description</label>
    <textarea 
      id="description"
      bind:value={description}
      placeholder="Enter task description..."
      rows="4"
    ></textarea>
  </div>
  
  <div class="field-row">
    <div class="field">
      <label for="priority">Priority</label>
      <select id="priority" bind:value={priority}>
        <option value={1}>High</option>
        <option value={2}>Medium</option>
        <option value={3}>Low</option>
      </select>
    </div>
    
    <div class="field">
      <label for="due-date">Due Date</label>
      <input 
        id="due-date"
        type="date"
        bind:value={dueDate}
        class:error={dueDateError}
      />
      {#if dueDateError}
        <span class="error-message">{dueDateError}</span>
      {/if}
    </div>
  </div>
  
  <div class="form-actions">
    <button 
      type="submit" 
      disabled={!formValid || isSaving}
      class="primary-button"
    >
      {#if isSaving}
        Saving...
      {:else}
        {taskId ? 'Update' : 'Create'} Task
      {/if}
    </button>
    
    {#if taskId}
      <button type="button" class="secondary-button">
        Cancel
      </button>
    {/if}
  </div>
</form>
```

---

## Advanced Reactive Patterns

### 1. Master-Detail with URL Sync

```svelte
<!-- TaskMasterDetail.svelte -->
<script>
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // URL-synced selection
  $: selectedTaskId = $page.url.searchParams.get('task')
  
  // Master list query
  const tasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  
  // Detail query (only when task selected)
  $: detailQuery = selectedTaskId ? ReactiveTask.find(selectedTaskId) : null
  
  // Reactive state
  $: tasks = tasksQuery.data
  $: selectedTask = detailQuery?.data
  $: isLoadingList = tasksQuery.isLoading
  $: isLoadingDetail = detailQuery?.isLoading ?? false
  
  function selectTask(taskId: string) {
    const url = new URL($page.url)
    url.searchParams.set('task', taskId)
    goto(url.toString(), { replaceState: true })
  }
  
  function clearSelection() {
    const url = new URL($page.url)
    url.searchParams.delete('task')
    goto(url.toString(), { replaceState: true })
  }
  
  // Keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      clearSelection()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const currentIndex = tasks.findIndex(t => t.id === selectedTaskId)
      let nextIndex = currentIndex
      
      if (event.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + 1, tasks.length - 1)
      } else {
        nextIndex = Math.max(currentIndex - 1, 0)
      }
      
      if (nextIndex !== currentIndex && tasks[nextIndex]) {
        selectTask(tasks[nextIndex].id)
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="master-detail" class:has-selection={selectedTaskId}>
  <div class="master-panel">
    <header>
      <h2>Tasks ({tasks.length})</h2>
      {#if isLoadingList}
        <span class="loading-indicator">Loading...</span>
      {/if}
    </header>
    
    <div class="task-list">
      {#each tasks as task (task.id)}
        <button
          class="task-item"
          class:selected={task.id === selectedTaskId}
          on:click={() => selectTask(task.id)}
        >
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <div class="meta">
            <span class="priority priority-{task.priority}">
              Priority {task.priority}
            </span>
          </div>
        </button>
      {/each}
    </div>
  </div>
  
  <div class="detail-panel">
    {#if selectedTaskId}
      <header>
        <button on:click={clearSelection} class="close-button">×</button>
        <h2>Task Details</h2>
      </header>
      
      {#if isLoadingDetail}
        <div class="loading">Loading task details...</div>
      {:else if selectedTask}
        <div class="task-detail">
          <h1>{selectedTask.title}</h1>
          <p>{selectedTask.description}</p>
          
          <div class="properties">
            <div class="property">
              <label>Priority</label>
              <span class="priority priority-{selectedTask.priority}">
                {selectedTask.priority === 1 ? 'High' : 
                 selectedTask.priority === 2 ? 'Medium' : 'Low'}
              </span>
            </div>
            
            <div class="property">
              <label>Status</label>
              <span class="status">
                {selectedTask.status === 1 ? 'Active' : 
                 selectedTask.status === 2 ? 'Complete' : 'Pending'}
              </span>
            </div>
            
            {#if selectedTask.due_date}
              <div class="property">
                <label>Due Date</label>
                <span>{new Date(selectedTask.due_date).toLocaleDateString()}</span>
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="error">Task not found</div>
      {/if}
    {:else}
      <div class="empty-selection">
        <p>Select a task to view details</p>
      </div>
    {/if}
  </div>
</div>
```

### 2. Infinite Scroll with Reactive Loading

```svelte
<!-- InfiniteTaskList.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  import { onMount, onDestroy } from 'svelte'
  
  export let jobId: string
  
  // Pagination state using Svelte 5 runes
  let page = $state(1)
  let pageSize = $state(20)
  let hasMore = $state(true)
  let isLoadingMore = $state(false)
  
  // All loaded tasks
  let allTasks = $state([])
  
  // Current page query
  $: currentPageQuery = ReactiveTask
    .where({ job_id: jobId, status: 1 })
    .orderBy('created_at', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize)
  
  // Reactive state
  $: currentPageTasks = currentPageQuery.data
  $: isLoadingPage = currentPageQuery.isLoading
  
  // Append new tasks when current page loads
  $: if (currentPageTasks.length > 0 && !isLoadingPage) {
    if (page === 1) {
      allTasks = [...currentPageTasks]
    } else {
      allTasks = [...allTasks, ...currentPageTasks]
    }
    
    hasMore = currentPageTasks.length === pageSize
    isLoadingMore = false
  }
  
  let scrollContainer: HTMLElement
  
  function handleScroll() {
    if (!scrollContainer || isLoadingMore || !hasMore) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer
    const threshold = 100 // Load more when 100px from bottom
    
    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      loadMore()
    }
  }
  
  function loadMore() {
    if (isLoadingMore || !hasMore) return
    
    isLoadingMore = true
    page++
  }
  
  function refresh() {
    page = 1
    allTasks = []
    hasMore = true
    currentPageQuery.refresh()
  }
  
  onMount(() => {
    scrollContainer?.addEventListener('scroll', handleScroll)
  })
  
  onDestroy(() => {
    scrollContainer?.removeEventListener('scroll', handleScroll)
    currentPageQuery.destroy()
  })
</script>

<div class="infinite-list">
  <header class="list-header">
    <h2>Tasks ({allTasks.length})</h2>
    <button on:click={refresh} class="refresh-button">Refresh</button>
  </header>
  
  <div 
    bind:this={scrollContainer}
    class="scroll-container"
    on:scroll={handleScroll}
  >
    {#if page === 1 && isLoadingPage}
      <div class="initial-loading">Loading tasks...</div>
    {:else}
      <div class="task-list">
        {#each allTasks as task (task.id)}
          <div class="task-card">
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div class="meta">
              <span class="priority">Priority: {task.priority}</span>
              <span class="date">
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        {/each}
      </div>
      
      {#if isLoadingMore}
        <div class="loading-more">Loading more tasks...</div>
      {:else if !hasMore && allTasks.length > 0}
        <div class="end-message">No more tasks to load</div>
      {:else if allTasks.length === 0}
        <div class="empty-state">No tasks found</div>
      {/if}
    {/if}
  </div>
</div>
```

### 3. Real-Time Collaborative Features

```svelte
<!-- CollaborativeTaskBoard.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy } from 'svelte'
  
  export let jobId: string
  export let currentUserId: string
  
  // Real-time queries for different statuses
  const pendingQuery = ReactiveTask.where({ job_id: jobId, status: 0 })
  const activeQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  const completeQuery = ReactiveTask.where({ job_id: jobId, status: 2 })
  
  // Reactive state
  $: pendingTasks = pendingQuery.data
  $: activeTasks = activeQuery.data
  $: completeTasks = completeQuery.data
  
  // Real-time activity tracking
  let lastActivity = $state(Date.now())
  let recentChanges = $state([])
  
  // Track changes across all queries
  $: {
    const currentTime = Date.now()
    const timeSinceLastActivity = currentTime - lastActivity
    
    // Detect new tasks (simplistic approach)
    if (timeSinceLastActivity > 1000) { // More than 1 second since last update
      const allCurrentTasks = [...pendingTasks, ...activeTasks, ...completeTasks]
      const newTasks = allCurrentTasks.filter(task => 
        task.created_at > lastActivity - 5000 // Created in last 5 seconds
      )
      
      if (newTasks.length > 0) {
        recentChanges = [...recentChanges, ...newTasks.map(task => ({
          type: 'created',
          task,
          timestamp: currentTime,
          userId: task.assigned_to_id || 'unknown'
        }))].slice(-10) // Keep last 10 changes
      }
      
      lastActivity = currentTime
    }
  }
  
  // Drag and drop state
  let draggedTask = $state(null)
  let dropZone = $state(null)
  
  async function moveTask(task, newStatus) {
    try {
      await ReactiveTask.update(task.id, { status: newStatus })
      
      // Add to recent changes
      recentChanges = [...recentChanges, {
        type: 'moved',
        task,
        newStatus,
        timestamp: Date.now(),
        userId: currentUserId
      }].slice(-10)
      
    } catch (error) {
      console.error('Failed to move task:', error)
    }
  }
  
  function handleDragStart(event, task) {
    draggedTask = task
    event.dataTransfer.effectAllowed = 'move'
  }
  
  function handleDragOver(event, status) {
    event.preventDefault()
    dropZone = status
  }
  
  function handleDragLeave() {
    dropZone = null
  }
  
  function handleDrop(event, newStatus) {
    event.preventDefault()
    
    if (draggedTask && draggedTask.status !== newStatus) {
      moveTask(draggedTask, newStatus)
    }
    
    draggedTask = null
    dropZone = null
  }
  
  onDestroy(() => {
    pendingQuery.destroy()
    activeQuery.destroy()
    completeQuery.destroy()
  })
</script>

<div class="kanban-board">
  <header class="board-header">
    <h1>Task Board - Job {jobId}</h1>
    
    <div class="activity-indicator">
      {#if recentChanges.length > 0}
        <span class="activity-dot"></span>
        <span>Recent activity</span>
      {/if}
    </div>
  </header>
  
  <div class="board-columns">
    <!-- Pending Column -->
    <div 
      class="column"
      class:drop-zone={dropZone === 0}
      on:dragover={(e) => handleDragOver(e, 0)}
      on:dragleave={handleDragLeave}
      on:drop={(e) => handleDrop(e, 0)}
    >
      <h2>Pending ({pendingTasks.length})</h2>
      <div class="task-list">
        {#each pendingTasks as task (task.id)}
          <div 
            class="task-card"
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, task)}
            class:dragging={draggedTask?.id === task.id}
          >
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div class="task-meta">
              <span class="priority priority-{task.priority}">
                P{task.priority}
              </span>
              {#if task.assigned_to_id}
                <span class="assignee">
                  {task.assigned_to_id === currentUserId ? 'You' : 'Assigned'}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Active Column -->
    <div 
      class="column"
      class:drop-zone={dropZone === 1}
      on:dragover={(e) => handleDragOver(e, 1)}
      on:dragleave={handleDragLeave}
      on:drop={(e) => handleDrop(e, 1)}
    >
      <h2>Active ({activeTasks.length})</h2>
      <div class="task-list">
        {#each activeTasks as task (task.id)}
          <div 
            class="task-card active"
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, task)}
            class:dragging={draggedTask?.id === task.id}
          >
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div class="task-meta">
              <span class="priority priority-{task.priority}">
                P{task.priority}
              </span>
              {#if task.assigned_to_id}
                <span class="assignee">
                  {task.assigned_to_id === currentUserId ? 'You' : 'Assigned'}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Complete Column -->
    <div 
      class="column"
      class:drop-zone={dropZone === 2}
      on:dragover={(e) => handleDragOver(e, 2)}
      on:dragleave={handleDragLeave}
      on:drop={(e) => handleDrop(e, 2)}
    >
      <h2>Complete ({completeTasks.length})</h2>
      <div class="task-list">
        {#each completeTasks as task (task.id)}
          <div 
            class="task-card complete"
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, task)}
            class:dragging={draggedTask?.id === task.id}
          >
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            <div class="task-meta">
              <span class="priority priority-{task.priority}">
                P{task.priority}
              </span>
              <span class="completed-date">
                {new Date(task.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Recent Activity Feed -->
  {#if recentChanges.length > 0}
    <div class="activity-feed">
      <h3>Recent Activity</h3>
      <div class="activity-list">
        {#each recentChanges.slice(-5) as change}
          <div class="activity-item">
            {#if change.type === 'created'}
              <span class="activity-text">
                New task created: <strong>{change.task.title}</strong>
              </span>
            {:else if change.type === 'moved'}
              <span class="activity-text">
                Task moved: <strong>{change.task.title}</strong> 
                to {change.newStatus === 0 ? 'Pending' : 
                    change.newStatus === 1 ? 'Active' : 'Complete'}
              </span>
            {/if}
            <span class="activity-time">
              {new Date(change.timestamp).toLocaleTimeString()}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
```

---

## Real-Time Data Synchronization

### Automatic Updates

ReactiveRecord queries automatically synchronize with the underlying Zero.js data:

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  // This query will automatically update when:
  // 1. New tasks are created with this job_id
  // 2. Existing tasks are updated 
  // 3. Tasks are deleted/discarded
  // 4. Tasks are moved to/from this status
  const activeTasksQuery = ReactiveTask.where({ 
    job_id: jobId, 
    status: 1 
  })
  
  $: activeTasks = activeTasksQuery.data
  $: taskCount = activeTasks.length
  
  // The UI will reactively update whenever the underlying data changes
  // No manual refresh or polling needed!
</script>

<div class="live-counter">
  <h2>Active Tasks: {taskCount}</h2>
  <p>This counter updates in real-time as tasks are created, updated, or deleted.</p>
  
  {#each activeTasks as task (task.id)}
    <div class="task-item" in:fade out:slide>
      {task.title}
    </div>
  {/each}
</div>
```

### Cross-Component Synchronization

Multiple components using the same reactive queries stay automatically synchronized:

```svelte
<!-- Dashboard.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  const taskStatsQuery = ReactiveTask.where({ job_id: jobId })
  $: allTasks = taskStatsQuery.data
  $: activeCount = allTasks.filter(t => t.status === 1).length
</script>

<div class="stats">
  Active Tasks: {activeCount}
</div>

<!-- TaskList.svelte (same data, different view) -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  const activeTasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  $: activeTasks = activeTasksQuery.data
</script>

<div class="task-list">
  {#each activeTasks as task}
    <div>{task.title}</div>
  {/each}
</div>

<!-- Both components automatically stay in sync! -->
```

---

## Performance Optimization

### Query Deduplication

ReactiveRecord automatically deduplicates identical queries:

```svelte
<script>
  // These three queries are identical and will be deduped automatically
  const query1 = ReactiveTask.where({ status: 1 })
  const query2 = ReactiveTask.where({ status: 1 })
  const query3 = ReactiveTask.where({ status: 1 })
  
  // Only one actual query is made to Zero.js
  // All three components get the same reactive data
  $: tasks1 = query1.data
  $: tasks2 = query2.data  // Same data reference
  $: tasks3 = query3.data  // Same data reference
</script>
```

### Conditional Query Loading

Only create queries when needed:

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let selectedJobId: string | null = null
  let showCompleted = $state(false)
  
  // Only create queries when job is selected
  $: activeQuery = selectedJobId 
    ? ReactiveTask.where({ job_id: selectedJobId, status: 1 })
    : null
    
  $: completedQuery = selectedJobId && showCompleted
    ? ReactiveTask.where({ job_id: selectedJobId, status: 2 })
    : null
  
  $: activeTasks = activeQuery?.data ?? []
  $: completedTasks = completedQuery?.data ?? []
</script>

{#if selectedJobId}
  <div class="task-view">
    <h2>Active Tasks ({activeTasks.length})</h2>
    <!-- Active tasks list -->
    
    <label>
      <input type="checkbox" bind:checked={showCompleted} />
      Show completed tasks
    </label>
    
    {#if showCompleted}
      <h2>Completed Tasks ({completedTasks.length})</h2>
      <!-- Completed tasks list -->
    {/if}
  </div>
{:else}
  <p>Select a job to view tasks</p>
{/if}
```

### Pagination and Virtual Scrolling

For large datasets, implement pagination or virtual scrolling:

```svelte
<!-- VirtualTaskList.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  import VirtualList from './VirtualList.svelte'
  
  export let jobId: string
  
  let pageSize = $state(50)
  let visibleRange = $state({ start: 0, end: 50 })
  
  // Only load visible items
  $: visibleTasksQuery = ReactiveTask
    .where({ job_id: jobId, status: 1 })
    .orderBy('created_at', 'desc')
    .limit(pageSize)
    .offset(visibleRange.start)
  
  $: visibleTasks = visibleTasksQuery.data
  
  // Get total count for virtual scrolling
  $: totalCountQuery = ReactiveTask
    .where({ job_id: jobId, status: 1 })
    .count()
  
  $: totalCount = totalCountQuery.data
  
  function handleRangeChange(event) {
    visibleRange = event.detail
  }
</script>

<VirtualList
  itemCount={totalCount}
  itemHeight={80}
  items={visibleTasks}
  on:rangeChange={handleRangeChange}
  let:item={task}
>
  <div class="task-item">
    <h3>{task.title}</h3>
    <p>{task.description}</p>
  </div>
</VirtualList>
```

---

## Memory Management

### Automatic Cleanup

ReactiveRecord handles most cleanup automatically, but follow these patterns:

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy } from 'svelte'
  
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  // Automatic cleanup when component is destroyed
  onDestroy(() => {
    tasksQuery.destroy()
  })
  
  // Or use the cleanup helper
  $: if (tasksQuery) {
    return () => tasksQuery.destroy()
  }
</script>
```

### Query Lifecycle Management

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let isVisible: boolean = true
  
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  // Pause/resume queries based on visibility
  $: {
    if (isVisible) {
      tasksQuery.enable()
    } else {
      tasksQuery.disable() // Stops updates but keeps data
    }
  }
  
  // Force cleanup when really done
  function handleDestroy() {
    tasksQuery.destroy() // Full cleanup
  }
</script>

{#if isVisible}
  <div class="task-list">
    {#each tasksQuery.data as task}
      <div>{task.title}</div>
    {/each}
  </div>
{/if}
```

---

## Error Handling in Reactive Context

### Global Error Handling

```svelte
<!-- App.svelte -->
<script>
  import { onMount } from 'svelte'
  
  let globalError = $state(null)
  
  onMount(() => {
    // Listen for ReactiveRecord errors
    window.addEventListener('reactiverecord:error', (event) => {
      globalError = event.detail.error
      console.error('ReactiveRecord error:', event.detail)
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        globalError = null
      }, 5000)
    })
  })
</script>

{#if globalError}
  <div class="global-error">
    Error: {globalError.message}
    <button on:click={() => globalError = null}>Dismiss</button>
  </div>
{/if}

<main>
  <!-- Your app content -->
</main>
```

### Component-Level Error Handling

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
  $: error = tasksQuery.error
  
  // Retry function
  function retry() {
    tasksQuery.refresh()
  }
  
  // Error recovery
  $: if (error) {
    console.error('Task query failed:', error)
    
    // Automatic retry for network errors
    if (error.message.includes('network') || error.message.includes('connection')) {
      setTimeout(() => {
        console.log('Auto-retrying query...')
        retry()
      }, 3000)
    }
  }
</script>

{#if isLoading}
  <div class="loading">Loading tasks...</div>
{:else if error}
  <div class="error-state">
    <h3>Unable to load tasks</h3>
    <p>{error.message}</p>
    <button on:click={retry}>Try Again</button>
  </div>
{:else if tasks.length === 0}
  <div class="empty-state">
    <p>No tasks found for this job.</p>
  </div>
{:else}
  <div class="task-list">
    {#each tasks as task (task.id)}
      <div class="task-item">{task.title}</div>
    {/each}
  </div>
{/if}
```

---

## Testing Reactive Components

### Unit Testing with Vitest

```typescript
// TaskList.test.ts
import { render, screen } from '@testing-library/svelte'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import TaskList from './TaskList.svelte'

// Mock ReactiveTask
vi.mock('$lib/models', () => ({
  ReactiveTask: {
    where: vi.fn(() => ({
      data: [],
      isLoading: false,
      error: null,
      destroy: vi.fn()
    }))
  }
}))

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('displays loading state', () => {
    const mockQuery = {
      data: [],
      isLoading: true,
      error: null,
      destroy: vi.fn()
    }
    
    vi.mocked(ReactiveTask.where).mockReturnValue(mockQuery)
    
    render(TaskList, { props: { jobId: 'test-job' } })
    
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument()
  })
  
  it('displays tasks when loaded', () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 1 },
      { id: '2', title: 'Task 2', status: 1 }
    ]
    
    const mockQuery = {
      data: mockTasks,
      isLoading: false,
      error: null,
      destroy: vi.fn()
    }
    
    vi.mocked(ReactiveTask.where).mockReturnValue(mockQuery)
    
    render(TaskList, { props: { jobId: 'test-job' } })
    
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })
  
  it('handles error state', () => {
    const mockQuery = {
      data: [],
      isLoading: false,
      error: new Error('Network error'),
      destroy: vi.fn()
    }
    
    vi.mocked(ReactiveTask.where).mockReturnValue(mockQuery)
    
    render(TaskList, { props: { jobId: 'test-job' } })
    
    expect(screen.getByText(/Network error/)).toBeInTheDocument()
  })
})
```

### Integration Testing with Playwright

```typescript
// task-list.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Task List Reactivity', () => {
  test('updates automatically when task is created', async ({ page }) => {
    // Navigate to task list
    await page.goto('/jobs/test-job/tasks')
    
    // Verify initial empty state
    await expect(page.locator('.task-item')).toHaveCount(0)
    
    // Create a new task in another tab/window
    const newPage = await page.context().newPage()
    await newPage.goto('/jobs/test-job/tasks/new')
    await newPage.fill('[data-test="task-title"]', 'New Task')
    await newPage.click('[data-test="save-task"]')
    await newPage.close()
    
    // Verify original page updates automatically
    await expect(page.locator('.task-item')).toHaveCount(1)
    await expect(page.locator('.task-item')).toContainText('New Task')
  })
  
  test('updates count in real-time', async ({ page }) => {
    await page.goto('/jobs/test-job/dashboard')
    
    // Initial count
    await expect(page.locator('[data-test="task-count"]')).toContainText('0')
    
    // Create task via API
    await page.evaluate(() => {
      return fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'API Task',
          job_id: 'test-job',
          status: 1
        })
      })
    })
    
    // Count should update automatically
    await expect(page.locator('[data-test="task-count"]')).toContainText('1')
  })
})
```

---

**You now have comprehensive Svelte 5 integration with Epic-008's ReactiveRecord! The reactive patterns provide automatic UI updates, excellent performance, and seamless real-time synchronization. 🚀**