/**
 * ReactiveTask - Epic-008 Reactive Queries for Tasks
 * 
 * Reactive Rails-compatible model using ReactiveQuery for Svelte 5.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use Task instead:
 * ```typescript
 * import { Task } from './task';
 * ```
 * 
 * Epic-008: Simplified to use ReactiveQuery with Zero.js
 */

import { ReactiveQuery, ReactiveQueryOne } from '../zero/reactive-query.svelte';
import { getZero } from '../zero/zero-client';
import {
  Task,
  type Task as TaskData,
  type CreateTaskData,
  type UpdateTaskData,
  createTask,
  updateTask,
  discardTask,
  undiscardTask,
  TaskInstance
} from '../zero/task.generated';

/**
 * ReactiveTask - Reactive model for tasks using Zero.js
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
 *   // Access reactive data with Svelte 5 runes
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
 */
export const ReactiveTask = {
  /**
   * Find a single task by ID - reactive
   * @param id - The UUID of the task
   * @returns ReactiveQueryOne with the task data
   */
  find(id: string) {
    return new ReactiveQueryOne<TaskData>(
      () => {
        const zero = getZero();
        return zero?.query.tasks.where('id', id).one();
      },
      null,
      '5m' // 5 minute TTL
    );
  },

  /**
   * Get all tasks (includes discarded) - reactive
   * @returns ReactiveQuery with array of tasks
   */
  all() {
    return new ReactiveQuery<TaskData>(
      () => {
        const zero = getZero();
        return zero?.query.tasks.orderBy('created_at', 'desc');
      },
      [],
      '5m'
    );
  },

  /**
   * Find tasks matching conditions - reactive
   * @param conditions - Object with field/value pairs to match
   * @returns ReactiveQuery with array of matching tasks
   */
  where(conditions: Partial<TaskData>) {
    return new ReactiveQuery<TaskData>(
      () => {
        const zero = getZero();
        if (!zero) return null;
        
        let query = zero.query.tasks;
        
        Object.entries(conditions).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.where(key as any, value);
          }
        });
        
        return query.orderBy('created_at', 'desc');
      },
      [],
      '5m'
    );
  },

  /**
   * Get only kept (non-discarded) tasks - reactive
   * @returns ReactiveQuery with array of kept tasks
   */
  kept() {
    return new ReactiveQuery<TaskData>(
      () => {
        const zero = getZero();
        return zero?.query.tasks.where('discarded_at', 'IS', null).orderBy('created_at', 'desc');
      },
      [],
      '5m'
    );
  },

  /**
   * Get only discarded tasks - reactive
   * @returns ReactiveQuery with array of discarded tasks
   */
  discarded() {
    return new ReactiveQuery<TaskData>(
      () => {
        const zero = getZero();
        return zero?.query.tasks.where('discarded_at', 'IS NOT', null).orderBy('created_at', 'desc');
      },
      [],
      '5m'
    );
  },

  // Mutation methods (same as Task but for convenience)
  create: createTask,
  update: updateTask,
  discard: discardTask,
  undiscard: undiscardTask
};

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
