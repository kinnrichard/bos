// Module for centralized error handling with context
export class ErrorHandler {
  constructor() {
    this.errorLog = []
    this.maxLogSize = 100
    this.listeners = new Set()
  }

  // Log an error with context
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      }
    }

    // Add to log
    this.errorLog.unshift(errorEntry)
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.pop()
    }

    // Notify listeners
    this.notifyListeners(errorEntry)

    // Log to console in development
    if (this.isDevelopment()) {
      console.error('Error:', errorEntry)
    }

    return errorEntry
  }

  // Handle different types of errors
  handleError(error, context = {}) {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.handleNetworkError(error, context)
    }

    // API errors
    if (context.response) {
      return this.handleApiError(error, context)
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error, context)
    }

    // Generic errors
    return this.handleGenericError(error, context)
  }

  handleNetworkError(error, context) {
    const errorEntry = this.logError(error, {
      ...context,
      type: 'network',
      suggestion: 'Please check your internet connection and try again.'
    })

    this.showUserNotification({
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      duration: 5000
    })

    return errorEntry
  }

  async handleApiError(error, context) {
    const { response } = context
    let errorData = {}

    try {
      errorData = await response.json()
    } catch (e) {
      errorData = { message: response.statusText }
    }

    const errorEntry = this.logError(error, {
      ...context,
      type: 'api',
      status: response.status,
      statusText: response.statusText,
      errorData
    })

    // Handle specific status codes
    switch (response.status) {
      case 401:
        this.showUserNotification({
          type: 'error',
          title: 'Authentication Required',
          message: 'Please log in to continue.',
          action: () => window.location.href = '/login'
        })
        break
      case 403:
        this.showUserNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to perform this action.'
        })
        break
      case 404:
        this.showUserNotification({
          type: 'error',
          title: 'Not Found',
          message: errorData.message || 'The requested resource was not found.'
        })
        break
      case 409:
        this.showUserNotification({
          type: 'warning',
          title: 'Conflict',
          message: errorData.message || 'The resource has been modified by another user.'
        })
        break
      case 422:
        this.handleValidationError(errorData, context)
        break
      case 500:
        this.showUserNotification({
          type: 'error',
          title: 'Server Error',
          message: 'An unexpected error occurred. Please try again later.'
        })
        break
      default:
        this.showUserNotification({
          type: 'error',
          title: 'Error',
          message: errorData.message || 'An error occurred while processing your request.'
        })
    }

    return errorEntry
  }

  handleValidationError(error, context) {
    const errorEntry = this.logError(error, {
      ...context,
      type: 'validation'
    })

    const errors = error.errors || error
    const errorMessages = this.formatValidationErrors(errors)

    this.showUserNotification({
      type: 'error',
      title: 'Validation Error',
      message: errorMessages.join('\n'),
      duration: 8000
    })

    return errorEntry
  }

  handleGenericError(error, context) {
    const errorEntry = this.logError(error, {
      ...context,
      type: 'generic'
    })

    this.showUserNotification({
      type: 'error',
      title: 'Error',
      message: error.message || 'An unexpected error occurred.'
    })

    return errorEntry
  }

  formatValidationErrors(errors) {
    if (Array.isArray(errors)) {
      return errors
    }

    if (typeof errors === 'object') {
      const messages = []
      for (const [field, fieldErrors] of Object.entries(errors)) {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach(error => {
            messages.push(`${fieldName} ${error}`)
          })
        } else {
          messages.push(`${fieldName} ${fieldErrors}`)
        }
      }
      return messages
    }

    return [String(errors)]
  }

  showUserNotification(options) {
    const {
      type = 'info',
      title = 'Notification',
      message = '',
      duration = 5000,
      action = null
    } = options

    // Try to use a notification system if available
    if (window.Bos?.NotificationManager) {
      window.Bos.NotificationManager.show({
        type,
        title,
        message,
        duration,
        action
      })
    } else {
      // Fallback to console and alert for critical errors
      console.warn(`[${type.toUpperCase()}] ${title}: ${message}`)
      
      if (type === 'error' && !this.isDevelopment()) {
        alert(`${title}\n\n${message}`)
      }
    }
  }

  // Subscribe to error events
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notifyListeners(errorEntry) {
    this.listeners.forEach(listener => {
      try {
        listener(errorEntry)
      } catch (e) {
        console.error('Error in error listener:', e)
      }
    })
  }

  // Get recent errors
  getRecentErrors(count = 10) {
    return this.errorLog.slice(0, count)
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = []
  }

  // Check if in development mode
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1'
  }

  // Create a wrapped function that catches and handles errors
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args)
      } catch (error) {
        this.handleError(error, {
          ...context,
          function: fn.name,
          arguments: args
        })
        throw error
      }
    }
  }

  // Create a wrapped event handler
  wrapEventHandler(fn, context = {}) {
    return (event) => {
      try {
        return fn(event)
      } catch (error) {
        this.handleError(error, {
          ...context,
          function: fn.name,
          event: {
            type: event.type,
            target: event.target?.tagName,
            currentTarget: event.currentTarget?.tagName
          }
        })
      }
    }
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler()

// Set up global error handlers
window.addEventListener('error', (event) => {
  errorHandler.logError(event.error || event, {
    type: 'uncaught',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.logError(event.reason, {
    type: 'unhandledRejection',
    promise: event.promise
  })
})