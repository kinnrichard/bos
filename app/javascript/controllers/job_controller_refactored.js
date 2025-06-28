import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"

// Import Bos modules
const { taskStatusEmoji, taskStatusLabel, jobStatusEmoji, jobStatusLabel, jobPriorityEmoji, priorityLabel } = window.Bos?.Icons || {}
const { ApiClient } = window.Bos || {}
const { SafeDOM } = window.Bos || {}
const { StatusConverter } = window.Bos || {}
const { JobTaskManager } = window.Bos || {}
const { JobSelectionHandler } = window.Bos || {}
const { JobDragHandler } = window.Bos || {}
const { JobTimerManager } = window.Bos || {}
const { JobKeyboardHandler } = window.Bos || {}

export default class extends Controller {
  static targets = ["title", "statusBubble", "tasksContainer", "tasksList", 
                    "newTaskInput", "searchInput", "task", "taskTimer",
                    "subtasksContainer"]
  
  static values = { 
    jobId: Number,
    clientId: Number,
    status: String,
    priority: String
  }
  
  connect() {
    console.log("JobController connected")
    
    // Initialize managers
    this.taskManager = new JobTaskManager(this)
    this.selectionHandler = new JobSelectionHandler(this)
    this.dragHandler = new JobDragHandler(this)
    this.timerManager = new JobTimerManager(this)
    this.keyboardHandler = new JobKeyboardHandler(this, this.selectionHandler, this.taskManager)
    
    // Initialize API client
    this.api = new ApiClient(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`)
    
    // Set up event listeners
    this.setupEventListeners()
    
    // Start timers
    this.timerManager.startTimers()
    
    // Restore UI state
    this.restoreCollapsedState()
    this.highlightActiveStatus()
    this.highlightActivePriority()
    this.updateStatusBubble()
  }

  disconnect() {
    console.log("JobController disconnected")
    
    // Clean up
    this.timerManager.stopTimers()
    this.removeEventListeners()
  }

  setupEventListeners() {
    // Global keyboard shortcuts
    this.keydownHandler = (event) => this.keyboardHandler.handleKeydown(event)
    document.addEventListener('keydown', this.keydownHandler)
    
    // Click outside to clear selection
    this.outsideClickHandler = (event) => this.handleOutsideClick(event)
    document.addEventListener('click', this.outsideClickHandler)
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.keydownHandler)
    document.removeEventListener('click', this.outsideClickHandler)
  }

  // Task selection handlers
  handleTaskClick(event) {
    const taskElement = event.currentTarget
    this.selectionHandler.handleTaskClick(event, taskElement)
  }

  clearSelection() {
    this.selectionHandler.clearSelection()
  }

  selectAllTasks() {
    this.selectionHandler.selectAllTasks()
  }

  // Task management handlers
  showNewTaskInput() {
    this.taskManager.showNewTaskInput()
  }

  async handleNewTaskKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      const title = event.target.value.trim()
      
      if (title) {
        const selectedTask = this.element.querySelector('.task-item.selected')
        const parentId = selectedTask?.dataset.taskId || null
        
        await this.taskManager.createNewTask(title, parentId)
      }
      
      // Remove the input
      const wrapper = event.target.closest('.new-task-wrapper')
      if (wrapper) wrapper.remove()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      const wrapper = event.target.closest('.new-task-wrapper')
      if (wrapper) wrapper.remove()
    }
  }

  handleNewTaskBlur(event) {
    // Small delay to allow for clicks on other elements
    setTimeout(() => {
      if (!event.relatedTarget?.classList.contains('new-task-input')) {
        const wrapper = event.target.closest('.new-task-wrapper')
        if (wrapper) wrapper.remove()
      }
    }, 200)
  }

  // Drag and drop handlers
  handleDragStart(event) {
    this.dragHandler.handleDragStart(event)
  }

  handleDragOver(event) {
    this.dragHandler.handleDragOver(event)
  }

  handleDrop(event) {
    this.dragHandler.handleDrop(event)
  }

  handleDragEnd(event) {
    this.dragHandler.handleDragEnd(event)
  }

  // Job status/priority updates
  async updateStatus(event) {
    event.preventDefault()
    const button = event.currentTarget
    const newStatus = StatusConverter.forAPI(button.dataset.status)
    const dropdownContainer = button.closest('.dropdown-container')
    
    // Close dropdown
    const dropdownMenu = dropdownContainer?.querySelector('.dropdown-menu')
    if (dropdownMenu) {
      dropdownMenu.classList.add('hidden')
    }
    
    // Update UI optimistically
    this.updateStatusUI(newStatus)
    
    // Send to server
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
        method: 'PATCH',
        headers: ApiClient.headers(),
        body: JSON.stringify({
          job: { status: newStatus }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update status')
      }
      
      const data = await response.json()
      
      // Update with server response
      if (data.job) {
        this._statusValue = data.job.status
        this.updateStatusUI(data.job.status)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      // Revert on error
      this.updateStatusUI(this.statusValue)
    }
  }

  async updatePriority(event) {
    event.preventDefault()
    const newPriority = StatusConverter.forAPI(event.currentTarget.dataset.priority)
    const dropdownContainer = event.currentTarget.closest('.dropdown-container')
    
    // Close dropdown
    const dropdownMenu = dropdownContainer?.querySelector('.dropdown-menu')
    if (dropdownMenu) {
      dropdownMenu.classList.add('hidden')
    }
    
    // Update UI optimistically
    this.updatePriorityUI(newPriority)
    
    // Send to server
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
        method: 'PATCH',
        headers: ApiClient.headers(),
        body: JSON.stringify({
          job: { priority: newPriority }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update priority')
      }
      
      const data = await response.json()
      
      // Update with server response
      if (data.job) {
        this._priorityValue = data.job.priority
        this.updatePriorityUI(data.job.priority)
      }
    } catch (error) {
      console.error('Error updating priority:', error)
      // Revert on error
      this.updatePriorityUI(this.priorityValue)
    }
  }

  updateStatusUI(status) {
    // Update dropdown button
    const dropdownValue = this.element.querySelector('.status-dropdown .dropdown-value')
    if (dropdownValue && SafeDOM) {
      const content = SafeDOM.createDropdownContent(jobStatusEmoji(status), jobStatusLabel(status))
      SafeDOM.replaceChildren(dropdownValue, content)
    }
    
    // Update active states
    this.element.querySelectorAll('.status-option').forEach(opt => {
      opt.classList.toggle('active', StatusConverter.areEqual(opt.dataset.status, status))
    })
    
    this._statusValue = status
    this.updateStatusBubble()
  }

  updatePriorityUI(priority) {
    // Update dropdown button
    const dropdownValue = this.element.querySelector('.priority-dropdown .dropdown-value')
    if (dropdownValue && SafeDOM) {
      const emoji = jobPriorityEmoji(priority)
      const label = priorityLabel(priority)
      
      const content = emoji 
        ? [
            SafeDOM.element('span', { className: 'priority-emoji' }, [emoji]),
            SafeDOM.element('span', {}, [label])
          ]
        : [SafeDOM.element('span', {}, [label])]
      
      SafeDOM.replaceChildren(dropdownValue, content)
    }
    
    // Update active states
    this.element.querySelectorAll('.priority-option').forEach(opt => {
      opt.classList.toggle('active', StatusConverter.areEqual(opt.dataset.priority, priority))
    })
    
    this._priorityValue = priority
    this.updateStatusBubble()
  }

  updateStatusBubble() {
    if (!this.hasStatusBubbleTarget) return
    
    const emoji = jobStatusEmoji(this.statusValue)
    const label = jobStatusLabel(this.statusValue)
    
    if (SafeDOM) {
      SafeDOM.setTextContent(this.statusBubbleTarget, `${emoji} ${label}`)
    }
    
    // Update bubble classes
    this.statusBubbleTarget.className = `job-status-bubble status-${StatusConverter.forDataAttribute(this.statusValue)}`
  }

  highlightActiveStatus() {
    this.element.querySelectorAll(".status-option").forEach(btn => {
      btn.classList.toggle("active", StatusConverter.areEqual(btn.dataset.status, this.statusValue))
    })
  }

  highlightActivePriority() {
    this.element.querySelectorAll(".priority-option").forEach(btn => {
      btn.classList.toggle("active", StatusConverter.areEqual(btn.dataset.priority, this.priorityValue))
    })
  }

  // Task status updates
  async updateTaskStatus(event) {
    event.stopPropagation()
    const taskId = event.currentTarget.dataset.taskId
    const newStatus = StatusConverter.forAPI(event.currentTarget.dataset.status)
    const taskElement = event.target.closest(".task-item")
    
    // Use optimistic UI manager if available
    const optimisticUI = window.Bos?.optimisticUI
    if (optimisticUI) {
      try {
        // Apply optimistic updates for all UI elements
        await optimisticUI.batchUpdateWithRollback([
          {
            element: taskElement,
            changes: {
              'data-task-status': newStatus,
              className: taskElement.classList.contains('completed')
                ? taskElement.className.replace('completed', '')
                : StatusConverter.areEqual(newStatus, 'successfully_completed')
                  ? taskElement.className + ' completed'
                  : taskElement.className
            }
          },
          {
            element: taskElement.querySelector('.task-status-button span'),
            changes: {
              textContent: taskStatusEmoji(newStatus)
            }
          }
        ], async () => {
          // Perform the actual update
          const result = await this.taskManager.updateTaskStatus(taskId, newStatus, taskElement)
          
          // Update dropdown states after successful update
          taskElement.querySelectorAll(".task-status-option").forEach(opt => {
            opt.classList.toggle("active", StatusConverter.areEqual(opt.dataset.status, newStatus))
          })
          
          return result
        })
      } catch (error) {
        // Error is already handled by optimistic UI manager
        console.error('Task status update failed:', error)
      }
    } else {
      // Fallback to manual optimistic update
      const initialStatus = taskElement.dataset.taskStatus
      
      // Update UI optimistically
      this.updateTaskStatusUI(taskElement, newStatus)
      
      try {
        const result = await this.taskManager.updateTaskStatus(taskId, newStatus)
        
        // Update with server response if different
        if (result.task && !StatusConverter.areEqual(result.task.status, newStatus)) {
          this.updateTaskStatusUI(taskElement, result.task.status)
        }
      } catch (error) {
        console.error('Error updating task status:', error)
        // Revert on error
        this.updateTaskStatusUI(taskElement, initialStatus)
      }
    }
  }

  updateTaskStatusUI(taskElement, status) {
    // Update status button
    const statusButton = taskElement.querySelector(".task-status-button span")
    if (statusButton) {
      statusButton.textContent = taskStatusEmoji(status)
    }
    
    // Update data and classes
    taskElement.dataset.taskStatus = status
    taskElement.classList.toggle("completed", StatusConverter.areEqual(status, 'successfully_completed'))
    
    // Update dropdown options
    taskElement.querySelectorAll(".task-status-option").forEach(opt => {
      opt.classList.toggle("active", StatusConverter.areEqual(opt.dataset.status, status))
    })
  }

  // Task title editing
  async updateTaskTitle(event) {
    const taskElement = event.target.closest('.task-item')
    const taskId = taskElement.dataset.taskId
    const newTitle = event.target.textContent.trim()
    
    if (!newTitle) {
      // Handle empty title
      if (confirm('Delete this task?')) {
        await this.taskManager.deleteTask(taskId)
      } else {
        // Restore original title
        event.target.textContent = event.target.dataset.originalTitle || 'Untitled Task'
      }
      return
    }
    
    try {
      await this.taskManager.updateTaskTitle(taskElement, taskId, newTitle)
    } catch (error) {
      console.error('Error updating task title:', error)
      // Restore original title
      event.target.textContent = event.target.dataset.originalTitle || newTitle
    }
  }

  storeOriginalTitle(event) {
    event.target.dataset.originalTitle = event.target.textContent.trim()
  }

  handleTaskTitleEnter(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.target.blur()
    }
  }

  // Subtask toggling
  toggleSubtasks(event) {
    event.stopPropagation()
    const taskItem = event.currentTarget.closest('.task-item')
    const taskWrapper = taskItem.closest('.task-wrapper')
    const subtasksContainer = taskWrapper.querySelector('.subtasks')
    
    if (subtasksContainer) {
      const isCollapsed = taskItem.classList.toggle('collapsed')
      subtasksContainer.classList.toggle('hidden', isCollapsed)
      
      // Save state
      const taskId = taskItem.dataset.taskId
      const collapsedTasks = JSON.parse(localStorage.getItem('collapsedTasks') || '{}')
      
      if (isCollapsed) {
        collapsedTasks[taskId] = true
      } else {
        delete collapsedTasks[taskId]
      }
      
      localStorage.setItem('collapsedTasks', JSON.stringify(collapsedTasks))
    }
  }

  restoreCollapsedState() {
    const collapsedTasks = JSON.parse(localStorage.getItem('collapsedTasks') || '{}')
    
    Object.keys(collapsedTasks).forEach(taskId => {
      const taskItem = this.element.querySelector(`.task-item[data-task-id="${taskId}"]`)
      if (taskItem) {
        taskItem.classList.add('collapsed')
        const taskWrapper = taskItem.closest('.task-wrapper')
        const subtasks = taskWrapper?.querySelector('.subtasks')
        if (subtasks) {
          subtasks.classList.add('hidden')
        }
      }
    })
  }

  // Utility methods
  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.selectionHandler.clearSelection()
    }
  }

  getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content
  }
}