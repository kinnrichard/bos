/**
 * Enum mappings between Rails numeric values and string representations
 * Based on the Rails enum definitions in app/models/job.rb and app/models/task.rb
 */

// Task status mappings - Rails stores as integers 0-4
export const TASK_STATUS_MAP = {
  0: 'new_task',
  1: 'in_progress', 
  2: 'paused',
  3: 'successfully_completed',
  4: 'cancelled'
} as const;

// Reverse mapping for string to number conversion
export const TASK_STATUS_REVERSE_MAP = {
  'new_task': 0,
  'in_progress': 1,
  'paused': 2,
  'successfully_completed': 3,
  'cancelled': 4
} as const;

// Job status mappings - Rails stores as integers 0-6
export const JOB_STATUS_MAP = {
  0: 'open',
  1: 'in_progress',
  2: 'paused', 
  3: 'waiting_for_customer',
  4: 'waiting_for_scheduled_appointment',
  5: 'successfully_completed',
  6: 'cancelled'
} as const;

// Job priority mappings - Rails stores as integers 0-4
export const JOB_PRIORITY_MAP = {
  0: 'critical',
  1: 'high',
  2: 'normal',
  3: 'low',
  4: 'proactive_followup'
} as const;

// Type helpers
export type TaskStatusNumber = keyof typeof TASK_STATUS_MAP;
export type TaskStatusString = typeof TASK_STATUS_MAP[TaskStatusNumber];

export type JobStatusNumber = keyof typeof JOB_STATUS_MAP;
export type JobStatusString = typeof JOB_STATUS_MAP[JobStatusNumber];

export type JobPriorityNumber = keyof typeof JOB_PRIORITY_MAP;
export type JobPriorityString = typeof JOB_PRIORITY_MAP[JobPriorityNumber];

// Helper functions
export function getTaskStatusString(statusNumber: number): TaskStatusString {
  return TASK_STATUS_MAP[statusNumber as TaskStatusNumber] || 'new_task';
}

export function getTaskStatusNumber(statusString: string): number {
  return TASK_STATUS_REVERSE_MAP[statusString as TaskStatusString] ?? 0;
}

export function getJobStatusString(statusNumber: number): JobStatusString {
  return JOB_STATUS_MAP[statusNumber as JobStatusNumber] || 'open';
}

export function getJobPriorityString(priorityNumber: number): JobPriorityString {
  return JOB_PRIORITY_MAP[priorityNumber as JobPriorityNumber] || 'normal';
}