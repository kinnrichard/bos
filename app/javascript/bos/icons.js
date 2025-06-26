// Task Status Emojis
export const taskStatusEmoji = (status) => {
  switch (status) {
    case "new_task": return "⚫"
    case "in_progress": return "🟢"
    case "paused": return "⏸️"
    case "successfully_completed": return "☑️"
    case "cancelled": return "❌"
    default: return "❓"
  }
}

export const taskStatusLabel = (status) => {
  switch (status) {
    case "new_task": return "New"
    case "in_progress": return "In Progress"
    case "paused": return "Paused"
    case "successfully_completed": return "Completed"
    case "cancelled": return "Cancelled"
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

// Job Status Emojis
export const jobStatusEmoji = (status) => {
  switch (status) {
    case "open": return "⚫"
    case "in_progress": return "🟢"
    case "paused": return "⏸️"
    case "waiting_for_customer": return "⏳"
    case "waiting_for_scheduled_appointment": return "📅"
    case "successfully_completed": return "✅"
    case "cancelled": return "❌"
    default: return "❓"
  }
}

export const jobStatusLabel = (status) => {
  switch (status) {
    case "open": return "Open"
    case "in_progress": return "In Progress"
    case "paused": return "Paused"
    case "waiting_for_customer": return "Waiting for Customer"
    case "waiting_for_scheduled_appointment": return "Scheduled"
    case "successfully_completed": return "Completed"
    case "cancelled": return "Cancelled"
    default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

// Priority Emojis
export const jobPriorityEmoji = (priority) => {
  switch (priority) {
    case "critical": return "🔥"
    case "high": return "❗"
    case "normal": return ""
    case "low": return "➖"
    case "proactive_followup": return "💬"
    default: return ""
  }
}

export const priorityEmoji = (priority) => {
  switch (priority) {
    case "high": return "🔴"
    case "medium": return "🟡"
    case "low": return "🟢"
    default: return ""
  }
}

export const priorityLabel = (priority) => {
  switch (priority) {
    case "critical": return "Critical"
    case "high": return "High"
    case "normal": 
    case "medium": return "Normal"
    case "low": return "Low"
    case "proactive_followup": return "Proactive Follow-up"
    default: return priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

// Client Type Icons
export const clientTypeEmoji = (type) => {
  switch (type) {
    case "business": return "🏢"
    case "residential": return "🏠"
    default: return "❓"
  }
}

// Contact Method Icons
export const contactMethodEmoji = (method) => {
  switch (method) {
    case "phone":
    case "primary_phone": return "📱"
    case "email": return "📧"
    case "address": return "📍"
    default: return "📞"
  }
}

// Schedule Type Icons
export const scheduleTypeEmoji = (type) => {
  switch (type) {
    case "scheduled_appointment": return "📅"
    case "follow_up": return "🔄"
    case "due_date": return "⏰"
    case "start_date": return "▶️"
    default: return "📅"
  }
}

// Utility Icons
export const TIMER_EMOJI = "⏱️"
export const TRASH_EMOJI = "🗑️"
export const WARNING_EMOJI = "❗"
export const CHECK_EMOJI = "✓"

// SVG Icons as strings (for dynamic insertion)
export const noteIconSVG = (width = 16, height = 16) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.8242 17.998" width="${width}" height="${height}">
    <path d="M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258Z" fill="currentColor" fill-opacity="0.85"/>
    <path d="M4.61914 8.11523L14.873 8.11523C15.2148 8.11523 15.4785 7.8418 15.4785 7.5C15.4785 7.16797 15.2148 6.91406 14.873 6.91406L4.61914 6.91406C4.25781 6.91406 4.00391 7.16797 4.00391 7.5C4.00391 7.8418 4.25781 8.11523 4.61914 8.11523Z" fill="currentColor" fill-opacity="0.85"/>
    <path d="M4.61914 11.0547L14.873 11.0547C15.2148 11.0547 15.4785 10.8008 15.4785 10.4688C15.4785 10.1172 15.2148 9.85352 14.873 9.85352L4.61914 9.85352C4.25781 9.85352 4.00391 10.1172 4.00391 10.4688C4.00391 10.8008 4.25781 11.0547 4.61914 11.0547Z" fill="currentColor" fill-opacity="0.85"/>
    <path d="M4.61914 13.9941L11.1328 13.9941C11.4746 13.9941 11.7383 13.7402 11.7383 13.4082C11.7383 13.0664 11.4746 12.793 11.1328 12.793L4.61914 12.793C4.25781 12.793 4.00391 13.0664 4.00391 13.4082C4.00391 13.7402 4.25781 13.9941 4.61914 13.9941Z" fill="currentColor" fill-opacity="0.85"/>
  </svg>
`.trim()

export const infoIconSVG = (width = 16, height = 16) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="${width}" height="${height}">
    <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-opacity="0.85"/>
    <circle cx="9" cy="4.5" r="0.75" fill="currentColor" fill-opacity="0.85"/>
    <rect x="8.25" y="7" width="1.5" height="7" rx="0.75" fill="currentColor" fill-opacity="0.85"/>
  </svg>
`.trim()

export const chevronDownSVG = (width = 12, height = 8) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 8" width="${width}" height="${height}">
    <path d="M 1 2 L 6 7 L 11 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`.trim()

export const chevronRightSVG = (width = 8, height = 12) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 12" width="${width}" height="${height}">
    <path d="M 2 1 L 7 6 L 2 11" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`.trim()

// Helper functions
export const statusWithEmoji = (status, type = 'task') => {
  const emoji = type === 'job' ? jobStatusEmoji(status) : taskStatusEmoji(status)
  const label = type === 'job' ? jobStatusLabel(status) : taskStatusLabel(status)
  return `${emoji} ${label}`
}

export const priorityWithEmoji = (priority, type = 'job') => {
  const emoji = type === 'job' ? jobPriorityEmoji(priority) : priorityEmoji(priority)
  const label = priorityLabel(priority)
  return emoji ? `${emoji} ${label}` : label
}