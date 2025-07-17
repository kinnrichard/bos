# Epic-008 Developer Onboarding Guide
*Rails-Like ActiveRecord/ReactiveRecord Architecture*

**Version**: 1.0  
**Generated**: 2025-07-13  
**Epic**: Epic-008 - ActiveRecord Implementation  

---

## 🚀 Quick Start for Rails Developers

If you're coming from Rails, you'll feel right at home with Epic-008. We've implemented a Rails-compatible ActiveRecord pattern that works seamlessly with Zero.js and Svelte 5.

### Instant Familiarity

**Rails (Ruby)**
```ruby
# Find tasks
Task.find(123)
Task.where(status: 'active').limit(10)
Task.all.order(:created_at)

# CRUD operations
task = Task.create(title: 'New task')
task.update(title: 'Updated')
task.destroy
```

**Epic-008 (TypeScript)**
```typescript
// Find tasks (Promise-based ActiveRecord)
await Task.find('123')
await Task.where({ status: 'active' }).limit(10).all()
await Task.all().orderBy('created_at').all()

// CRUD operations
const task = await Task.create({ title: 'New task' })
await task.update('123', { title: 'Updated' })
await task.destroy('123')
```

**Epic-008 Reactive (Svelte 5)**
```typescript
// Reactive queries for Svelte components
const taskQuery = ReactiveTask.find('123')  // Automatically updates UI
const tasksQuery = ReactiveTask.where({ status: 'active' })

// Use in templates: {#each tasksQuery.data as task}
```

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [ActiveRecord vs ReactiveRecord](#activerecord-vs-reactiverecord)
4. [Rails Comparison Guide](#rails-comparison-guide)
5. [Zero.js Integration](#zerojs-integration)
6. [Svelte 5 Reactive Patterns](#svelte-5-reactive-patterns)
7. [Common Usage Patterns](#common-usage-patterns)
8. [Migration from Old Patterns](#migration-from-old-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Epic-008 provides two complementary model architectures:

### 🔄 ActiveRecord (Non-Reactive)
- **Promise-based** CRUD operations
- **Rails-compatible** API with find(), where(), create(), etc.
- **Perfect for**: Server-side code, utilities, tests, non-UI logic
- **Zero.js integration** with centralized error handling

### ⚡ ReactiveRecord (Reactive)
- **Svelte 5 reactive** queries using $state runes
- **Automatic UI updates** when data changes
- **Perfect for**: Svelte components, real-time dashboards
- **Same Rails-like API** but returns reactive queries

### 🏗️ Foundation Classes

```
ActiveRecord<T>           ReactiveRecord<T>
     ↓                         ↓
  Task Model            ReactiveTask Model
     ↓                         ↓
Zero.js Generated      Zero.js Generated
   Models                   Models
     ↓                         ↓
    Database              Database
```

---

## Getting Started

### 1. Import the Models

```typescript
// For non-reactive contexts (utilities, tests, server-side)
import { Task, ActiveModels } from '$lib/models'

// For Svelte components (reactive)
import { ReactiveTask, ReactiveModels } from '$lib/models'

// Type definitions
import type { TaskData, CreateTaskData, UpdateTaskData } from '$lib/models'
```

### 2. Basic Operations

**Create a task:**
```typescript
// ActiveRecord (Promise-based)
const task = await Task.create({
  title: 'Complete Epic-008 documentation',
  description: 'Write comprehensive onboarding guide',
  status: 1,
  priority: 2,
  applies_to_all_targets: false,
  lock_version: 1
})

// ReactiveRecord (for Svelte)
const createTask = async (data: CreateTaskData) => {
  return await ReactiveTask.create(data)
  // UI will automatically update via reactive queries
}
```

**Find tasks:**
```typescript
// ActiveRecord
const task = await Task.find('task-uuid-123')
const tasks = await Task.where({ status: 1 }).all()

// ReactiveRecord (returns reactive queries)
const taskQuery = ReactiveTask.find('task-uuid-123')
const tasksQuery = ReactiveTask.where({ status: 1 })

// In Svelte template:
// $: task = taskQuery.data
// $: tasks = tasksQuery.data
```

**Update and delete:**
```typescript
// ActiveRecord
await Task.update('task-uuid-123', { title: 'Updated title' })
await Task.destroy('task-uuid-123')  // Hard delete
await Task.discard('task-uuid-123')  // Soft delete (Rails discard gem)

// ReactiveRecord (same methods available)
await ReactiveTask.update('task-uuid-123', { title: 'Updated title' })
```

### 3. Rails-Style Query Chaining

```typescript
// Complex queries with method chaining
const activeTasks = await Task
  .where({ status: 1 })
  .where({ job_id: 'job-123' })
  .orderBy('priority', 'desc')
  .orderBy('created_at', 'asc')
  .limit(50)
  .all()

// Scoped queries
const keptTasks = await Task.kept().all()           // Non-discarded only
const discardedTasks = await Task.discarded().all() // Discarded only
const allTasks = await Task.withDiscarded().all()   // Include discarded
```

---

## ActiveRecord vs ReactiveRecord

### When to Use ActiveRecord

✅ **Perfect for:**
- Server-side operations
- Utility functions
- Test code
- API endpoints
- Non-UI business logic
- Batch processing

**Example:**
```typescript
// utils/task-processor.ts
import { Task } from '$lib/models'

export async function processOverdueTasks() {
  const overdueTasks = await Task
    .where({ status: 1 })
    .where('due_date', '<', Date.now())
    .all()
  
  for (const task of overdueTasks) {
    await Task.update(task.id, { status: 3 }) // Mark as overdue
  }
}
```

### When to Use ReactiveRecord

✅ **Perfect for:**
- Svelte components
- Real-time dashboards
- Live data displays
- User interfaces
- Reactive forms

**Example:**
```svelte
<!-- TaskList.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // Reactive query - automatically updates when data changes
  const tasksQuery = ReactiveTask.where({ job_id: jobId, status: 1 })
  
  // Reactive state using Svelte 5 runes
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
  $: error = tasksQuery.error
</script>

{#if isLoading}
  <div class="loading">Loading tasks...</div>
{:else if error}
  <div class="error">Error: {error.message}</div>
{:else}
  <div class="task-list">
    {#each tasks as task}
      <div class="task-card">
        <h3>{task.title}</h3>
        <p>{task.description}</p>
      </div>
    {/each}
  </div>
{/if}
```

---

## Rails Comparison Guide

### Model Structure

| Rails Pattern | Epic-008 Pattern | Notes |
|---------------|------------------|-------|
| `class Task < ApplicationRecord` | `export const Task = new ActiveRecord<TaskData>({...})` | Class-based vs instance-based |
| `Task.find(id)` | `await Task.find(id)` | Same API, async/await |
| `Task.where(status: 1)` | `Task.where({ status: 1 })` | Object syntax instead of hash |
| `Task.create(attrs)` | `await Task.create(attrs)` | Promise-based |
| `task.update(attrs)` | `await Task.update(id, attrs)` | Static method with ID |
| `task.destroy` | `await Task.destroy(id)` | Static method with ID |

### Query Methods

| Rails | Epic-008 | Example |
|-------|----------|---------|
| `.all` | `.all()` | `Task.all()` |
| `.where(conditions)` | `.where(conditions)` | `Task.where({ status: 1 })` |
| `.find(id)` | `.find(id)` | `Task.find('uuid')` |
| `.find_by(conditions)` | `.findBy(conditions)` | `Task.findBy({ title: 'test' })` |
| `.order(:field)` | `.orderBy('field')` | `Task.orderBy('created_at')` |
| `.limit(n)` | `.limit(n)` | `Task.limit(10)` |
| `.offset(n)` | `.offset(n)` | `Task.offset(20)` |
| `.count` | `.count()` | `Task.where({...}).count()` |
| `.exists?` | `.exists()` | `Task.where({...}).exists()` |
| `.first` | `.first()` | `Task.orderBy('created_at').first()` |
| `.last` | `.last()` | `Task.orderBy('created_at').last()` |

### Discard Gem Support

| Rails (Discard Gem) | Epic-008 | Notes |
|---------------------|----------|-------|
| `Task.kept` | `Task.kept()` | Non-discarded records |
| `Task.discarded` | `Task.discarded()` | Discarded records only |
| `Task.with_discarded` | `Task.withDiscarded()` | Include discarded |
| `task.discard` | `await Task.discard(id)` | Soft delete |
| `task.undiscard` | `await Task.undiscard(id)` | Restore |
| `task.discarded?` | `task.discarded_at !== null` | Check if discarded |

### Error Handling

| Rails | Epic-008 | Notes |
|-------|----------|-------|
| `ActiveRecord::RecordNotFound` | `RecordNotFoundError` | Same exception type |
| `ActiveRecord::RecordInvalid` | `RecordInvalidError` | Validation errors |
| `begin/rescue` | `try/catch` | JavaScript error handling |

---

## Zero.js Integration

Epic-008 provides a seamless integration layer with Zero.js that eliminates boilerplate while maintaining full compatibility:

### Traditional Zero.js Pattern

```typescript
// Old verbose pattern
async function getTasks() {
  const zero = getZero()
  if (!zero) {
    throw new Error('Zero client not initialized')
  }
  
  try {
    const result = await zero.query.tasks
      .where('discarded_at', 'IS', null)
      .where('status', 1)
      .orderBy('created_at', 'desc')
      .run()
    return result || []
  } catch (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`)
  }
}
```

### Epic-008 Pattern

```typescript
// New simplified pattern
async function getTasks() {
  return await Task
    .where({ status: 1 })
    .kept()
    .orderBy('created_at', 'desc')
    .all()
}
```

### Under the Hood

Epic-008 automatically handles:
- ✅ Zero client initialization and error checking
- ✅ Connection state management and retries
- ✅ Type-safe query building
- ✅ Proper error messages and stack traces
- ✅ UUID validation and generation
- ✅ Timestamp management (created_at, updated_at)
- ✅ Discard gem integration (discarded_at handling)

---

## Svelte 5 Reactive Patterns

### Basic Reactive Queries

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  // Single task query
  const taskQuery = ReactiveTask.find('task-123')
  
  // Collection query
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  // Reactive state with Svelte 5 runes
  $: task = taskQuery.data
  $: tasks = tasksQuery.data
  $: isLoading = taskQuery.isLoading || tasksQuery.isLoading
  $: error = taskQuery.error || tasksQuery.error
</script>

<!-- Reactive template -->
{#if isLoading}
  Loading...
{:else if error}
  Error: {error.message}
{:else if task}
  <h1>{task.title}</h1>
  <p>{task.description}</p>
  
  <h2>Related Tasks</h2>
  {#each tasks as relatedTask}
    <div>{relatedTask.title}</div>
  {/each}
{/if}
```

### Real-Time Updates

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  // Reactive query automatically updates when:
  // - New tasks are created
  // - Existing tasks are updated
  // - Tasks are deleted/discarded
  const jobTasksQuery = ReactiveTask.where({ 
    job_id: jobId,
    status: 1 
  })
  
  $: jobTasks = jobTasksQuery.data
  $: taskCount = jobTasks.length
  
  // Create new task (UI will automatically update)
  async function createTask() {
    await ReactiveTask.create({
      title: 'New task',
      job_id: jobId,
      status: 1,
      priority: 2,
      applies_to_all_targets: false,
      lock_version: 1
    })
    // No need to manually refresh - reactive query updates automatically
  }
</script>

<div class="job-dashboard">
  <h2>Job Tasks ({taskCount})</h2>
  
  <button on:click={createTask}>Add Task</button>
  
  {#each jobTasks as task}
    <div class="task-card">
      <h3>{task.title}</h3>
      <span class="priority">Priority: {task.priority}</span>
    </div>
  {/each}
</div>
```

### Query Options and Caching

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  // Advanced reactive query with options
  const expensiveQuery = ReactiveTask.where({ 
    status: 1 
  }).orderBy('created_at', 'desc')
  
  // Manual control over reactivity
  let autoRefresh = true
  
  $: {
    if (autoRefresh) {
      expensiveQuery.enable()   // Start listening for changes
    } else {
      expensiveQuery.disable()  // Stop listening but keep data
    }
  }
  
  function refreshData() {
    expensiveQuery.refresh()  // Force immediate refresh
  }
  
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh
  }
</script>

<div class="controls">
  <button on:click={refreshData}>Refresh Now</button>
  <button on:click={toggleAutoRefresh}>
    {autoRefresh ? 'Disable' : 'Enable'} Auto-refresh
  </button>
</div>

{#each expensiveQuery.data as task}
  <div>{task.title}</div>
{/each}
```

---

## Common Usage Patterns

### 1. Dashboard with Multiple Queries

```svelte
<!-- Dashboard.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  // Multiple reactive queries
  const activeTasks = ReactiveTask.where({ status: 1 })
  const completedTasks = ReactiveTask.where({ status: 2 })
  const overdueQuery = ReactiveTask.where({ status: 1 })
    .where('due_date', '<', Date.now())
  
  $: active = activeTasks.data
  $: completed = completedTasks.data
  $: overdue = overdueQuery.data
</script>

<div class="dashboard">
  <div class="stat-card">
    <h3>Active Tasks</h3>
    <span class="count">{active.length}</span>
  </div>
  
  <div class="stat-card">
    <h3>Completed</h3>
    <span class="count">{completed.length}</span>
  </div>
  
  <div class="stat-card urgent">
    <h3>Overdue</h3>
    <span class="count">{overdue.length}</span>
  </div>
</div>
```

### 2. Form with Optimistic Updates

```svelte
<!-- TaskForm.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let taskId: string | null = null
  
  // Load existing task if editing
  const taskQuery = taskId ? ReactiveTask.find(taskId) : null
  
  $: existingTask = taskQuery?.data
  
  let title = ''
  let description = ''
  
  // Populate form when task loads
  $: if (existingTask) {
    title = existingTask.title
    description = existingTask.description
  }
  
  async function saveTask() {
    if (taskId) {
      // Update existing task
      await ReactiveTask.update(taskId, { title, description })
    } else {
      // Create new task
      const newTask = await ReactiveTask.create({
        title,
        description,
        status: 1,
        priority: 2,
        applies_to_all_targets: false,
        lock_version: 1
      })
      // Redirect to edit mode
      taskId = newTask.id
    }
  }
</script>

<form on:submit|preventDefault={saveTask}>
  <input bind:value={title} placeholder="Task title" required />
  <textarea bind:value={description} placeholder="Description"></textarea>
  <button type="submit">
    {taskId ? 'Update' : 'Create'} Task
  </button>
</form>
```

### 3. Master-Detail View

```svelte
<!-- TaskMasterDetail.svelte -->
<script>
  import { ReactiveTask } from '$lib/models'
  
  export let jobId: string
  
  let selectedTaskId: string | null = null
  
  // Master list
  const tasksQuery = ReactiveTask.where({ job_id: jobId })
  
  // Detail view
  $: detailQuery = selectedTaskId ? ReactiveTask.find(selectedTaskId) : null
  $: selectedTask = detailQuery?.data
  
  $: tasks = tasksQuery.data
</script>

<div class="master-detail">
  <div class="master">
    <h2>Tasks</h2>
    {#each tasks as task}
      <div 
        class="task-item" 
        class:selected={task.id === selectedTaskId}
        on:click={() => selectedTaskId = task.id}
      >
        {task.title}
      </div>
    {/each}
  </div>
  
  <div class="detail">
    {#if selectedTask}
      <h2>{selectedTask.title}</h2>
      <p>{selectedTask.description}</p>
      <p>Status: {selectedTask.status}</p>
      <p>Priority: {selectedTask.priority}</p>
    {:else}
      <p>Select a task to view details</p>
    {/if}
  </div>
</div>
```

### 4. Batch Operations

```typescript
// utils/batch-operations.ts
import { Task } from '$lib/models'

export async function bulkUpdateTaskStatus(taskIds: string[], status: number) {
  // Using ActiveRecord for batch operations
  const results = await Promise.all(
    taskIds.map(id => Task.update(id, { status }))
  )
  return results
}

export async function bulkDiscardTasks(taskIds: string[]) {
  const results = await Promise.all(
    taskIds.map(id => Task.discard(id))
  )
  return results
}

export async function getTasksByPriority(priority: number) {
  return await Task
    .where({ priority })
    .kept()
    .orderBy('created_at', 'desc')
    .all()
}
```

---

## Migration from Old Patterns

### Step 1: Identify Current Patterns

**Old Pattern Examples:**
```typescript
// TaskService.ts (to be migrated)
import { getZero } from './zero-client'

export class TaskService {
  async getAllTasks() {
    const zero = getZero()
    if (!zero) return []
    
    try {
      const result = await zero.query.tasks.run()
      return result || []
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      return []
    }
  }
}

// TaskStore.ts (to be migrated)
import { writable } from 'svelte/store'

export const tasksStore = writable([])

export async function loadTasks() {
  const service = new TaskService()
  const tasks = await service.getAllTasks()
  tasksStore.set(tasks)
}
```

### Step 2: Migrate to Epic-008

**New Pattern:**
```typescript
// Remove TaskService.ts entirely

// Update components to use ReactiveTask directly
// TaskList.svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  // Replace store with reactive query
  const tasksQuery = ReactiveTask.all()
  
  $: tasks = tasksQuery.data
  $: isLoading = tasksQuery.isLoading
</script>

{#if isLoading}
  Loading...
{:else}
  {#each tasks as task}
    <div>{task.title}</div>
  {/each}
{/if}
```

### Step 3: Update Imports

**Find and replace across codebase:**
```bash
# Find old patterns
find src -name "*.ts" -o -name "*.svelte" | xargs grep -l "getZero\|TaskService"

# Replace with new imports
# Old: import { getZero } from './zero-client'
# New: import { Task, ReactiveTask } from '$lib/models'
```

### Step 4: Migrate API Calls

**Old API pattern:**
```typescript
async function createTask(data) {
  const zero = getZero()
  if (!zero) throw new Error('Zero not available')
  
  const id = crypto.randomUUID()
  await zero.mutate.tasks.insert({
    id,
    ...data,
    created_at: Date.now(),
    updated_at: Date.now()
  })
  return { id }
}
```

**New API pattern:**
```typescript
async function createTask(data: CreateTaskData) {
  return await Task.create(data)
  // Handles UUID generation, timestamps, error handling automatically
}
```

---

## Performance Optimization

### 1. Query Optimization

```typescript
// ❌ Inefficient: Multiple separate queries
const task1 = await Task.find('id1')
const task2 = await Task.find('id2')
const task3 = await Task.find('id3')

// ✅ Efficient: Single query with multiple conditions
const taskIds = ['id1', 'id2', 'id3']
const tasks = await Task.where('id', 'IN', taskIds).all()
```

### 2. Reactive Query Management

```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy } from 'svelte'
  
  // ✅ Proper cleanup
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  onDestroy(() => {
    tasksQuery.destroy() // Clean up reactive query
  })
  
  // ✅ Conditional queries
  let showCompleted = false
  
  $: activeQuery = ReactiveTask.where({ status: 1 })
  $: completedQuery = showCompleted ? ReactiveTask.where({ status: 2 }) : null
  
  // ✅ Pagination for large datasets
  let page = 1
  const pageSize = 20
  
  $: pagedQuery = ReactiveTask
    .where({ status: 1 })
    .orderBy('created_at', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize)
</script>
```

### 3. Caching Strategies

```typescript
// Reactive queries have built-in TTL caching
const expensiveQuery = ReactiveTask.where({ 
  complex_calculation: true 
})
// Automatically cached for 5 minutes (default TTL)

// For frequently accessed data, use longer TTL
// Configure in reactive-query.svelte.ts if needed
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Zero client not initialized"

**Problem:** Trying to use models before Zero.js is ready.

**Solution:**
```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { onMount } from 'svelte'
  
  let isReady = false
  
  onMount(() => {
    // Wait for Zero to initialize
    setTimeout(() => {
      isReady = true
    }, 100)
  })
  
  $: tasksQuery = isReady ? ReactiveTask.where({ status: 1 }) : null
</script>

{#if isReady && tasksQuery}
  {#each tasksQuery.data as task}
    <div>{task.title}</div>
  {/each}
{/if}
```

#### 2. TypeScript Errors

**Problem:** Type mismatches with model data.

**Solution:**
```typescript
import type { TaskData, CreateTaskData, UpdateTaskData } from '$lib/models'

// ✅ Use proper types
const createTask = async (data: CreateTaskData): Promise<TaskData> => {
  return await Task.create(data)
}

// ✅ Type guards for optional fields
const updateTask = async (id: string, data: Partial<UpdateTaskData>) => {
  // Validate required fields
  if (!data.lock_version) {
    throw new Error('lock_version is required')
  }
  return await Task.update(id, data)
}
```

#### 3. Reactive Queries Not Updating

**Problem:** UI not updating when data changes.

**Solution:**
```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  
  // ✅ Make sure query is in reactive context
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  // ✅ Use proper reactive statements
  $: tasks = tasksQuery.data
  $: count = tasks.length
  
  // ✅ Force refresh if needed
  function refreshTasks() {
    tasksQuery.refresh()
  }
</script>
```

#### 4. Memory Leaks

**Problem:** Reactive queries not being cleaned up.

**Solution:**
```svelte
<script>
  import { ReactiveTask } from '$lib/models'
  import { onDestroy } from 'svelte'
  
  const tasksQuery = ReactiveTask.where({ status: 1 })
  
  // ✅ Always clean up reactive queries
  onDestroy(() => {
    tasksQuery.destroy()
  })
</script>
```

#### 5. Query Performance Issues

**Problem:** Slow queries or too many API calls.

**Solution:**
```typescript
// ✅ Use appropriate indexes and filters
const efficientQuery = Task
  .where({ status: 1, job_id: jobId })  // Use indexed fields
  .kept()                               // Built-in discarded_at filter
  .orderBy('created_at', 'desc')        // Indexed ordering
  .limit(50)                            // Reasonable limit

// ✅ Batch operations instead of loops
const taskIds = ['id1', 'id2', 'id3']
const tasks = await Task.where('id', 'IN', taskIds).all()

// Instead of:
// const tasks = await Promise.all(taskIds.map(id => Task.find(id)))
```

### Debug Tools

```typescript
// Debug Zero connection
import { getZero } from '$lib/zero/zero-client'
console.log('Zero client:', getZero())

// Debug reactive query state
const tasksQuery = ReactiveTask.where({ status: 1 })
console.log('Query state:', {
  data: tasksQuery.data,
  isLoading: tasksQuery.isLoading,
  error: tasksQuery.error
})

// Debug SQL queries (if available)
const query = Task.where({ status: 1 }).orderBy('created_at')
// Check network tab for actual SQL/API calls
```

---

## Next Steps

1. **Read the API Reference** - Detailed documentation of all methods and options
2. **Check the Migration Guide** - Step-by-step migration from existing patterns  
3. **Review Best Practices** - Architecture patterns and performance optimization
4. **Explore Examples** - Real-world usage scenarios and code samples

### Additional Resources

- **Epic-008 Migration Report**: `/EPIC-008-MIGRATION-REPORT.md`
- **Zero.js Integration Guide**: `/src/lib/zero/README.md`
- **ReactiveRecord Examples**: `/src/lib/models/reactive-task.ts`
- **ActiveRecord Examples**: `/src/lib/models/base/active-record.ts`

---

**Welcome to Epic-008! You now have Rails-compatible ActiveRecord functionality with modern TypeScript and Svelte 5 reactivity. Happy coding! 🚀**