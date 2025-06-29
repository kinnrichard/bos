/**
 * Centralized emoji configuration for the bŏs Svelte PWA
 * 
 * This is the single source of truth for all emoji mappings throughout the application.
 * Based on the original Rails emoji configuration but adapted for the API + PWA architecture.
 */

// Job Status Emoji Mappings
const JOB_STATUS_EMOJIS: Record<string, string> = {
  'open': '📝',
  'in_progress': '⚡',
  'waiting_for_customer': '⏳',
  'waiting_for_scheduled_appointment': '📅',
  'paused': '⏸️',
  'successfully_completed': '✅',
  'cancelled': '❌'
};

// Job Priority Emoji Mappings
const JOB_PRIORITY_EMOJIS: Record<string, string> = {
  'low': '⬇️',
  'normal': '',
  'high': '⬆️',
  'critical': '🔥',
  'proactive_followup': '🔄'
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
export function getJobStatusEmoji(status: string): string {
  return JOB_STATUS_EMOJIS[status] || '📝';
}

/**
 * Get emoji for a job priority
 */
export function getJobPriorityEmoji(priority: string): string {
  return JOB_PRIORITY_EMOJIS[priority] || '';
}

/**
 * Get emoji for a task status
 */
export function getTaskStatusEmoji(status: string): string {
  return TASK_STATUS_EMOJIS[status] || '❓';
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
export function getJobStatusWithEmoji(status: string): string {
  const emoji = getJobStatusEmoji(status);
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `${emoji} ${label}`;
}

/**
 * Helper function to get priority with emoji and label
 */
export function getJobPriorityWithEmoji(priority: string): string {
  const emoji = getJobPriorityEmoji(priority);
  const label = priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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