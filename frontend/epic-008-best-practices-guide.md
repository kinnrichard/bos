# Epic-008 Best Practices Guide
*Architecture Patterns and Performance Optimization for ActiveRecord/ReactiveRecord*

**Version**: 1.0  
**Generated**: 2025-07-13  
**Epic**: Epic-008 - ActiveRecord Implementation  

---

## 🎯 Overview

This guide establishes best practices for Epic-008's ActiveRecord/ReactiveRecord architecture. Following these patterns ensures optimal performance, maintainability, and team consistency.

### Core Principles

- ✅ **Rails-like conventions** - Follow established ActiveRecord patterns
- ✅ **Type safety first** - Leverage TypeScript for error prevention
- ✅ **Reactive efficiency** - Optimize reactive queries and memory usage
- ✅ **Consistent patterns** - Standardize across team and codebase
- ✅ **Performance focus** - Minimize query overhead and bundle size
- ✅ **Error resilience** - Handle edge cases gracefully

---

## 📋 Table of Contents

1. [Architecture Patterns](#architecture-patterns)
2. [Model Design Best Practices](#model-design-best-practices)
3. [Query Optimization](#query-optimization)
4. [Reactive Pattern Guidelines](#reactive-pattern-guidelines)
5. [Component Architecture](#component-architecture)
6. [Error Handling Strategies](#error-handling-strategies)
7. [Performance Optimization](#performance-optimization)
8. [Testing Best Practices](#testing-best-practices)
9. [Code Organization](#code-organization)
10. [Security Considerations](#security-considerations)

---

## Architecture Patterns

### 1. Model Selection Guidelines

**Use ActiveRecord when:**
- ✅ Server-side operations
- ✅ Utility functions and scripts
- ✅ Test code and fixtures
- ✅ API endpoints and middleware
- ✅ Batch processing operations
- ✅ Non-UI business logic

**Use ReactiveRecord when:**
- ✅ Svelte components with live data
- ✅ Real-time dashboards
- ✅ User interface updates
- ✅ Form validation with live feedback
- ✅ Collaborative features
- ✅ Data visualization components

```typescript
// ✅ Good: ActiveRecord for utilities
// utils/task-processor.ts
import { Task } from '$lib/models'

export async function processOverdueTasks() {
  const overdueTasks = await Task
    .where({ status: 1 })
    .where('due_date', '<', Date.now())
    .all()
  
  for (const task of overdueTasks) {
    await Task.update(task.id, { status: 3 })
  }
}

// ✅ Good: ReactiveRecord for components
// TaskDashboard.svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  const activeTasksQuery = ReactiveTask.where({ status: 1 })
  $: activeTasks = activeTasksQuery.data
</script>
```

### 2. Layered Architecture

```
┌─────────────────────────────────────┐
│          Svelte Components          │
│     (ReactiveRecord queries)        │
├─────────────────────────────────────┤
│         Business Logic              │
│     (ActiveRecord operations)       │
├─────────────────────────────────────┤
│       Model Layer (Epic-008)        │
│   ActiveRecord | ReactiveRecord     │
├─────────────────────────────────────┤
│         Zero.js Integration         │
│    (Automatic error handling)       │
├─────────────────────────────────────┤
│            Database                 │
└─────────────────────────────────────┘
```

**Example Implementation:**
```typescript
// ✅ Good: Clear layer separation

// Business Logic Layer
// services/task-service.ts
import { Task } from '$lib/models'

export class TaskService {
  static async markOverdue() {
    return await Task
      .where({ status: 1 })
      .where('due_date', '<', Date.now())
      .update({ status: 3 })
  }
  
  static async getProjectStats(jobId: string) {
    const [active, completed, overdue] = await Promise.all([
      Task.where({ job_id: jobId, status: 1 }).count(),
      Task.where({ job_id: jobId, status: 2 }).count(),
      Task.where({ job_id: jobId, status: 3 }).count()
    ])
    
    return { active, completed, overdue }
  }
}

// Component Layer
// ProjectDashboard.svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { TaskService } from '$lib/services/task-service'
  
  export let jobId: string
  
  // Reactive queries for UI
  const activeQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  $: activeTasks = activeQuery.data
  
  // Business logic for actions
  async function handleMarkOverdue() {
    await TaskService.markOverdue()
    // Reactive queries update automatically
  }
</script>
```

---

## Model Design Best Practices

### 1. Type Definitions

**Always use proper TypeScript interfaces:**

```typescript
// ✅ Good: Comprehensive type definitions
interface TaskData extends BaseRecord {
  id: string
  title: string
  description?: string
  status: TaskStatus  // Use enums for constraints
  priority: TaskPriority
  job_id?: string
  assigned_to_id?: string | null
  due_date?: number | null
  position?: number
  applies_to_all_targets: boolean
  lock_version: number
  created_at: number
  updated_at: number
  discarded_at?: number | null
}

// ✅ Good: Enum constraints
enum TaskStatus {
  PENDING = 0,
  ACTIVE = 1,
  COMPLETE = 2,
  OVERDUE = 3
}

enum TaskPriority {
  LOW = 3,
  MEDIUM = 2,
  HIGH = 1
}

// ❌ Bad: Loose typing
interface BadTaskData {
  id: any
  title: string
  status: number  // No constraints
  data: any       // Avoid 'any'
}
```

### 2. Model Configuration

**Centralize model configurations:**

```typescript
// ✅ Good: Centralized configuration
// models/config.ts
export const MODEL_CONFIGS = {
  Task: {
    tableName: 'tasks',
    className: 'Task',
    primaryKey: 'id'
  },
  Job: {
    tableName: 'jobs', 
    className: 'Job',
    primaryKey: 'id'
  }
} as const

// models/task.ts
import { createActiveRecord } from '$lib/models/base/active-record'
import { MODEL_CONFIGS } from './config'
import type { TaskData } from './types'

export const Task = createActiveRecord<TaskData>(MODEL_CONFIGS.Task)
```

### 3. Validation Patterns

**Implement consistent validation:**

```typescript
// ✅ Good: Validation utilities
// models/validation.ts
export const TaskValidation = {
  validateCreate(data: CreateTaskData): ValidationResult {
    const errors: ValidationErrors = {}
    
    if (!data.title || data.title.trim().length < 3) {
      errors.title = ['Title must be at least 3 characters']
    }
    
    if (!data.lock_version || data.lock_version < 1) {
      errors.lock_version = ['Lock version is required']
    }
    
    if (data.priority < 1 || data.priority > 3) {
      errors.priority = ['Priority must be 1, 2, or 3']
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// ✅ Good: Use in model operations
export async function createValidatedTask(data: CreateTaskData) {
  const validation = TaskValidation.validateCreate(data)
  
  if (!validation.isValid) {
    throw new RecordInvalidError('Validation failed', data, validation.errors)
  }
  
  return await Task.create(data)
}
```

---

## Query Optimization

### 1. Query Building Best Practices

**Use method chaining efficiently:**

```typescript
// ✅ Good: Efficient query building
async function getProjectTasks(projectId: string, options: TaskQueryOptions = {}) {
  let query = Task.where({ job_id: projectId })
  
  // Apply filters conditionally
  if (options.status !== undefined) {
    query = query.where({ status: options.status })
  }
  
  if (options.priority !== undefined) {
    query = query.where({ priority: options.priority })
  }
  
  if (options.assignedOnly) {
    query = query.whereNotNull('assigned_to_id')
  }
  
  if (options.excludeDiscarded !== false) {
    query = query.kept()
  }
  
  // Always apply consistent ordering
  query = query.orderBy('priority', 'asc').orderBy('created_at', 'desc')
  
  // Apply pagination if requested
  if (options.limit) {
    query = query.limit(options.limit)
    
    if (options.offset) {
      query = query.offset(options.offset)
    }
  }
  
  return await query.all()
}

// ❌ Bad: Inefficient separate queries
async function getBadProjectTasks(projectId: string) {
  const allTasks = await Task.where({ job_id: projectId }).all()
  const activeTasks = allTasks.filter(t => t.status === 1)
  const sortedTasks = activeTasks.sort((a, b) => a.priority - b.priority)
  return sortedTasks.slice(0, 20)
}
```

### 2. Avoid N+1 Query Problems

**Batch operations instead of loops:**

```typescript
// ✅ Good: Batch operations
async function updateTaskPriorities(taskIds: string[], newPriority: number) {
  // Single batch update
  const results = await Promise.all(
    taskIds.map(id => Task.update(id, { priority: newPriority }))
  )
  return results
}

// ✅ Good: Efficient filtering
async function getTasksWithDetails(jobId: string) {
  // Single query with proper filtering
  return await Task
    .where({ job_id: jobId })
    .whereNotNull('assigned_to_id')
    .kept()
    .orderBy('priority', 'asc')
    .all()
}

// ❌ Bad: N+1 queries
async function getBadTasksWithDetails(jobId: string) {
  const tasks = await Task.where({ job_id: jobId }).all()
  
  // N+1 problem - one query per task
  const detailedTasks = []
  for (const task of tasks) {
    if (task.assigned_to_id) {
      const updatedTask = await Task.find(task.id) // Unnecessary query
      detailedTasks.push(updatedTask)
    }
  }
  
  return detailedTasks
}
```

### 3. Query Caching Strategies

**Implement intelligent caching:**

```typescript
// ✅ Good: Cache expensive queries
class TaskAnalytics {
  private static cache = new Map<string, { data: any; timestamp: number }>()
  private static TTL = 5 * 60 * 1000 // 5 minutes
  
  static async getProjectStats(jobId: string, forceRefresh = false) {
    const cacheKey = `project-stats-${jobId}`
    const cached = this.cache.get(cacheKey)
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data
    }
    
    // Expensive aggregation query
    const [totalTasks, completedTasks, overdueTasks] = await Promise.all([
      Task.where({ job_id: jobId }).kept().count(),
      Task.where({ job_id: jobId, status: 2 }).kept().count(),
      Task.where({ job_id: jobId, status: 1 })
         .where('due_date', '<', Date.now())
         .kept().count()
    ])
    
    const stats = {
      total: totalTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0
    }
    
    this.cache.set(cacheKey, { data: stats, timestamp: Date.now() })
    return stats
  }
}
```

---

## Reactive Pattern Guidelines

### 1. Query Lifecycle Management

**Always clean up reactive queries:**

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy } from 'svelte'
  
  export let jobId: string
  
  // ✅ Good: Proper lifecycle management
  const tasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
  $: error = tasksQuery.error
  
  // Essential cleanup
  onDestroy(() => {
    tasksQuery.destroy()
  })
</script>

<!-- ❌ Bad: No cleanup -->
<script>
  const tasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  // Memory leak - query never cleaned up
</script>
```

### 2. Conditional Query Creation

**Create queries conditionally to avoid waste:**

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let selectedJobId: string | null = null
  export let showArchived: boolean = false
  
  // ✅ Good: Conditional query creation
  $: activeTasksQuery = selectedJobId 
    ? ReactiveTask.where({ job_id: selectedJobId, status: 1 })
    : null
    
  $: archivedTasksQuery = selectedJobId && showArchived
    ? ReactiveTask.where({ job_id: selectedJobId }).discarded()
    : null
  
  $: activeTasks = activeTasksQuery?.data ?? []
  $: archivedTasks = archivedTasksQuery?.data ?? []
  
  // ❌ Bad: Always create queries
  const badActiveQuery = ReactiveTask.where({ 
    job_id: selectedJobId || 'none', // Wasteful query
    status: 1 
  })
</script>

{#if selectedJobId}
  <div class="task-lists">
    <h2>Active Tasks ({activeTasks.length})</h2>
    <!-- Active tasks -->
    
    {#if showArchived}
      <h2>Archived Tasks ({archivedTasks.length})</h2>
      <!-- Archived tasks -->
    {/if}
  </div>
{:else}
  <p>Select a job to view tasks</p>
{/if}
```

### 3. Reactive State Patterns

**Use derived state for complex calculations:**

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  // ✅ Good: Reactive derived state
  $: allTasks = tasksQuery.data
  $: activeTasks = allTasks.filter(t => t.status === 1)
  $: completedTasks = allTasks.filter(t => t.status === 2)
  $: overdueTasks = activeTasks.filter(t => 
    t.due_date && t.due_date < Date.now()
  )
  
  // Complex derived calculations
  $: stats = {
    total: allTasks.length,
    active: activeTasks.length,
    completed: completedTasks.length,
    overdue: overdueTasks.length,
    completionRate: allTasks.length > 0 
      ? Math.round((completedTasks.length / allTasks.length) * 100)
      : 0,
    hasUrgentTasks: overdueTasks.some(t => t.priority === 1)
  }
  
  // ❌ Bad: Non-reactive calculations
  function getBadStats() {
    // Recalculated every time, not reactive
    return {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 2).length
    }
  }
</script>

<div class="dashboard">
  <div class="stat-card" class:urgent={stats.hasUrgentTasks}>
    <span class="number">{stats.active}</span>
    <span class="label">Active</span>
  </div>
  
  <div class="stat-card">
    <span class="number">{stats.completionRate}%</span>
    <span class="label">Complete</span>
  </div>
  
  {#if stats.overdue > 0}
    <div class="stat-card urgent">
      <span class="number">{stats.overdue}</span>
      <span class="label">Overdue</span>
    </div>
  {/if}
</div>
```

---

## Component Architecture

### 1. Component Composition Patterns

**Create reusable, focused components:**

```svelte
<!-- ✅ Good: Focused, reusable components -->

<!-- TaskCard.svelte -->
<script>
  export let task: TaskData
  export let onEdit: (task: TaskData) => void = () => {}
  export let onDelete: (taskId: string) => void = () => {}
  
  $: isOverdue = task.due_date && task.due_date < Date.now()
  $: priorityLabel = task.priority === 1 ? 'High' : 
                    task.priority === 2 ? 'Medium' : 'Low'
</script>

<div class="task-card" class:overdue={isOverdue}>
  <h3>{task.title}</h3>
  <p>{task.description}</p>
  
  <div class="task-meta">
    <span class="priority priority-{task.priority}">{priorityLabel}</span>
    {#if task.due_date}
      <span class="due-date">
        Due: {new Date(task.due_date).toLocaleDateString()}
      </span>
    {/if}
  </div>
  
  <div class="actions">
    <button on:click={() => onEdit(task)}>Edit</button>
    <button on:click={() => onDelete(task.id)}>Delete</button>
  </div>
</div>

<!-- TaskList.svelte -->
<script>
  import TaskCard from './TaskCard.svelte'
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  const tasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  $: tasks = tasksQuery.data
  
  async function handleEditTask(task: TaskData) {
    // Handle edit logic
  }
  
  async function handleDeleteTask(taskId: string) {
    await ReactiveTask.discard(taskId)
  }
</script>

<div class="task-list">
  {#each tasks as task (task.id)}
    <TaskCard 
      {task}
      onEdit={handleEditTask}
      onDelete={handleDeleteTask}
    />
  {/each}
</div>
```

### 2. State Management Patterns

**Use component-level state effectively:**

```svelte
<!-- ✅ Good: Clear state management -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // External reactive state
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  // Local component state
  let selectedTaskIds = $state(new Set<string>())
  let showCompleted = $state(false)
  let sortBy = $state('priority')
  let filterText = $state('')
  
  // Derived state
  $: allTasks = tasksQuery.data
  $: visibleTasks = allTasks
    .filter(task => showCompleted || task.status !== 2)
    .filter(task => !filterText || 
      task.title.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority
      if (sortBy === 'created') return b.created_at - a.created_at
      return a.title.localeCompare(b.title)
    })
  
  $: selectedCount = selectedTaskIds.size
  $: allSelected = visibleTasks.length > 0 && 
    visibleTasks.every(task => selectedTaskIds.has(task.id))
  
  function toggleTask(taskId: string) {
    if (selectedTaskIds.has(taskId)) {
      selectedTaskIds.delete(taskId)
    } else {
      selectedTaskIds.add(taskId)
    }
    selectedTaskIds = selectedTaskIds // Trigger reactivity
  }
  
  function toggleAll() {
    if (allSelected) {
      selectedTaskIds.clear()
    } else {
      visibleTasks.forEach(task => selectedTaskIds.add(task.id))
    }
    selectedTaskIds = selectedTaskIds
  }
</script>

<div class="task-manager">
  <header class="controls">
    <input 
      bind:value={filterText} 
      placeholder="Filter tasks..."
      class="filter-input"
    />
    
    <select bind:value={sortBy}>
      <option value="priority">Priority</option>
      <option value="created">Created Date</option>
      <option value="title">Title</option>
    </select>
    
    <label>
      <input type="checkbox" bind:checked={showCompleted} />
      Show completed
    </label>
    
    {#if selectedCount > 0}
      <div class="bulk-actions">
        <span>{selectedCount} selected</span>
        <button on:click={handleBulkDelete}>Delete Selected</button>
      </div>
    {/if}
  </header>
  
  <div class="task-list">
    <label class="select-all">
      <input 
        type="checkbox" 
        checked={allSelected}
        on:change={toggleAll}
      />
      Select All
    </label>
    
    {#each visibleTasks as task (task.id)}
      <div class="task-item">
        <input 
          type="checkbox" 
          checked={selectedTaskIds.has(task.id)}
          on:change={() => toggleTask(task.id)}
        />
        <span>{task.title}</span>
      </div>
    {/each}
  </div>
</div>
```

---

## Error Handling Strategies

### 1. Graceful Degradation

**Handle errors without breaking the UI:**

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
  $: error = tasksQuery.error
  
  // ✅ Good: Graceful error handling
  let retryCount = $state(0)
  const MAX_RETRIES = 3
  
  $: if (error && retryCount < MAX_RETRIES) {
    // Auto-retry for transient errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      setTimeout(() => {
        retryCount++
        tasksQuery.refresh()
      }, 1000 * Math.pow(2, retryCount)) // Exponential backoff
    }
  }
  
  function handleManualRetry() {
    retryCount = 0
    tasksQuery.refresh()
  }
  
  // Provide fallback data when possible
  $: displayTasks = tasks.length > 0 ? tasks : []
</script>

{#if isLoading && tasks.length === 0}
  <div class="loading-state">
    <div class="spinner"></div>
    <p>Loading tasks...</p>
  </div>
{:else if error && retryCount >= MAX_RETRIES}
  <div class="error-state">
    <h3>Unable to load tasks</h3>
    <p>{error.message}</p>
    <div class="error-actions">
      <button on:click={handleManualRetry}>Try Again</button>
      <button on:click={() => goto('/dashboard')}>Go to Dashboard</button>
    </div>
  </div>
{:else}
  <div class="task-list">
    {#if isLoading}
      <div class="loading-indicator">Updating...</div>
    {/if}
    
    {#if displayTasks.length === 0}
      <div class="empty-state">
        <p>No tasks found for this project.</p>
        <button on:click={() => goto(`/jobs/${jobId}/tasks/new`)}>
          Create First Task
        </button>
      </div>
    {:else}
      {#each displayTasks as task (task.id)}
        <TaskCard {task} />
      {/each}
    {/if}
  </div>
{/if}
```

### 2. Input Validation

**Validate data at component boundaries:**

```svelte
<!-- TaskForm.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  import type { CreateTaskData } from '$lib/models'
  
  export let jobId: string
  export let onSave: (task: TaskData) => void = () => {}
  
  // Form state
  let title = $state('')
  let description = $state('')
  let priority = $state(2)
  let dueDate = $state('')
  
  // Validation state
  let errors = $state<Record<string, string>>({})
  let isSaving = $state(false)
  
  // ✅ Good: Real-time validation
  $: {
    const newErrors: Record<string, string> = {}
    
    if (title.length > 0 && title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }
    
    if (title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters'
    }
    
    if (description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }
    
    if (dueDate && new Date(dueDate) <= new Date()) {
      newErrors.dueDate = 'Due date must be in the future'
    }
    
    errors = newErrors
  }
  
  $: isValid = Object.keys(errors).length === 0 && 
              title.trim().length >= 3
  
  async function handleSubmit() {
    if (!isValid || isSaving) return
    
    isSaving = true
    
    try {
      const taskData: CreateTaskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate ? new Date(dueDate).getTime() : null,
        job_id: jobId,
        status: 1,
        applies_to_all_targets: false,
        lock_version: 1
      }
      
      const savedTask = await ReactiveTask.create(taskData)
      
      // Reset form
      title = ''
      description = ''
      priority = 2
      dueDate = ''
      
      onSave(savedTask)
      
    } catch (error) {
      // Handle server validation errors
      if (error instanceof RecordInvalidError) {
        errors = { ...errors, ...error.validationErrors }
      } else {
        errors = { form: 'An unexpected error occurred. Please try again.' }
      }
    } finally {
      isSaving = false
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="task-form">
  <div class="field">
    <label for="title">Title *</label>
    <input 
      id="title"
      bind:value={title}
      placeholder="Enter task title..."
      class:error={errors.title}
      aria-invalid={!!errors.title}
      aria-describedby={errors.title ? 'title-error' : undefined}
    />
    {#if errors.title}
      <span id="title-error" class="error-message">{errors.title}</span>
    {/if}
  </div>
  
  <div class="field">
    <label for="description">Description</label>
    <textarea 
      id="description"
      bind:value={description}
      placeholder="Enter task description..."
      class:error={errors.description}
      aria-invalid={!!errors.description}
    ></textarea>
    {#if errors.description}
      <span class="error-message">{errors.description}</span>
    {/if}
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
        class:error={errors.dueDate}
        aria-invalid={!!errors.dueDate}
      />
      {#if errors.dueDate}
        <span class="error-message">{errors.dueDate}</span>
      {/if}
    </div>
  </div>
  
  {#if errors.form}
    <div class="form-error">{errors.form}</div>
  {/if}
  
  <div class="form-actions">
    <button 
      type="submit" 
      disabled={!isValid || isSaving}
      class="primary-button"
    >
      {isSaving ? 'Creating...' : 'Create Task'}
    </button>
  </div>
</form>
```

---

## Performance Optimization

### 1. Bundle Size Optimization

**Minimize imports and use tree shaking:**

```typescript
// ✅ Good: Specific imports
import { Task, ReactiveTask } from '$lib/models'
import type { TaskData, CreateTaskData } from '$lib/models'

// ✅ Good: Lazy loading for heavy components
import { onMount } from 'svelte'

let HeavyChart: any = null

onMount(async () => {
  const module = await import('./HeavyChart.svelte')
  HeavyChart = module.default
})

// ❌ Bad: Heavy imports that aren't always needed
import HeavyChart from './HeavyChart.svelte' // Always loaded
import * as entireLibrary from 'heavy-library' // Imports everything
```

### 2. Memory Management

**Implement proper cleanup patterns:**

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy, onMount } from 'svelte'
  
  export let jobId: string
  
  // ✅ Good: Tracked queries for cleanup
  const queries = new Set<ReactiveQuery>()
  
  function createQuery(conditions: any) {
    const query = ReactiveTask.where(conditions)
    queries.add(query)
    return query
  }
  
  $: activeTasksQuery = createQuery({ job_id: jobId, status: 1 })
  $: completedTasksQuery = createQuery({ job_id: jobId, status: 2 })
  
  // Cleanup all queries
  onDestroy(() => {
    queries.forEach(query => query.destroy())
    queries.clear()
  })
  
  // ✅ Good: Pause queries when not visible
  let isVisible = $state(true)
  
  onMount(() => {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
    })
    
    observer.observe(document.querySelector('.task-dashboard'))
    
    return () => observer.disconnect()
  })
  
  $: {
    queries.forEach(query => {
      if (isVisible) {
        query.enable()
      } else {
        query.disable()
      }
    })
  }
</script>
```

### 3. Reactive Optimization

**Optimize reactive calculations:**

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  // ✅ Good: Memoized expensive calculations
  let expensiveStatsCache = $state(null)
  let lastTasksLength = $state(0)
  
  $: tasks = tasksQuery.data
  
  $: {
    // Only recalculate if tasks changed significantly
    if (tasks.length !== lastTasksLength) {
      lastTasksLength = tasks.length
      
      expensiveStatsCache = calculateExpensiveStats(tasks)
    }
  }
  
  function calculateExpensiveStats(tasks: TaskData[]) {
    // Expensive calculation that we want to memoize
    const stats = {
      totalEffort: tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0),
      avgPriority: tasks.reduce((sum, task) => sum + task.priority, 0) / tasks.length,
      priorityDistribution: tasks.reduce((dist, task) => {
        dist[task.priority] = (dist[task.priority] || 0) + 1
        return dist
      }, {} as Record<number, number>)
    }
    
    return stats
  }
  
  // ❌ Bad: Recalculates every render
  $: badStats = {
    totalEffort: tasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0),
    avgPriority: tasks.reduce((sum, task) => sum + task.priority, 0) / tasks.length
  }
</script>
```

---

## Testing Best Practices

### 1. Unit Testing Models

**Test model logic comprehensively:**

```typescript
// Task.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Task } from '$lib/models'
import { RecordNotFoundError } from '$lib/models/base/active-record'

describe('Task Model', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('find()', () => {
    it('should return task when found', async () => {
      const mockTask = {
        id: 'task-123',
        title: 'Test Task',
        status: 1,
        created_at: Date.now()
      }
      
      // Mock Zero.js client
      vi.mocked(getZero).mockReturnValue({
        query: {
          tasks: {
            where: vi.fn().mockReturnThis(),
            one: vi.fn().mockResolvedValue(mockTask)
          }
        }
      })
      
      const result = await Task.find('task-123')
      
      expect(result).toEqual(mockTask)
    })
    
    it('should throw RecordNotFoundError when not found', async () => {
      vi.mocked(getZero).mockReturnValue({
        query: {
          tasks: {
            where: vi.fn().mockReturnThis(),
            one: vi.fn().mockResolvedValue(null)
          }
        }
      })
      
      await expect(Task.find('invalid-id')).rejects.toThrow(RecordNotFoundError)
    })
  })
  
  describe('create()', () => {
    it('should create task with proper validation', async () => {
      const taskData = {
        title: 'New Task',
        status: 1,
        priority: 2,
        applies_to_all_targets: false,
        lock_version: 1
      }
      
      const mockCreatedTask = {
        id: 'new-task-id',
        ...taskData,
        created_at: Date.now(),
        updated_at: Date.now()
      }
      
      vi.mocked(getZero).mockReturnValue({
        mutate: {
          tasks: {
            insert: vi.fn().mockResolvedValue(undefined)
          }
        },
        query: {
          tasks: {
            where: vi.fn().mockReturnThis(),
            one: vi.fn().mockResolvedValue(mockCreatedTask)
          }
        }
      })
      
      const result = await Task.create(taskData)
      
      expect(result).toEqual(mockCreatedTask)
      expect(result.id).toBeDefined()
      expect(result.created_at).toBeDefined()
    })
  })
})
```

### 2. Integration Testing

**Test component integration:**

```typescript
// TaskList.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import { vi } from 'vitest'
import TaskList from './TaskList.svelte'

vi.mock('$lib/models', () => ({
  ReactiveTask: {
    where: vi.fn()
  }
}))

describe('TaskList Component', () => {
  it('should display tasks when loaded', async () => {
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
  
  it('should handle task deletion', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', status: 1 }
    ]
    
    const mockQuery = {
      data: mockTasks,
      isLoading: false,
      error: null,
      destroy: vi.fn()
    }
    
    vi.mocked(ReactiveTask.where).mockReturnValue(mockQuery)
    vi.mocked(ReactiveTask.discard).mockResolvedValue()
    
    render(TaskList, { props: { jobId: 'test-job' } })
    
    const deleteButton = screen.getByText('Delete')
    await fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(ReactiveTask.discard).toHaveBeenCalledWith('1')
    })
  })
})
```

### 3. End-to-End Testing

**Test complete user workflows:**

```typescript
// task-workflow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Task Management Workflow', () => {
  test('should create, edit, and delete task', async ({ page }) => {
    // Navigate to task list
    await page.goto('/jobs/test-job/tasks')
    
    // Create new task
    await page.click('[data-test="new-task-button"]')
    await page.fill('[data-test="task-title"]', 'E2E Test Task')
    await page.fill('[data-test="task-description"]', 'Created by automated test')
    await page.selectOption('[data-test="task-priority"]', '1')
    await page.click('[data-test="save-task"]')
    
    // Verify task appears in list
    await expect(page.locator('[data-test="task-item"]')).toContainText('E2E Test Task')
    
    // Edit task
    await page.click('[data-test="task-item"]:has-text("E2E Test Task") [data-test="edit-button"]')
    await page.fill('[data-test="task-title"]', 'Updated E2E Task')
    await page.click('[data-test="save-task"]')
    
    // Verify update
    await expect(page.locator('[data-test="task-item"]')).toContainText('Updated E2E Task')
    
    // Delete task
    await page.click('[data-test="task-item"]:has-text("Updated E2E Task") [data-test="delete-button"]')
    await page.click('[data-test="confirm-delete"]')
    
    // Verify deletion
    await expect(page.locator('[data-test="task-item"]:has-text("Updated E2E Task")')).not.toBeVisible()
  })
  
  test('should handle real-time updates', async ({ page, context }) => {
    // Open two pages for real-time testing
    const page1 = page
    const page2 = await context.newPage()
    
    await page1.goto('/jobs/test-job/tasks')
    await page2.goto('/jobs/test-job/tasks')
    
    // Create task in page 1
    await page1.click('[data-test="new-task-button"]')
    await page1.fill('[data-test="task-title"]', 'Real-time Test')
    await page1.click('[data-test="save-task"]')
    
    // Verify it appears in page 2 automatically
    await expect(page2.locator('[data-test="task-item"]')).toContainText('Real-time Test')
    
    await page2.close()
  })
})
```

---

## Code Organization

### 1. File Structure

**Organize code by feature and responsibility:**

```
src/lib/
├── models/
│   ├── index.ts                 # Main exports
│   ├── base/
│   │   ├── active-record.ts     # ActiveRecord base class
│   │   └── types.ts            # Shared types
│   ├── task/
│   │   ├── task.ts             # Task ActiveRecord
│   │   ├── reactive-task.ts    # Task ReactiveRecord
│   │   ├── task-types.ts       # Task-specific types
│   │   └── task-validation.ts  # Task validation logic
│   └── job/
│       ├── job.ts
│       ├── reactive-job.ts
│       └── job-types.ts
├── components/
│   ├── tasks/
│   │   ├── TaskCard.svelte
│   │   ├── TaskList.svelte
│   │   ├── TaskForm.svelte
│   │   └── TaskDashboard.svelte
│   └── shared/
│       ├── LoadingSpinner.svelte
│       └── ErrorMessage.svelte
├── services/
│   ├── task-service.ts         # Business logic
│   └── analytics-service.ts
└── utils/
    ├── validation.ts
    └── formatters.ts
```

### 2. Import Conventions

**Use consistent import patterns:**

```typescript
// ✅ Good: Consistent import organization

// External libraries first
import { onMount, onDestroy } from 'svelte'
import { goto } from '$app/navigation'

// Internal libraries
import { ReactiveTask, Task } from '$lib/models'
import type { TaskData, CreateTaskData } from '$lib/models'

// Services and utilities
import { TaskService } from '$lib/services/task-service'
import { formatDate, validateEmail } from '$lib/utils'

// Components (relative imports for same directory)
import TaskCard from './TaskCard.svelte'
import ErrorMessage from '../shared/ErrorMessage.svelte'

// ❌ Bad: Inconsistent, unclear imports
import TaskCard from './TaskCard.svelte'
import { onMount } from 'svelte'
import type { TaskData } from '$lib/models'
import { ReactiveTask } from '$lib/models'
import { TaskService } from '$lib/services/task-service'
```

### 3. Naming Conventions

**Follow consistent naming patterns:**

```typescript
// ✅ Good: Clear, consistent naming

// Types: PascalCase with descriptive suffixes
interface TaskData extends BaseRecord { }
interface CreateTaskData { }
interface TaskQueryOptions { }
type TaskStatus = 'pending' | 'active' | 'complete'

// Constants: SCREAMING_SNAKE_CASE
const MAX_TASK_TITLE_LENGTH = 100
const DEFAULT_TASK_PRIORITY = 2
const TASK_STATUSES = {
  PENDING: 0,
  ACTIVE: 1,
  COMPLETE: 2
} as const

// Functions: camelCase with action verbs
function validateTaskData(data: CreateTaskData): ValidationResult
function formatTaskPriority(priority: number): string
async function createTaskWithValidation(data: CreateTaskData): Promise<TaskData>

// Components: PascalCase with domain prefix
// TaskCard.svelte, TaskList.svelte, TaskDashboard.svelte

// Reactive variables: descriptive, avoid abbreviations
$: activeTasks = tasksQuery.data
$: isLoadingTasks = tasksQuery.isLoading
$: taskCount = activeTasks.length

// Event handlers: handle + action
function handleTaskClick(task: TaskData) { }
function handleDeleteTask(taskId: string) { }
function handleFormSubmit() { }

// ❌ Bad: Unclear, inconsistent naming
interface Task { } // Too generic
interface tData { } // Bad casing
const max_len = 100 // Inconsistent style
function doStuff() { } // Unclear purpose
$: t = tasksQuery.data // Unclear abbreviation
```

---

## Security Considerations

### 1. Input Sanitization

**Always sanitize user input:**

```typescript
// ✅ Good: Input sanitization
import DOMPurify from 'dompurify'

function sanitizeTaskInput(data: CreateTaskData): CreateTaskData {
  return {
    ...data,
    title: DOMPurify.sanitize(data.title.trim()),
    description: data.description ? DOMPurify.sanitize(data.description.trim()) : undefined
  }
}

// ✅ Good: Validation with sanitization
export const TaskValidation = {
  validateAndSanitize(data: CreateTaskData): ValidationResult<CreateTaskData> {
    // Sanitize first
    const sanitized = sanitizeTaskInput(data)
    
    // Then validate
    const errors: ValidationErrors = {}
    
    if (!sanitized.title || sanitized.title.length < 3) {
      errors.title = ['Title must be at least 3 characters']
    }
    
    if (sanitized.title.length > 100) {
      errors.title = ['Title must be less than 100 characters']
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data: sanitized
    }
  }
}
```

### 2. Permission Checks

**Implement proper authorization:**

```typescript
// ✅ Good: Permission-aware operations
class SecureTaskService {
  static async canUserEditTask(userId: string, taskId: string): Promise<boolean> {
    const task = await Task.find(taskId)
    
    // Check if user owns the task or has admin permissions
    return task.assigned_to_id === userId || 
           await this.hasAdminPermission(userId)
  }
  
  static async updateTaskSecure(
    userId: string, 
    taskId: string, 
    data: UpdateTaskData
  ): Promise<TaskData> {
    // Permission check first
    if (!await this.canUserEditTask(userId, taskId)) {
      throw new Error('Insufficient permissions to edit this task')
    }
    
    // Validate and sanitize input
    const validation = TaskValidation.validateAndSanitize(data)
    if (!validation.isValid) {
      throw new RecordInvalidError('Validation failed', data, validation.errors)
    }
    
    // Perform update
    return await Task.update(taskId, validation.data)
  }
}

// ✅ Good: Component-level permission checks
<script>
  import { ReactiveTask } from '$lib/models'
  import { currentUser } from '$lib/stores/auth'
  
  export let taskId: string
  
  const taskQuery = ReactiveTask.find(taskId)
  
  $: task = taskQuery.data
  $: canEdit = task && (
    task.assigned_to_id === $currentUser.id || 
    $currentUser.role === 'admin'
  )
</script>

{#if task}
  <div class="task-card">
    <h3>{task.title}</h3>
    <p>{task.description}</p>
    
    {#if canEdit}
      <div class="actions">
        <button on:click={handleEdit}>Edit</button>
        <button on:click={handleDelete}>Delete</button>
      </div>
    {/if}
  </div>
{/if}
```

### 3. Data Exposure Prevention

**Limit data exposure in components:**

```typescript
// ✅ Good: Only expose necessary data
interface PublicTaskData {
  id: string
  title: string
  description?: string
  status: number
  priority: number
  due_date?: number
  created_at: number
}

function filterSensitiveTaskData(task: TaskData): PublicTaskData {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    created_at: task.created_at
    // Exclude: assigned_to_id, lock_version, internal fields
  }
}

// ✅ Good: Component with filtered data
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  export let userRole: 'viewer' | 'editor' | 'admin' = 'viewer'
  
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  // Filter data based on user role
  $: allTasks = tasksQuery.data
  $: visibleTasks = allTasks.map(task => {
    if (userRole === 'admin') {
      return task // Full access
    } else {
      return filterSensitiveTaskData(task) // Limited access
    }
  })
</script>
```

---

**Following these best practices ensures Epic-008 implementations are performant, maintainable, secure, and consistent across your team. 🚀**