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
 * Generated: 2025-07-24 20:52:41 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { TaskData, CreateTaskData, UpdateTaskData } from './types/task-data';
import { registerModelRelationships } from './base/scoped-query-base';
import type { PositionUpdateBatch } from '../utils/client-acts-as-list';
import { getDatabaseTimestamp } from '../shared/utils/utc-timestamp';

/**
 * ActiveRecord configuration for Task
 */
const TaskConfig = {
  tableName: 'tasks',
  className: 'Task',
  primaryKey: 'id',
  supportsDiscard: true
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

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('tasks', {
  job: { type: 'belongsTo', model: 'Job' },
  assignedTo: { type: 'belongsTo', model: 'User' },
  parent: { type: 'belongsTo', model: 'Task' },
  repositionedAfter: { type: 'belongsTo', model: 'Task' },
  notes: { type: 'hasMany', model: 'Note' },
  activityLogs: { type: 'hasMany', model: 'ActivityLog' },
  subtasks: { type: 'hasMany', model: 'Task' },
  client: { type: 'hasOne', model: 'Client' },
  nextRepositionedTask: { type: 'hasOne', model: 'Task' }
});

/**
 * Batch update task positions using Zero's native mutateBatch API
 * Optimized for drag-and-drop operations to prevent FLIP animation race conditions
 * 
 * @param positionUpdates Array of position updates with task positioning metadata
 * @returns Promise<void> - Updates complete atomically or all fail
 * 
 * @example
 * ```typescript
 * const updates = [
 *   { taskId: 'task1', position: 1.5, reason: 'Moved to position 1.5' },
 *   { taskId: 'task2', position: 2.5, reason: 'Shifted to position 2.5' }
 * ];
 * await Task.updatePositions(updates);
 * ```
 */
Task.updatePositions = async (positionUpdates: PositionUpdateBatch[]): Promise<void> => {
  if (positionUpdates.length === 0) {
    return;
  }

  // Convert position updates to batch update format
  const reorderedAt = getDatabaseTimestamp(); // Single timestamp for all related position updates
  
  const batchUpdates = positionUpdates.map(update => ({
    id: update.taskId,
    data: {
      position: update.position,
      reordered_at: reorderedAt,
      // Include optional fields if they exist
      ...(update.parent_id !== undefined && { parent_id: update.parent_id }),
      ...(update.repositioned_after_id !== undefined && { repositioned_after_id: update.repositioned_after_id }),
      ...(update.position_finalized !== undefined && { position_finalized: update.position_finalized }),
      ...(update.repositioned_to_top !== undefined && { repositioned_to_top: update.repositioned_to_top })
    } as UpdateTaskData
  }));

  try {
    console.log('[Task.updatePositions] Starting batch position update:', {
      count: positionUpdates.length,
      tasks: positionUpdates.map(u => `${u.taskId.substring(0, 8)} → ${u.position}`).join(', ')
    });

    // Use the ActiveRecord batch update method which uses Zero's mutateBatch internally
    await Task.updateBatch(batchUpdates);

    console.log('[Task.updatePositions] Batch position update completed successfully');
  } catch (error) {
    console.error('[Task.updatePositions] Batch position update failed:', error);
    throw error;
  }
};


// Export types for convenience
export type { TaskData, CreateTaskData, UpdateTaskData };

// Default export
export default Task;
