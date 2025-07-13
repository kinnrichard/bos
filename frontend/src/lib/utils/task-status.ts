/**
 * Task status mapping utilities
 * Maps between Rails enum numeric values and string keys
 */

export const TASK_STATUS_MAP = {
  0: 'new_task',
  1: 'in_progress', 
  2: 'paused',
  3: 'successfully_completed',
  4: 'cancelled'
} as const;

export const TASK_STATUS_REVERSE_MAP = {
  'new_task': 0,
  'in_progress': 1,
  'paused': 2,
  'successfully_completed': 3,
  'cancelled': 4
} as const;

export type TaskStatusNumeric = keyof typeof TASK_STATUS_MAP;
export type TaskStatusString = keyof typeof TASK_STATUS_REVERSE_MAP;

/**
 * Convert numeric task status to string format
 * @param status - Numeric status from database (0, 1, 2, 3, 4)
 * @returns String status ('new_task', 'in_progress', etc.)
 */
export function taskStatusToString(status: number): TaskStatusString {
  return TASK_STATUS_MAP[status as TaskStatusNumeric] || 'new_task';
}

/**
 * Convert string task status to numeric format
 * @param status - String status ('new_task', 'in_progress', etc.)
 * @returns Numeric status (0, 1, 2, 3, 4)
 */
export function taskStatusToNumber(status: string): number {
  return TASK_STATUS_REVERSE_MAP[status as TaskStatusString] || 0;
}

/**
 * Check if a task should be shown based on its numeric status and string filter statuses
 * @param task - Task object with numeric status
 * @param filterStatuses - Array of string status filters
 * @returns Whether the task should be visible
 */
export function shouldShowTaskByStatus(task: { status: number }, filterStatuses: string[]): boolean {
  if (filterStatuses.length === 0) return true;
  
  const taskStatusString = taskStatusToString(task.status);
  return filterStatuses.includes(taskStatusString);
}