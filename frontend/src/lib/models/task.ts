/**
 * Task - ActiveRecord model (Epic-008 migration)
 * 
 * Rails-like model for tasks using Zero.js for offline sync.
 * This is now a re-export from the generated zero model.
 * 
 * For reactive Svelte components, use ReactiveTask instead:
 * ```typescript
 * import { ReactiveTask as Task } from './reactive-task';
 * ```
 * 
 * Epic-008: Simplified to use direct Zero.js generated models
 */

// Re-export everything from the zero-generated model
export {
  Task,
  type Task as TaskData,
  type CreateTaskData,
  type UpdateTaskData,
  TaskInstance,
  createTaskInstance,
  createTask,
  updateTask,
  discardTask,
  undiscardTask,
  upsertTask,
  moveBeforeTask,
  moveAfterTask,
  moveToTopTask,
  moveToBottomTask
} from '../zero/task.generated';

// Default export
export { Task as default } from '../zero/task.generated';
