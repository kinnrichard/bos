// Task Creation Queue - Prevents race conditions and duplicate task creation
export class TaskCreationQueue {
  constructor() {
    this.queue = []
    this.processing = false
    this.pendingTasks = new Map() // Map of title -> promise
    this.createdTasks = new Set() // Set of created task titles (with timestamp)
  }

  // Add a task to the queue
  async enqueue(taskData, controller) {
    // Create a unique key for this task
    const taskKey = `${taskData.title}-${taskData.parent_id || 'root'}`
    
    // Check if we're already creating this exact task
    if (this.pendingTasks.has(taskKey)) {
      console.log('Task creation already in progress:', taskKey)
      return this.pendingTasks.get(taskKey)
    }
    
    // Check if we recently created this task (within 2 seconds)
    const recentKey = `${taskKey}-${Math.floor(Date.now() / 2000)}`
    if (this.createdTasks.has(recentKey)) {
      console.log('Task recently created, skipping:', taskKey)
      return Promise.resolve({ status: 'duplicate', message: 'Task recently created' })
    }
    
    // Create a promise for this task
    const taskPromise = new Promise((resolve, reject) => {
      this.queue.push({
        data: taskData,
        controller: controller,
        resolve: resolve,
        reject: reject,
        key: taskKey,
        recentKey: recentKey
      })
    })
    
    // Store the promise so other attempts can wait on it
    this.pendingTasks.set(taskKey, taskPromise)
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue()
    }
    
    return taskPromise
  }

  // Process the queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      
      try {
        // Create the task via API
        const response = await this.createTask(task.data, task.controller)
        
        // Mark as created
        this.createdTasks.add(task.recentKey)
        
        // Clean up old entries after 5 seconds
        setTimeout(() => {
          this.createdTasks.delete(task.recentKey)
        }, 5000)
        
        // Resolve the promise
        task.resolve(response)
      } catch (error) {
        // Reject the promise
        task.reject(error)
      } finally {
        // Remove from pending tasks
        this.pendingTasks.delete(task.key)
      }
      
      // Small delay between requests to avoid overwhelming the server
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    this.processing = false
  }

  // Create a task via API
  async createTask(taskData, controller) {
    const endpoint = `/clients/${controller.clientIdValue}/jobs/${controller.jobIdValue}/tasks`
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': controller.getCsrfToken(),
        'Accept': 'application/json'
      },
      body: JSON.stringify({ task: taskData })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create task' }))
      throw new Error(errorData.error || 'Failed to create task')
    }
    
    return await response.json()
  }

  // Clear the queue (for cleanup)
  clear() {
    // Reject all pending tasks
    while (this.queue.length > 0) {
      const task = this.queue.shift()
      task.reject(new Error('Queue cleared'))
    }
    
    // Clear all maps
    this.pendingTasks.clear()
    this.createdTasks.clear()
    this.processing = false
  }
}

// Create a singleton instance
export const taskCreationQueue = new TaskCreationQueue()