// User Display Helper
// Provides consistent user avatar display logic for JavaScript

// Avatar colors - must match UserDisplay::AVATAR_COLORS in Ruby
export const AVATAR_COLORS = [
  "#FF9500", // Orange
  "#FF5E5B", // Red
  "#FFCC00", // Yellow
  "#34C759", // Green
  "#007AFF", // Blue
  "#5856D6", // Purple
  "#AF52DE", // Pink Purple
  "#FF2D55", // Pink
  "#00C7BE", // Teal
  "#30B0C7", // Light Blue
  "#FF3B30", // Bright Red
  "#FF9F0A"  // Amber
]

// Generate initials from user name
export function getUserInitials(name) {
  if (!name || name.trim() === '') return '?'
  
  // Take only the first letter of the name
  return name.trim()[0].toUpperCase()
}

// Get consistent avatar color based on user ID
export function getUserAvatarColor(userId) {
  if (!userId) return AVATAR_COLORS[0]
  return AVATAR_COLORS[userId % AVATAR_COLORS.length]
}

// Generate avatar HTML
export function createUserAvatar(user, size = 'sm', cssClass = '') {
  const initials = getUserInitials(user.name)
  const color = getUserAvatarColor(user.id)
  const sizeClass = `user-avatar-${size}`
  const classes = `user-avatar ${sizeClass} ${cssClass}`.trim()
  
  return `<span class="${classes}" style="background-color: ${color};">${initials}</span>`
}

// Create avatar element matching server-rendered HTML
export function createUserAvatarElement(user, size = 'sm', cssClass = '') {
  const span = document.createElement('span')
  span.className = `user-avatar user-avatar-${size} ${cssClass}`.trim()
  span.style.backgroundColor = getUserAvatarColor(user.id)
  span.textContent = getUserInitials(user.name)
  return span
}