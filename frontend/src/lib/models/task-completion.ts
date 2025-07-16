/**
 * TaskCompletion - ActiveRecord model (non-reactive)
 * 
 * Promise-based Rails-compatible model for task_completions table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 * 
 * For reactive Svelte components, use ReactiveTaskCompletion instead:
 * ```typescript
 * import { ReactiveTaskCompletion as TaskCompletion } from './reactive-task-completion';
 * ```
 * 
 * Generated: 2025-07-16 00:44:52 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { TaskCompletionData, CreateTaskCompletionData, UpdateTaskCompletionData } from './types/task-completion-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ActiveRecord configuration for TaskCompletion
 */
const TaskCompletionConfig = {
  tableName: 'task_completions',
  className: 'TaskCompletion',
  primaryKey: 'id',
  supportsDiscard: false
};

/**
 * TaskCompletion ActiveRecord instance
 * 
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const task_completion = await TaskCompletion.find('123');
 * 
 * // Find by conditions (returns null if not found)
 * const task_completion = await TaskCompletion.findBy({ title: 'Test' });
 * 
 * // Create new record
 * const newTaskCompletion = await TaskCompletion.create({ title: 'New Task' });
 * 
 * // Update existing record
 * const updatedTaskCompletion = await TaskCompletion.update('123', { title: 'Updated' });
 * 
 * // Soft delete (discard gem)
 * await TaskCompletion.discard('123');
 * 
 * // Restore discarded
 * await TaskCompletion.undiscard('123');
 * 
 * // Query with scopes
 * const allTaskCompletions = await TaskCompletion.all().all();
 * const activeTaskCompletions = await TaskCompletion.kept().all();
 * ```
 */
export const TaskCompletion = createActiveRecord<TaskCompletionData>(TaskCompletionConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type { TaskCompletionData, CreateTaskCompletionData, UpdateTaskCompletionData };

// Default export
export default TaskCompletion;
