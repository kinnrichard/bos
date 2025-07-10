import { useQuery } from 'zero-svelte-query';
import { getZero } from './client';

/**
 * Zero query hook for fetching tasks by job with hierarchy
 * Replaces: useTaskBatchDetailsQuery() and task-related queries
 */
export function useTasksByJobQuery(jobId: string, enabled: boolean = true) {
  if (!enabled || !jobId) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('job_id', jobId)
    .where('deleted_at', 'IS', null)
    .related('parent')
    .related('children', (children) => 
      children.where('deleted_at', 'IS', null)
              .orderBy('position', 'asc')
    )
    .related('job', (job) => 
      job.related('client')
    )
    .orderBy('position', 'asc'));
}

/**
 * Zero query hook for a single task with all relationships
 */
export function useTaskQuery(id: string, enabled: boolean = true) {
  if (!enabled || !id) {
    return { current: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('id', id)
    .where('deleted_at', 'IS', null)
    .related('job', (job) => 
      job.related('client')
    )
    .related('parent')
    .related('children', (children) => 
      children.where('deleted_at', 'IS', null)
              .orderBy('position', 'asc')
    )
    .one());
}

/**
 * Zero query hook for root tasks (no parent) in a job
 */
export function useRootTasksQuery(jobId: string, enabled: boolean = true) {
  if (!enabled || !jobId) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('job_id', jobId)
    .where('parent_id', 'IS', null)
    .where('deleted_at', 'IS', null)
    .related('children', (children) => 
      children.where('deleted_at', 'IS', null)
              .orderBy('position', 'asc')
    )
    .orderBy('position', 'asc'));
}

/**
 * Zero query hook for subtasks of a specific task
 */
export function useSubtasksQuery(parentId: string, enabled: boolean = true) {
  if (!enabled || !parentId) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('parent_id', parentId)
    .where('deleted_at', 'IS', null)
    .related('children', (children) => 
      children.where('deleted_at', 'IS', null)
              .orderBy('position', 'asc')
    )
    .orderBy('position', 'asc'));
}

/**
 * Zero query hook for tasks by status
 */
export function useTasksByStatusQuery(jobId: string, status: string, enabled: boolean = true) {
  if (!enabled || !jobId || !status) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('job_id', jobId)
    .where('status', status)
    .where('deleted_at', 'IS', null)
    .related('parent')
    .related('children')
    .orderBy('position', 'asc'));
}

/**
 * Zero query hook for task hierarchy with depth calculation
 * Returns a flat list with computed depth for UI rendering
 */
export function useTaskHierarchyQuery(jobId: string, enabled: boolean = true) {
  if (!enabled || !jobId) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('job_id', jobId)
    .where('deleted_at', 'IS', null)
    .related('parent')
    .related('children')
    .orderBy('position', 'asc'));
}

// Zero mutations for task operations

/**
 * Create a new task
 */
export async function createTask(taskData: {
  job_id: string;
  parent_id?: string | null;
  title: string;
  description?: string;
  status?: string;
  position?: number;
  due_date?: string;
}) {
  const zero = getZero();
  const id = crypto.randomUUID();
  const uuid = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get next position if not specified
  let position = taskData.position;
  if (position === undefined) {
    const existingTasks = await zero.query.tasks
      .where('job_id', taskData.job_id)
      .where('parent_id', taskData.parent_id || null)
      .where('deleted_at', 'IS', null);
    
    position = existingTasks.length;
  }

  await zero.mutate.tasks.insert({
    id,
    uuid,
    job_id: taskData.job_id,
    parent_id: taskData.parent_id || null,
    title: taskData.title,
    description: taskData.description || '',
    status: taskData.status || 'pending',
    position,
    due_date: taskData.due_date || null,
    lock_version: 0,
    created_at: now,
    updated_at: now,
  });

  return { id, uuid };
}

/**
 * Update a task
 */
export async function updateTask(id: string, data: Partial<{
  title: string;
  description: string;
  status: string;
  position: number;
  parent_id: string | null;
  due_date: string;
}>) {
  const zero = getZero();
  const now = new Date().toISOString();

  // Get current lock version for optimistic locking
  const currentTask = await zero.query.tasks.where('id', id).one();
  if (!currentTask) {
    throw new Error('Task not found');
  }

  await zero.mutate.tasks.update({
    id,
    ...data,
    lock_version: currentTask.lock_version + 1,
    updated_at: now,
    reordered_at: data.position !== undefined ? now : currentTask.reordered_at,
  });

  return { id, ...data };
}

/**
 * Delete a task (soft delete)
 */
export async function deleteTask(id: string) {
  const zero = getZero();
  const now = new Date().toISOString();

  await zero.mutate.tasks.update({
    id,
    deleted_at: now,
    updated_at: now,
  });
}

/**
 * Restore a deleted task
 */
export async function restoreTask(id: string) {
  const zero = getZero();
  const now = new Date().toISOString();

  await zero.mutate.tasks.update({
    id,
    deleted_at: null,
    updated_at: now,
  });
}

/**
 * Update task status
 */
export async function updateTaskStatus(id: string, status: string) {
  return updateTask(id, { status });
}

/**
 * Move task to different parent (change hierarchy)
 */
export async function moveTaskToParent(
  taskId: string, 
  newParentId: string | null, 
  position?: number
) {
  const zero = getZero();
  
  // Get siblings in new location to determine position
  const siblings = await zero.query.tasks
    .where('parent_id', newParentId)
    .where('deleted_at', 'IS', null)
    .where('id', '!=', taskId); // Exclude the task being moved
  
  const newPosition = position !== undefined ? position : siblings.length;
  
  return updateTask(taskId, { 
    parent_id: newParentId, 
    position: newPosition 
  });
}

/**
 * Reorder tasks within the same parent
 */
export async function reorderTasks(updates: Array<{
  id: string;
  position: number;
}>) {
  const zero = getZero();
  const now = new Date().toISOString();

  for (const update of updates) {
    const currentTask = await zero.query.tasks.where('id', update.id).one();
    if (currentTask) {
      await zero.mutate.tasks.update({
        id: update.id,
        position: update.position,
        lock_version: currentTask.lock_version + 1,
        reordered_at: now,
        updated_at: now,
      });
    }
  }

  return updates;
}

/**
 * Batch move tasks (for drag & drop operations)
 */
export async function batchMoveTasks(moves: Array<{
  id: string;
  parent_id: string | null;
  position: number;
}>) {
  const zero = getZero();
  const now = new Date().toISOString();

  for (const move of moves) {
    const currentTask = await zero.query.tasks.where('id', move.id).one();
    if (currentTask) {
      await zero.mutate.tasks.update({
        id: move.id,
        parent_id: move.parent_id,
        position: move.position,
        lock_version: currentTask.lock_version + 1,
        reordered_at: now,
        updated_at: now,
      });
    }
  }

  return moves;
}

/**
 * Duplicate a task (with or without subtasks)
 */
export async function duplicateTask(
  sourceTaskId: string, 
  options: {
    includeSubtasks?: boolean;
    newTitle?: string;
    newParentId?: string | null;
  } = {}
) {
  const zero = getZero();
  
  // Get source task
  const sourceTask = await zero.query.tasks
    .where('id', sourceTaskId)
    .where('deleted_at', 'IS', null)
    .related('children', (children) => 
      children.where('deleted_at', 'IS', null)
    )
    .one();

  if (!sourceTask) {
    throw new Error('Source task not found');
  }

  // Create new task
  const newTaskId = crypto.randomUUID();
  const newTaskUuid = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Determine position
  const parentId = options.newParentId !== undefined ? options.newParentId : sourceTask.parent_id;
  const siblings = await zero.query.tasks
    .where('job_id', sourceTask.job_id)
    .where('parent_id', parentId)
    .where('deleted_at', 'IS', null);
  
  await zero.mutate.tasks.insert({
    id: newTaskId,
    uuid: newTaskUuid,
    job_id: sourceTask.job_id,
    parent_id: parentId,
    title: options.newTitle || `${sourceTask.title} (Copy)`,
    description: sourceTask.description,
    status: 'pending', // Reset status for copy
    position: siblings.length,
    due_date: null, // Don't copy due date
    lock_version: 0,
    created_at: now,
    updated_at: now,
  });

  // Copy subtasks if requested
  if (options.includeSubtasks && sourceTask.children && sourceTask.children.length > 0) {
    for (const [index, subtask] of sourceTask.children.entries()) {
      const subtaskId = crypto.randomUUID();
      const subtaskUuid = crypto.randomUUID();
      
      await zero.mutate.tasks.insert({
        id: subtaskId,
        uuid: subtaskUuid,
        job_id: sourceTask.job_id,
        parent_id: newTaskId, // Point to new parent
        title: subtask.title,
        description: subtask.description,
        status: 'pending',
        position: index,
        due_date: null,
        lock_version: 0,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return { id: newTaskId, uuid: newTaskUuid };
}

/**
 * Get task statistics for a job
 */
export function useTaskStatsQuery(jobId: string, enabled: boolean = true) {
  if (!enabled || !jobId) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  return useQuery(zero.query.tasks
    .where('job_id', jobId)
    .where('deleted_at', 'IS', null));
}

/**
 * Utility functions for task hierarchy
 */
export function useTaskUtils() {
  const tasksQuery = useTasksByJobQuery(''); // Will be overridden
  
  return {
    // Calculate task depth in hierarchy
    calculateDepth: (task: any, allTasks: any[]): number => {
      let depth = 0;
      let currentTask = task;
      
      while (currentTask.parent_id) {
        depth++;
        currentTask = allTasks.find(t => t.id === currentTask.parent_id);
        if (!currentTask || depth > 10) break; // Prevent infinite loops
      }
      
      return depth;
    },
    
    // Get all descendants of a task
    getDescendants: (taskId: string, allTasks: any[]): any[] => {
      const descendants: any[] = [];
      const queue = [taskId];
      
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = allTasks.filter(t => t.parent_id === currentId);
        
        descendants.push(...children);
        queue.push(...children.map(c => c.id));
      }
      
      return descendants;
    },
    
    // Check if task can be moved to new parent (prevent cycles)
    canMoveTo: (taskId: string, newParentId: string | null, allTasks: any[]): boolean => {
      if (!newParentId) return true; // Can always move to root
      
      // Check if new parent is a descendant of the task
      const descendants = this.getDescendants(taskId, allTasks);
      return !descendants.some(d => d.id === newParentId);
    },
    
    // Flatten hierarchy for display
    flattenHierarchy: (tasks: any[]): any[] => {
      const roots = tasks.filter(t => !t.parent_id);
      const result: any[] = [];
      
      const addTaskAndChildren = (task: any, depth: number = 0) => {
        result.push({ ...task, depth });
        
        const children = tasks
          .filter(t => t.parent_id === task.id)
          .sort((a, b) => a.position - b.position);
        
        children.forEach(child => addTaskAndChildren(child, depth + 1));
      };
      
      roots
        .sort((a, b) => a.position - b.position)
        .forEach(root => addTaskAndChildren(root));
      
      return result;
    }
  };
}