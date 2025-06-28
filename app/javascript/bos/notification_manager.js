// Module for managing user notifications
export class NotificationManager {
  constructor() {
    this.container = null
    this.notifications = new Map()
    this.notificationCount = 0
  }

  // Initialize the notification container
  init() {
    if (this.container) return

    // Create container
    this.container = document.createElement('div')
    this.container.className = 'notification-container'
    this.container.setAttribute('role', 'alert')
    this.container.setAttribute('aria-live', 'polite')
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style')
      style.id = 'notification-styles'
      style.textContent = `
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          pointer-events: none;
        }
        
        .notification {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px 20px;
          margin-bottom: 10px;
          min-width: 300px;
          max-width: 400px;
          pointer-events: all;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: slideIn 0.3s ease-out;
          transition: all 0.3s ease-out;
        }
        
        .notification.hiding {
          animation: slideOut 0.3s ease-out;
          opacity: 0;
          transform: translateX(100%);
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
        
        .notification-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        
        .notification.error {
          border-left: 4px solid #ef4444;
        }
        
        .notification.error .notification-icon {
          background: #fee2e2;
          color: #dc2626;
        }
        
        .notification.warning {
          border-left: 4px solid #f59e0b;
        }
        
        .notification.warning .notification-icon {
          background: #fef3c7;
          color: #d97706;
        }
        
        .notification.success {
          border-left: 4px solid #10b981;
        }
        
        .notification.success .notification-icon {
          background: #d1fae5;
          color: #059669;
        }
        
        .notification.info {
          border-left: 4px solid #3b82f6;
        }
        
        .notification.info .notification-icon {
          background: #dbeafe;
          color: #2563eb;
        }
        
        .notification-content {
          flex-grow: 1;
        }
        
        .notification-title {
          font-weight: 600;
          margin-bottom: 4px;
          color: #1f2937;
        }
        
        .notification-message {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-line;
        }
        
        .notification-close {
          flex-shrink: 0;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #9ca3af;
          transition: color 0.2s;
        }
        
        .notification-close:hover {
          color: #4b5563;
        }
        
        .notification-action {
          margin-top: 8px;
        }
        
        .notification-action button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .notification-action button:hover {
          background: #2563eb;
        }
      `
      document.head.appendChild(style)
    }
    
    document.body.appendChild(this.container)
  }

  // Show a notification
  show(options) {
    this.init()

    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      action = null,
      persistent = false
    } = options

    const id = `notification-${++this.notificationCount}`
    
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `notification ${type}`
    notification.id = id
    
    // Icon
    const icon = document.createElement('div')
    icon.className = 'notification-icon'
    icon.innerHTML = this.getIcon(type)
    
    // Content
    const content = document.createElement('div')
    content.className = 'notification-content'
    
    if (title) {
      const titleEl = document.createElement('div')
      titleEl.className = 'notification-title'
      titleEl.textContent = title
      content.appendChild(titleEl)
    }
    
    if (message) {
      const messageEl = document.createElement('div')
      messageEl.className = 'notification-message'
      messageEl.textContent = message
      content.appendChild(messageEl)
    }
    
    if (action) {
      const actionEl = document.createElement('div')
      actionEl.className = 'notification-action'
      const actionBtn = document.createElement('button')
      actionBtn.textContent = action.text || 'Action'
      actionBtn.onclick = () => {
        action.handler ? action.handler() : action()
        this.hide(id)
      }
      actionEl.appendChild(actionBtn)
      content.appendChild(actionEl)
    }
    
    // Close button
    const closeBtn = document.createElement('button')
    closeBtn.className = 'notification-close'
    closeBtn.innerHTML = '✕'
    closeBtn.onclick = () => this.hide(id)
    
    // Assemble notification
    notification.appendChild(icon)
    notification.appendChild(content)
    notification.appendChild(closeBtn)
    
    // Add to container
    this.container.appendChild(notification)
    this.notifications.set(id, { element: notification, persistent })
    
    // Auto-hide after duration
    if (!persistent && duration > 0) {
      setTimeout(() => this.hide(id), duration)
    }
    
    return id
  }

  // Hide a notification
  hide(id) {
    const notification = this.notifications.get(id)
    if (!notification) return
    
    notification.element.classList.add('hiding')
    
    setTimeout(() => {
      notification.element.remove()
      this.notifications.delete(id)
    }, 300)
  }

  // Hide all notifications
  hideAll() {
    this.notifications.forEach((_, id) => this.hide(id))
  }

  // Get icon for notification type
  getIcon(type) {
    const icons = {
      error: '✕',
      warning: '⚠',
      success: '✓',
      info: 'ℹ'
    }
    return icons[type] || icons.info
  }

  // Convenience methods
  error(message, title = 'Error', options = {}) {
    return this.show({ ...options, type: 'error', title, message })
  }

  warning(message, title = 'Warning', options = {}) {
    return this.show({ ...options, type: 'warning', title, message })
  }

  success(message, title = 'Success', options = {}) {
    return this.show({ ...options, type: 'success', title, message })
  }

  info(message, title = 'Info', options = {}) {
    return this.show({ ...options, type: 'info', title, message })
  }
}

// Create singleton instance
export const notificationManager = new NotificationManager()