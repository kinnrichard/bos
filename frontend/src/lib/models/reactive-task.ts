/**
 * ReactiveTask - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for tasks table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use Task instead:
 * ```typescript
 * import { Task } from './task';
 * ```
 * 
 * Generated: 2025-07-15 00:18:01 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { TaskData, CreateTaskData, UpdateTaskData } from './types/task-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for Task
 */
const ReactiveTaskConfig = {
  tableName: 'tasks',
  className: 'ReactiveTask',
  primaryKey: 'id',
  supportsDiscard: true
};

/**
 * ReactiveTask ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveTask } from '$lib/models/reactive-task';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const taskQuery = ReactiveTask.find('123');
 *   
 *   // Access reactive data
 *   $: task = taskQuery.data;
 *   $: isLoading = taskQuery.isLoading;
 *   $: error = taskQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if task}
 *   <p>{task.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newTask = await ReactiveTask.create({ title: 'New Task' });
 * await ReactiveTask.update('123', { title: 'Updated' });
 * await ReactiveTask.discard('123');
 * 
 * // Reactive queries
 * const allTasksQuery = ReactiveTask.all().all();
 * const activeTasksQuery = ReactiveTask.kept().all();
 * const discardedTasks = await Task.discarded().all();
 * ```
 */
export const ReactiveTask = createReactiveRecord<TaskData>(ReactiveTaskConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('tasks', {
  job: { type: 'belongsTo', model: 'Job' },
  assignedTo: { type: 'belongsTo', model: 'User' },
  parent: { type: 'belongsTo', model: 'Task' },
  notes: { type: 'hasMany', model: 'Note' },
  activityLogs: { type: 'hasMany', model: 'ActivityLog' },
  subtasks: { type: 'hasMany', model: 'Task' }
});


/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveTask as Task } from './reactive-task';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const taskQuery = Task.find('123');
 * ```
 */
export { ReactiveTask as Task };

// Export types for convenience
export type { TaskData, CreateTaskData, UpdateTaskData };

// Default export
export default ReactiveTask;
