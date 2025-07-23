/**
 * Task model with permission guards
 * 
 * This is an enhanced version of the Task model that enforces permissions
 * at the model level, preventing unauthorized mutations.
 */

import { Task as BaseTask } from './task';
import type { TaskData, CreateTaskData, UpdateTaskData } from './types/task-data';
import { taskPermissions } from '../stores/taskPermissions.svelte';

/**
 * Permission-aware Task model
 * 
 * Wraps the base Task model with permission checks to prevent
 * unauthorized operations on tasks, especially deleted tasks.
 */
class TaskWithPermissions {
  /**
   * Create a new task with permission check
   */
  async create(data: CreateTaskData): Promise<TaskData> {
    // Check if task creation is allowed in current context
    if (!taskPermissions.hasPermission('create')) {
      const reason = taskPermissions.getPermissionDenialReason('create');
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.create(data);
  }

  /**
   * Update an existing task with permission check
   */
  async update(id: string, data: UpdateTaskData): Promise<TaskData> {
    // First, get the task to check its state
    const task = await BaseTask.find(id);
    
    // Check if task editing is allowed for this specific task
    if (!taskPermissions.hasPermission('edit', { task })) {
      const reason = taskPermissions.getPermissionDenialReason('edit', { task });
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.update(id, data);
  }

  /**
   * Delete (discard) a task with permission check
   */
  async discard(id: string): Promise<TaskData> {
    // First, get the task to check its state
    const task = await BaseTask.find(id);
    
    // Check if task deletion is allowed for this specific task
    if (!taskPermissions.hasPermission('delete', { task })) {
      const reason = taskPermissions.getPermissionDenialReason('delete', { task });
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.discard(id);
  }

  /**
   * Restore a discarded task
   * Note: This is always allowed as it's a recovery operation
   */
  async undiscard(id: string): Promise<TaskData> {
    return BaseTask.undiscard(id);
  }

  /**
   * Destroy a task permanently
   * This requires special permission and should rarely be used
   */
  async destroy(id: string): Promise<any> {
    // First, get the task to check its state
    const task = await BaseTask.find(id);
    
    // Check if permanent deletion is allowed
    if (!taskPermissions.hasPermission('delete', { task })) {
      const reason = taskPermissions.getPermissionDenialReason('delete', { task });
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.destroy(id);
  }

  /**
   * Move a task (update position) with permission check
   */
  async move(id: string, position: number): Promise<TaskData> {
    // First, get the task to check its state
    const task = await BaseTask.find(id);
    
    // Check if task moving is allowed
    if (!taskPermissions.hasPermission('move', { task })) {
      const reason = taskPermissions.getPermissionDenialReason('move', { task });
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.update(id, { position });
  }

  /**
   * Change task status with permission check
   */
  async changeStatus(id: string, status: string): Promise<TaskData> {
    // First, get the task to check its state
    const task = await BaseTask.find(id);
    
    // Check if status change is allowed
    if (!taskPermissions.hasPermission('changeStatus', { task })) {
      const reason = taskPermissions.getPermissionDenialReason('changeStatus', { task });
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.update(id, { status });
  }

  /**
   * Assign user to task with permission check
   */
  async assignUser(id: string, userId: string | null): Promise<TaskData> {
    // First, get the task to check its state
    const task = await BaseTask.find(id);
    
    // Check if user assignment is allowed
    if (!taskPermissions.hasPermission('assignUser', { task })) {
      const reason = taskPermissions.getPermissionDenialReason('assignUser', { task });
      throw new Error(`Permission denied: ${reason}`);
    }
    
    return BaseTask.update(id, { assigned_to_id: userId });
  }

  /**
   * All read operations are passed through without permission checks
   * as viewing is controlled by the filter system
   */
  
  // Query methods - no permission checks needed
  all = BaseTask.all.bind(BaseTask);
  where = BaseTask.where.bind(BaseTask);
  orderBy = BaseTask.orderBy.bind(BaseTask);
  limit = BaseTask.limit.bind(BaseTask);
  includes = BaseTask.includes.bind(BaseTask);
  kept = BaseTask.kept.bind(BaseTask);
  discarded = BaseTask.discarded.bind(BaseTask);
  withDiscarded = BaseTask.withDiscarded.bind(BaseTask);
  
  // Find methods - no permission checks needed
  find = BaseTask.find.bind(BaseTask);
  findBy = BaseTask.findBy.bind(BaseTask);
  first = BaseTask.first.bind(BaseTask);
  last = BaseTask.last.bind(BaseTask);
  
  // Utility methods
  exists = BaseTask.exists.bind(BaseTask);
  count = BaseTask.count.bind(BaseTask);
}

// Export singleton instance
export const Task = new TaskWithPermissions();

// Export types for convenience
export type { TaskData, CreateTaskData, UpdateTaskData };

// Default export
export default Task;