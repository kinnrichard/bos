// Centralized task initialization helper
// This ensures consistent setup for both server-rendered and client-created tasks

export class TaskInitializer {
  static initializeTaskElement(taskElement, options = {}) {
    const { taskId, application } = options
    
    if (!taskElement) {
      console.warn('TaskInitializer: No task element provided')
      return false
    }
    
    // Ensure required data attributes
    this.ensureDataAttributes(taskElement, taskId)
    
    // Initialize Stimulus controllers
    this.initializeStimulusControllers(taskElement, application)
    
    // Setup contenteditable elements
    this.setupContentEditable(taskElement, taskId)
    
    // Initialize dropdowns
    this.initializeDropdowns(taskElement)
    
    // Log success
    console.log('TaskInitializer: Initialized task element', taskId || taskElement.dataset.taskId)
    
    return true
  }
  
  static ensureDataAttributes(taskElement, taskId) {
    // Ensure task has required attributes for selection
    if (!taskElement.hasAttribute('data-job-target')) {
      taskElement.setAttribute('data-job-target', 'task')
    }
    
    // Ensure click handler
    const currentActions = taskElement.getAttribute('data-action') || ''
    if (!currentActions.includes('click->job#handleTaskClick')) {
      taskElement.setAttribute('data-action', currentActions + ' click->job#handleTaskClick')
    }
    
    // Ensure draggable
    if (!taskElement.hasAttribute('draggable')) {
      taskElement.setAttribute('draggable', 'true')
    }
    
    // Ensure task ID if provided
    if (taskId && !taskElement.hasAttribute('data-task-id')) {
      taskElement.setAttribute('data-task-id', taskId)
    }
  }
  
  static initializeStimulusControllers(taskElement, application) {
    if (!application) return
    
    // Force Stimulus to recognize the element
    taskElement.dispatchEvent(new CustomEvent('stimulus:connect', { bubbles: true }))
    
    // If element has controller attribute, ensure it's parsed
    const controllerAttribute = taskElement.getAttribute('data-controller')
    if (controllerAttribute) {
      // Trigger router reload to pick up new controllers
      application.router.reload()
    }
  }
  
  static setupContentEditable(taskElement, taskId) {
    const taskTitle = taskElement.querySelector('.task-title')
    if (!taskTitle) return
    
    // Make editable
    if (!taskTitle.hasAttribute('contenteditable')) {
      taskTitle.contentEditable = 'true'
    }
    
    // Setup event handlers
    const titleActions = [
      'focus->job#storeOriginalTitle',
      'blur->job#updateTaskTitle',
      'click->job#handleTaskTitleClick',
      'keydown->job#handleTaskTitleKeydown'
    ].join(' ')
    
    taskTitle.setAttribute('data-action', titleActions)
    
    // Set task ID if available
    if (taskId) {
      taskTitle.setAttribute('data-task-id', taskId)
    }
    
    // Store original title
    const originalTitle = taskTitle.textContent.trim()
    taskTitle.setAttribute('data-original-title', originalTitle)
  }
  
  static initializeDropdowns(taskElement) {
    const dropdowns = taskElement.querySelectorAll('[data-controller*="dropdown"]')
    
    dropdowns.forEach(dropdown => {
      // Ensure dropdown controller is set
      if (!dropdown.hasAttribute('data-controller')) {
        dropdown.setAttribute('data-controller', 'dropdown')
      }
      
      // Ensure positioning for dropdowns in scrollable containers
      if (!dropdown.hasAttribute('data-dropdown-positioning-value')) {
        dropdown.setAttribute('data-dropdown-positioning-value', 'fixed')
      }
      
      // Trigger connection
      dropdown.dispatchEvent(new CustomEvent('stimulus:connect', { bubbles: true }))
    })
  }
  
  // Helper to initialize all tasks in a container
  static initializeAllTasks(container, application) {
    const tasks = container.querySelectorAll('.task-item, .subtask-item')
    tasks.forEach(task => {
      this.initializeTaskElement(task, { application })
    })
  }
  
  // Helper to wait for element and then initialize
  static async waitAndInitialize(selector, options = {}) {
    const { timeout = 5000, application } = options
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const element = document.querySelector(selector)
        
        if (element) {
          clearInterval(checkInterval)
          this.initializeTaskElement(element, options)
          resolve(element)
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error(`Element ${selector} not found within ${timeout}ms`))
        }
      }, 100)
    })
  }
}

// Export as part of window.Bos for easy access
if (window.Bos) {
  window.Bos.TaskInitializer = TaskInitializer
}