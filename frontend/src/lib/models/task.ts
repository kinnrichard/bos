/**
 * Task - ActiveRecord model (non-reactive)
 * 
 * Promise-based Rails-compatible model for tasks table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 * 
 * For reactive Svelte components, use ReactiveTask instead:
 * ```typescript
 * import { ReactiveTask as Task } from './reactive-task';
 * ```
 * 
 * Generated: 2025-07-14 20:18:46 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { TaskData, CreateTaskData, UpdateTaskData } from './types/task-data';

/**
 * ActiveRecord configuration for Task
 */
const TaskConfig = {
  tableName: 'tasks',
  className: 'Task',
  primaryKey: 'id'
};

/**
 * Task ActiveRecord instance
 * 
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const task = await Task.find('123');
 * 
 * // Find by conditions (returns null if not found)
 * const task = await Task.findBy({ title: 'Test' });
 * 
 * // Create new record
 * const newTask = await Task.create({ title: 'New Task' });
 * 
 * // Update existing record
 * const updatedTask = await Task.update('123', { title: 'Updated' });
 * 
 * // Soft delete (discard gem)
 * await Task.discard('123');
 * 
 * // Restore discarded
 * await Task.undiscard('123');
 * 
 * // Query with scopes
 * const allTasks = await Task.all().all();
 * const activeTasks = await Task.kept().all();
 * const discardedTasks = await Task.discarded().all();
 * ```
 */
export const Task = createActiveRecord<TaskData>(TaskConfig);

// Export types for convenience
export type { TaskData, CreateTaskData, UpdateTaskData };

// Default export
export default Task;
