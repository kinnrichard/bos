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
  
  const parts = name.trim().split(/\s+/)
  
  if (parts.length >= 2) {
    // Take first letter of first two words
    return parts[0][0].toUpperCase() + parts[1][0].toUpperCase()
  } else {
    // For single word names, take first two letters
    return name.slice(0, 2).toUpperCase()
  }
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

// Create avatar element with all necessary styles
export function createUserAvatarElement(user, size = 'sm', cssClass = '') {
  const span = document.createElement('span')
  span.className = `user-avatar user-avatar-${size} ${cssClass}`.trim()
  
  // Apply essential inline styles to ensure proper display
  // These match the styles from _avatar.scss
  span.style.backgroundColor = getUserAvatarColor(user.id)
  span.style.display = 'inline-flex'
  span.style.alignItems = 'center'
  span.style.justifyContent = 'center'
  span.style.borderRadius = '50%'
  span.style.fontWeight = '600'
  span.style.color = 'white'
  span.style.textTransform = 'uppercase'
  span.style.lineHeight = '1'
  span.style.flexShrink = '0'
  span.style.userSelect = 'none'
  span.style.textShadow = '0.5px 0.5px 2px rgba(0, 0, 0, 0.75)'
  
  // Apply size-specific styles
  const sizeStyles = {
    sm: { width: '24px', height: '24px', fontSize: '10px' },
    md: { width: '32px', height: '32px', fontSize: '12px' },
    lg: { width: '40px', height: '40px', fontSize: '14px' },
    xl: { width: '48px', height: '48px', fontSize: '16px' }
  }
  
  if (sizeStyles[size]) {
    Object.assign(span.style, sizeStyles[size])
  }
  
  span.textContent = getUserInitials(user.name)
  return span
}