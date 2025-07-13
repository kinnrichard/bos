/**
 * Centralized emoji configuration for the bŏs Svelte PWA
 * 
 * This is the single source of truth for all emoji mappings throughout the application.
 * Based on the original Rails emoji configuration but adapted for the API + PWA architecture.
 */

import { 
  getJobStatusString, 
  getJobPriorityString, 
  getTaskStatusString 
} from '$lib/utils/enum-conversions';


// Job Status Emoji Mappings
const JOB_STATUS_EMOJIS: Record<string, string> = {
  'open': '⚫',
  'in_progress': '🟢',
  'waiting_for_customer': '⏳',
  'waiting_for_scheduled_appointment': '📅',
  'paused': '⏸️',
  'successfully_completed': '✅',
  'cancelled': '❌'
};

// Job Priority Emoji Mappings
const JOB_PRIORITY_EMOJIS: Record<string, string> = {
  'low': '➖',
  'normal': '',
  'high': '❗',
  'critical': '🔥',
  'proactive_followup': '💬'
};

// Task Status Emoji Mappings
const TASK_STATUS_EMOJIS: Record<string, string> = {
  'new_task': '⚫️',
  'in_progress': '🟢',
  'paused': '⏸️',
  'successfully_completed': '☑️',
  'cancelled': '❌'
};

// Task Priority Emoji Mappings  
const TASK_PRIORITY_EMOJIS: Record<string, string> = {
  'high': '🔴',
  'medium': '🟡',
  'low': '🟢'
};

// Utility Emojis
const UTILITY_EMOJIS = {
  timer: '⏱️',
  trash: '🗑️',
  warning: '❗',
  check: '✓',
  unassigned: '❓',
  client_types: {
    business: '🏢',
    residential: '🏠'
  },
  contact_methods: {
    phone: '📱',
    primary_phone: '📱',
    email: '📧',
    address: '📍'
  },
  schedule_types: {
    scheduled_appointment: '📅',
    follow_up: '🔄',
    due_date: '⏰',
    start_date: '▶️'
  }
} as const;

/**
 * Get emoji for a job status
 */
export function getJobStatusEmoji(status: string | number | null | undefined): string {
  const statusString = typeof status === 'number' ? getJobStatusString(status) : status;
  return JOB_STATUS_EMOJIS[statusString || ''] || '📝';
}

/**
 * Get emoji for a job priority
 */
export function getJobPriorityEmoji(priority: string | number | null | undefined): string {
  const priorityString = typeof priority === 'number' ? getJobPriorityString(priority) : priority;
  return JOB_PRIORITY_EMOJIS[priorityString || ''] || '';
}

/**
 * Get emoji for a task status
 */
export function getTaskStatusEmoji(status: string | number | null | undefined): string {
  const statusString = typeof status === 'number' ? getTaskStatusString(status) : status;
  return TASK_STATUS_EMOJIS[statusString || ''] || '❓';
}

/**
 * Get label for a task status
 */
export function getTaskStatusLabel(status: string | number | null | undefined): string {
  const statusString = typeof status === 'number' ? getTaskStatusString(status) : status;
  switch (statusString) {
    case 'new_task': return 'New Task';
    case 'in_progress': return 'In Progress';
    case 'paused': return 'Paused';
    case 'successfully_completed': return 'Completed Successfully';
    case 'cancelled': return 'Cancelled';
    default: return statusString?.replace('_', ' ') || 'Unknown';
  }
}

/**
 * Get emoji for a task priority
 */
export function getTaskPriorityEmoji(priority: string): string {
  return TASK_PRIORITY_EMOJIS[priority] || '';
}

/**
 * Get utility emoji by type
 */
export function getUtilityEmoji(type: keyof typeof UTILITY_EMOJIS): string {
  return UTILITY_EMOJIS[type] as string || '';
}

/**
 * Get client type emoji
 */
export function getClientTypeEmoji(type: keyof typeof UTILITY_EMOJIS.client_types): string {
  return UTILITY_EMOJIS.client_types[type] || '❓';
}

/**
 * Get contact method emoji
 */
export function getContactMethodEmoji(method: keyof typeof UTILITY_EMOJIS.contact_methods): string {
  return UTILITY_EMOJIS.contact_methods[method] || '📞';
}

/**
 * Get schedule type emoji
 */
export function getScheduleTypeEmoji(type: keyof typeof UTILITY_EMOJIS.schedule_types): string {
  return UTILITY_EMOJIS.schedule_types[type] || '📅';
}

/**
 * Helper function to get status with emoji and label
 */
export function getJobStatusWithEmoji(status: string | number | null | undefined): string {
  if (status === null || status === undefined) return '📝 Unknown';
  const statusString = typeof status === 'number' ? getJobStatusString(status) : status;
  const emoji = getJobStatusEmoji(status);
  const label = statusString.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `${emoji} ${label}`;
}

/**
 * Helper function to get priority with emoji and label
 */
export function getJobPriorityWithEmoji(priority: string | number | null | undefined): string {
  if (priority === null || priority === undefined) return 'Unknown';
  const priorityString = typeof priority === 'number' ? getJobPriorityString(priority) : priority;
  const emoji = getJobPriorityEmoji(priority);
  const label = priorityString.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return emoji ? `${emoji} ${label}` : label;
}

// Export emoji mappings for advanced use cases
export const EMOJI_MAPPINGS = {
  jobStatuses: JOB_STATUS_EMOJIS,
  jobPriorities: JOB_PRIORITY_EMOJIS,
  taskStatuses: TASK_STATUS_EMOJIS,
  taskPriorities: TASK_PRIORITY_EMOJIS,
  utility: UTILITY_EMOJIS
} as const;