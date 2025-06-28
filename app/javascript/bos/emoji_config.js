// Emoji configuration loaded from Ruby
// This module provides a consistent interface for emoji usage across JavaScript

let emojiConfig = null;

// Initialize emoji config from Ruby-provided data
export function initializeEmojiConfig(config) {
  emojiConfig = config;
}

// Get emoji config (lazy load from DOM if not initialized)
function getEmojiConfig() {
  if (!emojiConfig) {
    const configElement = document.getElementById('emoji-config');
    if (configElement) {
      try {
        emojiConfig = JSON.parse(configElement.textContent);
      } catch (e) {
        console.error('Failed to parse emoji config:', e);
        // Return a fallback config
        return getFallbackConfig();
      }
    } else {
      console.warn('Emoji config not found in DOM, using fallback');
      return getFallbackConfig();
    }
  }
  return emojiConfig;
}

// Task Status Emojis
export const taskStatusEmoji = (status) => {
  const config = getEmojiConfig();
  return config?.task_statuses?.[status]?.emoji || "❓";
}

export const taskStatusLabel = (status) => {
  const config = getEmojiConfig();
  return config?.task_statuses?.[status]?.label || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Job Status Emojis
export const jobStatusEmoji = (status) => {
  const config = getEmojiConfig();
  return config?.job_statuses?.[status]?.emoji || "❓";
}

export const jobStatusLabel = (status) => {
  const config = getEmojiConfig();
  return config?.job_statuses?.[status]?.label || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Priority Emojis
export const jobPriorityEmoji = (priority) => {
  const config = getEmojiConfig();
  return config?.priorities?.job?.[priority]?.emoji || "";
}

export const priorityEmoji = (priority) => {
  const config = getEmojiConfig();
  return config?.priorities?.task?.[priority]?.emoji || "";
}

export const priorityLabel = (priority) => {
  const config = getEmojiConfig();
  const jobPriority = config?.priorities?.job?.[priority];
  const taskPriority = config?.priorities?.task?.[priority];
  
  if (jobPriority) return jobPriority.label;
  if (taskPriority) return taskPriority.label;
  
  return priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Utility emojis
export const getUtilityEmoji = (type) => {
  const config = getEmojiConfig();
  return config?.utility?.[type] || "";
}

// Client Type Icons
export const clientTypeEmoji = (type) => {
  const config = getEmojiConfig();
  return config?.utility?.client_types?.[type] || "❓";
}

// Contact Method Icons
export const contactMethodEmoji = (method) => {
  const config = getEmojiConfig();
  return config?.utility?.contact_methods?.[method] || "📞";
}

// Schedule Type Icons
export const scheduleTypeEmoji = (type) => {
  const config = getEmojiConfig();
  return config?.utility?.schedule_types?.[type] || "📅";
}

// Utility Icons
export const TIMER_EMOJI = () => getUtilityEmoji('timer') || "⏱️";
export const TRASH_EMOJI = () => getUtilityEmoji('trash') || "🗑️";
export const WARNING_EMOJI = () => getUtilityEmoji('warning') || "❗";
export const CHECK_EMOJI = () => getUtilityEmoji('check') || "✓";

// Helper functions
export const statusWithEmoji = (status, type = 'task') => {
  const emoji = type === 'job' ? jobStatusEmoji(status) : taskStatusEmoji(status);
  const label = type === 'job' ? jobStatusLabel(status) : taskStatusLabel(status);
  return `${emoji} ${label}`;
}

export const priorityWithEmoji = (priority, type = 'job') => {
  const emoji = type === 'job' ? jobPriorityEmoji(priority) : priorityEmoji(priority);
  const label = priorityLabel(priority);
  return emoji ? `${emoji} ${label}` : label;
}

// Fallback configuration if Ruby data is not available
function getFallbackConfig() {
  return {
    task_statuses: {
      new_task: { emoji: "⚫️", label: "New" },
      in_progress: { emoji: "🟢", label: "In Progress" },
      paused: { emoji: "⏸️", label: "Paused" },
      successfully_completed: { emoji: "☑️", label: "Completed" },
      cancelled: { emoji: "❌", label: "Cancelled" }
    },
    job_statuses: {
      open: { emoji: "⚫", label: "Open" },
      in_progress: { emoji: "🟢", label: "In Progress" },
      paused: { emoji: "⏸️", label: "Paused" },
      waiting_for_customer: { emoji: "⏳", label: "Waiting for Customer" },
      waiting_for_scheduled_appointment: { emoji: "📅", label: "Scheduled" },
      successfully_completed: { emoji: "✅", label: "Completed" },
      cancelled: { emoji: "❌", label: "Cancelled" }
    },
    priorities: {
      job: {
        critical: { emoji: "🔥", label: "Critical" },
        high: { emoji: "❗", label: "High" },
        normal: { emoji: "", label: "Normal" },
        low: { emoji: "➖", label: "Low" },
        proactive_followup: { emoji: "💬", label: "Proactive Follow-up" }
      },
      task: {
        high: { emoji: "🔴", label: "High" },
        medium: { emoji: "🟡", label: "Medium" },
        low: { emoji: "🟢", label: "Low" }
      }
    },
    unassigned: "❓",
    utility: {
      timer: "⏱️",
      trash: "🗑️",
      warning: "❗",
      check: "✓",
      client_types: {
        business: "🏢",
        residential: "🏠"
      },
      contact_methods: {
        phone: "📱",
        primary_phone: "📱",
        email: "📧",
        address: "📍"
      },
      schedule_types: {
        scheduled_appointment: "📅",
        follow_up: "🔄",
        due_date: "⏰",
        start_date: "▶️"
      }
    }
  };
}