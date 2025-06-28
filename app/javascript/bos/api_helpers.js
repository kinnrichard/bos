// API request helper functions

export class ApiClient {
  constructor(controller) {
    this.controller = controller
  }

  getCsrfToken() {
    return document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || ""
  }

  // Static method for modules that need headers without a controller instance
  static headers() {
    return {
      'X-CSRF-Token': document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || "",
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  async makeRequest(endpoint, method = 'GET', data = null, options = {}) {
    const headers = {
      'X-CSRF-Token': this.getCsrfToken(),
      'Accept': 'application/json',
      ...options.headers
    }

    if (data && method !== 'GET') {
      headers['Content-Type'] = 'application/json'
    }

    const requestOptions = {
      method,
      headers,
      ...options
    }

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(endpoint, requestOptions)
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        error.response = response
        
        // Try to get error details from response
        try {
          const errorData = await response.json()
          error.data = errorData
          error.message = errorData.error || errorData.message || error.message
        } catch (e) {
          // Response wasn't JSON
        }
        
        // Use error handler if available
        const errorHandler = window.Bos?.errorHandler
        if (errorHandler) {
          errorHandler.handleError(error, {
            endpoint,
            method,
            data,
            response
          })
        }
        
        throw error
      }

      // Handle empty responses
      const text = await response.text()
      return text ? JSON.parse(text) : null
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const errorHandler = window.Bos?.errorHandler
        if (errorHandler) {
          errorHandler.handleNetworkError(error, {
            endpoint,
            method,
            data
          })
        }
      }
      
      console.error(`API request failed: ${method} ${endpoint}`, error)
      throw error
    }
  }

  // Convenience methods
  async get(endpoint, options) {
    return this.makeRequest(endpoint, 'GET', null, options)
  }

  async post(endpoint, data, options) {
    return this.makeRequest(endpoint, 'POST', data, options)
  }

  async patch(endpoint, data, options) {
    return this.makeRequest(endpoint, 'PATCH', data, options)
  }

  async put(endpoint, data, options) {
    return this.makeRequest(endpoint, 'PUT', data, options)
  }

  async delete(endpoint, options) {
    return this.makeRequest(endpoint, 'DELETE', null, options)
  }

  // Job-specific endpoints
  buildJobEndpoint(path = '') {
    const base = `/clients/${this.controller.clientIdValue}/jobs/${this.controller.jobIdValue}`
    return path ? `${base}/${path}` : base
  }

  buildTaskEndpoint(taskId, path = '') {
    const base = this.buildJobEndpoint(`tasks/${taskId}`)
    return path ? `${base}/${path}` : base
  }

  // Generic update method
  async updateResource(resourceType, resourceId, attribute, value) {
    const endpoint = resourceType === 'job' 
      ? this.buildJobEndpoint()
      : this.buildTaskEndpoint(resourceId)
    
    const data = { [resourceType]: { [attribute]: value } }
    return this.patch(endpoint, data)
  }

  // Batch operations
  async batchUpdate(resourceType, updates) {
    const endpoint = resourceType === 'job'
      ? this.buildJobEndpoint('batch_update')
      : this.buildJobEndpoint('tasks/batch_update')
    
    return this.patch(endpoint, updates)
  }
}