// Constants used throughout the application

// Animation and timing
export const ANIMATION = {
  TIMER_UPDATE_INTERVAL: 1000,
  BLUR_DELAY: 200,
  SCROLL_DELAY: 50,
  FLIP_DURATION: 400,
  FADE_DURATION: 300,
  DROPDOWN_ANIMATION: 200,
  POPOVER_ANIMATION: 200,
  QUICK_TRANSITION: 150
}

// Task positioning
export const POSITIONING = {
  INCREMENT: 1000,
  MIN_POSITION: 100,
  DEFAULT_POSITION: 1000,
  MAX_POSITION: 999999
}

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  STATUS: {
    'p': 'in_progress',
    'n': 'new_task',
    'c': 'successfully_completed',
    's': 'successfully_completed', // alias
    'x': 'cancelled',
    'h': 'paused'
  },
  PRIORITY: {
    '!': 'critical',
    '1': 'high',
    '2': 'normal',
    '3': 'low',
    '4': 'proactive_followup'
  },
  ACTIONS: {
    'Enter': 'save',
    'Escape': 'cancel',
    'Delete': 'delete',
    'Backspace': 'delete',
    'Tab': 'indent',
    'Shift+Tab': 'outdent'
  }
}

// Status lists
export const TASK_STATUSES = ['new_task', 'in_progress', 'successfully_completed', 'cancelled']
export const JOB_STATUSES = ['open', 'in_progress', 'paused', 'successfully_completed', 'cancelled']

// Priority lists  
export const PRIORITIES = ['critical', 'high', 'normal', 'low', 'proactive_followup']
export const JOB_PRIORITIES = ['critical', 'high', 'normal', 'low', 'proactive_followup']

// UI Classes
export const CLASSES = {
  SELECTED: 'selected',
  EDITING: 'editing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  HIDDEN: 'hidden',
  ACTIVE: 'active',
  SUBTASK: 'subtask',
  HAS_SUBTASKS: 'has-subtasks',
  EXPANDED: 'expanded',
  COLLAPSED: 'collapsed',
  DRAGGING: 'dragging',
  DRAG_OVER: 'drag-over'
}

// Data attributes
export const DATA_ATTRS = {
  TASK_ID: 'data-task-id',
  PARENT_ID: 'data-parent-id',
  STATUS: 'data-status',
  PRIORITY: 'data-priority',
  POSITION: 'data-position',
  DURATION: 'data-duration',
  SELECTED: 'aria-selected'
}

// Local storage keys
export const STORAGE_KEYS = {
  COLLAPSED_TASKS: 'collapsedTasks',
  VIEW_PREFERENCES: 'jobViewPreferences',
  RECENT_TECHNICIANS: 'recentTechnicians'
}

// API response fields
export const API_FIELDS = {
  TASK: {
    ID: 'id',
    TITLE: 'title',
    STATUS: 'status',
    PRIORITY: 'priority',
    POSITION: 'position',
    PARENT_ID: 'parent_task_id',
    TECHNICIAN: 'assigned_technician',
    DURATION: 'duration_seconds',
    NOTES_COUNT: 'notes_count'
  },
  JOB: {
    ID: 'id',
    STATUS: 'status',
    PRIORITY: 'priority',
    TECHNICIANS: 'technicians'
  }
}

// Error messages
export const ERRORS = {
  NETWORK: 'Network error. Please check your connection.',
  GENERIC: 'An error occurred. Please try again.',
  SAVE_FAILED: 'Failed to save changes',
  DELETE_FAILED: 'Failed to delete item',
  UPDATE_FAILED: 'Failed to update'
}