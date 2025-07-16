/**
 * ReactiveTaskCompletion - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for task_completions table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use TaskCompletion instead:
 * ```typescript
 * import { TaskCompletion } from './task-completion';
 * ```
 * 
 * Generated: 2025-07-16 12:57:13 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { TaskCompletionData, CreateTaskCompletionData, UpdateTaskCompletionData } from './types/task-completion-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for TaskCompletion
 */
const ReactiveTaskCompletionConfig = {
  tableName: 'task_completions',
  className: 'ReactiveTaskCompletion',
  primaryKey: 'id',
  supportsDiscard: false
};

/**
 * ReactiveTaskCompletion ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveTaskCompletion } from '$lib/models/reactive-task-completion';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const task_completionQuery = ReactiveTaskCompletion.find('123');
 *   
 *   // Access reactive data
 *   $: task_completion = task_completionQuery.data;
 *   $: isLoading = task_completionQuery.isLoading;
 *   $: error = task_completionQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if task_completion}
 *   <p>{task_completion.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newTaskCompletion = await ReactiveTaskCompletion.create({ title: 'New Task' });
 * await ReactiveTaskCompletion.update('123', { title: 'Updated' });
 * await ReactiveTaskCompletion.discard('123');
 * 
 * // Reactive queries
 * const allTaskCompletionsQuery = ReactiveTaskCompletion.all().all();
 * const activeTaskCompletionsQuery = ReactiveTaskCompletion.kept().all();
 * ```
 */
export const ReactiveTaskCompletion = createReactiveRecord<TaskCompletionData>(ReactiveTaskCompletionConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveTaskCompletion as TaskCompletion } from './reactive-task-completion';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const task_completionQuery = TaskCompletion.find('123');
 * ```
 */
export { ReactiveTaskCompletion as TaskCompletion };

// Export types for convenience
export type { TaskCompletionData, CreateTaskCompletionData, UpdateTaskCompletionData };

// Default export
export default ReactiveTaskCompletion;
