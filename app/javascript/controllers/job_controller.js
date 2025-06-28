import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"

// Get modules from window.Bos
const { taskStatusEmoji, jobStatusEmoji, jobPriorityEmoji, noteIconSVG, infoIconSVG } = window.Bos?.Icons || {}
const { ApiClient } = window.Bos || {}
const { SelectionManager } = window.Bos || {}
const { TaskRenderer } = window.Bos || {}
const { 
  ANIMATION, 
  POSITIONING, 
  KEYBOARD_SHORTCUTS, 
  TASK_STATUSES,
  JOB_STATUSES,
  PRIORITIES,
  CLASSES,
  DATA_ATTRS,
  STORAGE_KEYS,
  API_FIELDS,
  ERRORS
} = window.Bos?.Constants || {}

export default class extends Controller {
  static targets = ["title", "statusBubble", "popover", "tasksContainer", "tasksList", 
                    "newTaskPlaceholder", "newTaskText", "searchInput", "task", "taskTimer",
                    "scheduleButton", "schedulePopover", "subtasksContainer", "disclosureTriangle"]
  
  
  static values = { 
    jobId: Number,
    clientId: Number,
    status: String,
    priority: String
  }
  
  timerInterval = null
  clickTimer = null
  activeStatusDropdown = null
  
  // Track lock versions for optimistic locking
  taskLockVersions = new Map()
  jobLockVersion = null
  activeStatusTask = null
  lastClickedTask = null
  
  // Initialize helpers
  api = null
  selectionManager = null
  taskRenderer = null
  
  
  get jobIdValue() {
    return this._jobIdValue || this.getValueFromJobView('jobId')
  }
  
  get clientIdValue() {
    return this._clientIdValue || this.getValueFromJobView('clientId')
  }
  
  get statusValue() {
    return this._statusValue || this.getValueFromJobView('jobStatusValue')
  }
  
  set statusValue(value) {
    this._statusValue = value
  }
  
  get priorityValue() {
    return this._priorityValue || this.getValueFromJobView('jobPriorityValue')
  }
  
  set priorityValue(value) {
    this._priorityValue = value
  }
  
  getValueFromJobView(dataName) {
    const jobView = document.querySelector('.job-view')
    return jobView ? parseInt(jobView.dataset[dataName]) || jobView.dataset[dataName] : null
  }
  
  getCsrfToken() {
    const tokenElement = document.querySelector("[name='csrf-token']") || 
                        document.querySelector("meta[name='csrf-token']")
    return tokenElement ? tokenElement.content : ''
  }

  connect() {
    // Initialize helpers
    this.api = new ApiClient(this)
    this.selectionManager = new SelectionManager(this)
    this.taskRenderer = new TaskRenderer(this)
    
    // Clear any stale selections on connect
    this.selectionManager.clearAll()
    
    // Start timers for task time tracking
    this.startTimers()
    
    // Auto-focus new task if no tasks exist
    if (this.taskTargets.length === 0 && this.hasNewTaskPlaceholderTarget) {
      this.showNewTaskInput()
    }
    
    // Close popover when clicking outside
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.handleOutsideClick)
    
    // Handle keyboard navigation
    this.handleKeydown = this.handleKeydown.bind(this)
    // Use capture phase to intercept before browser default
    document.addEventListener("keydown", this.handleKeydown, true)
    
    // Listen for events from Sortable controller
    this.handleTaskReorder = this.handleTaskReorder.bind(this)
    this.handleTasksReorder = this.handleTasksReorder.bind(this)
    this.handleTaskParentChanged = this.handleTaskParentChanged.bind(this)
    this.element.addEventListener('task:reorder', this.handleTaskReorder)
    this.element.addEventListener('tasks:reorder', this.handleTasksReorder)
    this.element.addEventListener('task:parent-changed', this.handleTaskParentChanged)
    
    // Store controller reference for debugging
    if (this.element) {
      this.element._jobController = this
    }
    
    // Restore collapsed state of subtasks
    this.restoreCollapsedState()
    
    // Initialize lock versions for optimistic locking
    this.initializeLockVersions()
  }

  disconnect() {
    this.stopTimers()
    document.removeEventListener("click", this.handleOutsideClick)
    document.removeEventListener("keydown", this.handleKeydown, true)
    this.element.removeEventListener('task:reorder', this.handleTaskReorder)
    this.element.removeEventListener('tasks:reorder', this.handleTasksReorder)
    this.element.removeEventListener('task:parent-changed', this.handleTaskParentChanged)
    
    if (this.element && this.element._jobController === this) {
      delete this.element._jobController
    }
  }
  
  // Show task info panel
  async showTaskInfo(event) {
    event.stopPropagation()
    const button = event.currentTarget
    const taskId = button.dataset.taskId
    
    // Check if popover already exists for this task
    let popover = document.querySelector(`.task-info-popover[data-task-info-task-id-value="${taskId}"]`)
    
    if (popover) {
      // Popover exists, toggle it
      const controller = this.application.getControllerForElementAndIdentifier(popover, 'task-info')
      if (controller) {
        controller.toggleWithTrigger(button)
      }
      return
    }
    
    try {
      // Fetch task details with all associations
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}/details`, {
        headers: {
          'Accept': 'text/html',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        
        // Add new popover
        document.body.insertAdjacentHTML('beforeend', html)
        
        // Get the popover and show it with trigger
        requestAnimationFrame(() => {
          popover = document.querySelector(`.task-info-popover[data-task-info-task-id-value="${taskId}"]`)
          if (popover) {
            const controller = this.application.getControllerForElementAndIdentifier(popover, 'task-info')
            if (controller) {
              controller.showWithTrigger(button)
            }
          }
        })
      }
    } catch (error) {
      console.error('Error loading task info:', error)
    }
  }

  handleOutsideClick(event) {
    // Handle job popover
    const popover = document.querySelector('.job-popover')
    const statusBubble = document.querySelector('.status-bubble')
    if (popover && !popover.contains(event.target) && 
        statusBubble && !statusBubble.contains(event.target)) {
      popover.classList.add("hidden")
    }
    
    // Handle task status dropdowns
    if (!event.target.closest('.task-status-container')) {
      document.querySelectorAll('.task-status-dropdown').forEach(dropdown => {
        dropdown.classList.add("hidden")
      })
      // Close active dropdown if any
      if (this.activeStatusDropdown) {
        this.closeStatusMenu()
      }
    }
    
    // Clear selection if clicking outside tasks
    if (!event.target.closest('.task-item') && 
        !event.metaKey && !event.ctrlKey) {
      this.clearSelection()
    }
  }
  
  // Task title click handling - handle selection if cmd/shift held
  handleTaskTitleClick(event) {
    const taskElement = event.currentTarget.closest('.task-item')
    const titleElement = event.currentTarget
    
    // If cmd/shift held, handle selection instead of just focusing
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      // Prevent contenteditable from taking focus
      event.preventDefault()
      // Stop event from bubbling to task click handler
      event.stopPropagation()
      
      // Handle selection logic directly
      if (event.metaKey || event.ctrlKey) {
        // Toggle selection with Cmd/Ctrl
        this.toggleTaskSelection(taskElement)
      } else if (event.shiftKey && this.lastClickedTask) {
        // Range select with Shift
        this.selectTaskRange(this.lastClickedTask, taskElement)
      }
      
      this.lastClickedTask = taskElement
      return
    }
    
    // Stop event from bubbling to task click handler
    event.stopPropagation()
    
    // Make the element editable before focusing
    titleElement.contentEditable = 'true'
    
    // Focus will be handled by the browser's contenteditable behavior
    // The focus event handler will clear selection when contenteditable gets focus
  }
  
  // Task selection and renaming
  handleTaskClick(event) {
    const taskElement = event.currentTarget
    
    // Don't handle clicks on interactive elements
    if (event.target.closest('.task-status-container') || 
        event.target.closest('.add-subtask-button') ||
        event.target.closest('.disclosure-triangle') ||
        event.target.closest('input')) {
      return
    }
    
    // Don't handle clicks on task title text (handled separately)
    if (event.target.closest('.task-title')) {
      return
    }
    
    // Prevent text selection on shift-click
    if (event.shiftKey) {
      event.preventDefault()
    }
    
    // Handle selection
    this.selectionManager.handleClick(taskElement, event)
  }
  
  // Selection methods delegated to SelectionManager
  selectTask(taskElement) {
    this.selectionManager.select(taskElement)
  }
  
  deselectTask(taskElement) {
    this.selectionManager.deselect(taskElement)
  }
  
  toggleTaskSelection(taskElement) {
    this.selectionManager.toggle(taskElement)
  }
  
  clearSelection() {
    this.selectionManager.clearAll()
  }
  
  selectTaskRange(fromTask, toTask) {
    this.selectionManager.selectRange(fromTask, toTask)
  }
  
  selectAllTasks() {
    this.selectionManager.selectAll()
  }
  
  selectAllTasks() {
    const allTasks = document.querySelectorAll('.task-item:not(.new-task)')
    this.clearSelection()
    allTasks.forEach(task => this.selectTask(task))
  }
  
  // Keyboard navigation
  handleKeydown(event) {
    // Check if we're in an input field or contenteditable element
    const activeElement = document.activeElement
    const isInputField = activeElement.tagName === 'INPUT' || 
                        activeElement.tagName === 'TEXTAREA' || 
                        activeElement.isContentEditable
    
    // Handle status menu navigation if open - MUST BE FIRST
    if (this.activeStatusDropdown) {
      // Stop all events from bubbling when dropdown is open
      event.stopPropagation()
      event.stopImmediatePropagation()
      this.handleStatusMenuKeyboard(event)
      return false
    }
    
    // Arrow key navigation (only when not in input field and no status menu open)
    if (!isInputField && !this.activeStatusDropdown && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      this.handleArrowNavigation(event.key === 'ArrowUp' ? 'up' : 'down')
      return false
    }
    
    // Escape key handling
    if (event.key === 'Escape') {
      // If we're in a contenteditable element, revert changes and blur
      if (activeElement.isContentEditable) {
        event.preventDefault()
        const originalTitle = activeElement.dataset.originalTitle
        if (originalTitle !== undefined) {
          activeElement.textContent = originalTitle
        }
        activeElement.blur()
        return false
      }
      // Otherwise, deselect all tasks (only when not in input field)
      else if (!isInputField && this.selectionManager.hasSelection()) {
        event.preventDefault()
        this.clearSelection()
        return false
      }
    }
    
    // Return key to create new task (only when not in input field and no task selected)
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.altKey && !isInputField) {
      // Only create new task if no tasks are selected (otherwise Enter renames)
      if (this.selectionManager.selectedTasks.size === 0) {
        event.preventDefault()
        this.showNewTaskInput()
        return false
      }
    }
    
    // Select all with Cmd/Ctrl+A
    if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && 
          activeElement.tagName !== 'TEXTAREA' && 
          !activeElement.isContentEditable) {
        event.preventDefault()
        this.selectAllTasks()
      }
    }
    
    // Spacebar to open status menu
    if (event.key === ' ' && this.selectionManager.hasSelection() && this.selectionManager.selectedTasks.size === 1 && !isInputField) {
      event.preventDefault()
      this.openStatusMenuForSelectedTask()
      return false
    }
    
    
    // Status change shortcuts (Cmd+Shift+...)
    if (event.metaKey && event.shiftKey && this.selectionManager.hasSelection()) {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        const newStatus = KEYBOARD_SHORTCUTS.STATUS[event.key.toLowerCase()]
        
        if (newStatus) {
          event.preventDefault()
          this.updateSelectedTasksStatus(newStatus)
          return false
        }
      }
    }
    
    // Delete selected tasks
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectionManager.selectedTasks.size > 0) {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        event.preventDefault()
        this.deleteSelectedTasks()
      }
    }
    
    // Enter to create new task below selected task
    if (event.key === 'Enter' && this.selectionManager.selectedTasks.size === 1 && !isInputField) {
      event.preventDefault()
      const selectedTask = Array.from(this.selectionManager.selectedTasks)[0]
      this.createNewTaskBelow(selectedTask)
      return false
    }
    
    // Remove duplicate arrow key handler - already handled above
  }
  
  // checkDeletePermission moved from old rename code
  checkDeletePermission() {
    // TODO: Check actual user permissions
    // For now, assume admin/owner can delete
    const currentUser = document.querySelector('[data-current-user-role]')
    const role = currentUser?.dataset.currentUserRole
    return role === 'admin' || role === 'owner'
  }
  
  deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return
    this.deleteTaskWithoutConfirm(taskId)
  }
  
  deleteTaskWithoutConfirm(taskId) {
    // Store reference to task element
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
    
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": this.getCsrfToken(),
        "Accept": "application/json"
      }
    }).then(response => {
      // Check if response is ok (2xx status)
      if (response.ok || response.status === 204) {
        // Task deleted successfully (204 No Content is common for DELETE)
        // Find the task wrapper to remove (handles both tasks and subtasks)
        const wrapper = taskElement.closest('.task-wrapper') || taskElement
        
        // Remove from selection if selected
        if (this.selectionManager.selectedTasks.has(taskElement)) {
          this.selectionManager.selectedTasks.delete(taskElement)
        }
        
        // Animate removal
        wrapper.style.transition = `opacity ${ANIMATION.BLUR_DELAY}ms ease-out`
        wrapper.style.opacity = '0'
        
        setTimeout(() => {
          wrapper.remove()
          
          // Check if tasks list is now empty
          const remainingTasks = document.querySelectorAll('.task-item')
          if (remainingTasks.length === 0) {
            const tasksList = document.querySelector('[data-job-target="tasksList"]')
            if (tasksList) {
              tasksList.innerHTML = '<div class="empty-tasks"><p>No tasks yet. Click + to add a task.</p></div>'
            }
          }
        }, ANIMATION.BLUR_DELAY)
      } else if (response.status === 404) {
        // Task might already be deleted, remove from UI anyway
        console.warn('Task not found on server, removing from UI')
        const wrapper = taskElement.closest('.task-wrapper') || taskElement
        if (wrapper) {
          wrapper.remove()
        }
      } else {
        // Try to parse JSON error message if available
        response.text().then(text => {
          try {
            const data = JSON.parse(text)
            alert(data.error || 'Failed to delete task')
          } catch (e) {
            alert('Failed to delete task')
          }
        })
      }
    })
    .catch(error => {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    })
  }
  
  deleteSelectedTasks() {
    const count = this.selectionManager.selectedTasks.size
    if (count === 0) return
    
    const hasDeletePermission = this.checkDeletePermission()
    let message
    
    if (hasDeletePermission) {
      message = count === 1 
        ? "Are you sure you want to delete this task?" 
        : `Are you sure you want to delete ${count} tasks?`
    } else {
      message = count === 1
        ? "Are you sure you want to cancel this task?"
        : `Are you sure you want to cancel ${count} tasks?`
    }
    
    if (confirm(message)) {
      // Convert Set to Array to avoid modification during iteration
      const tasksToProcess = Array.from(this.selectionManager.selectedTasks)
      
      tasksToProcess.forEach(taskElement => {
        const taskId = taskElement.dataset.taskId
        if (hasDeletePermission) {
          this.deleteTaskWithoutConfirm(taskId)
        } else {
          this.cancelTask(taskId)
        }
      })
    }
  }
  
  cancelTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
    
    
    // Update status to cancelled
    const statusUpdate = { task: { status: 'cancelled' } }
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify(statusUpdate)
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Update UI immediately
          taskElement.dataset.taskStatus = 'cancelled'
          
          // Update status button
          const statusButton = taskElement.querySelector('.task-status-button span')
          if (statusButton) {
            statusButton.textContent = taskStatusEmoji('cancelled')
          }
          
          // Clear selection if task was selected
          if (this.selectionManager.selectedTasks.has(taskElement)) {
            this.deselectTask(taskElement)
          }
        } else {
          alert(data.error || 'Failed to cancel task')
        }
      })
      .catch(error => {
        console.error('Error cancelling task:', error)
        alert('Failed to cancel task')
      })
  }

  get titleTarget() {
    return document.querySelector('[data-job-target="title"]')
  }
  
  get newTaskPlaceholderTarget() {
    return document.querySelector('[data-job-target="newTaskPlaceholder"]')
  }
  
  get newTaskTextTarget() {
    return document.querySelector('[data-job-target="newTaskText"]')
  }
  
  get tasksListTarget() {
    return document.querySelector('[data-job-target="tasksList"]')
  }
  
  get taskTargets() {
    return Array.from(document.querySelectorAll('[data-job-target="task"]'))
  }

  // Title editing
  handleTitleEnter(event) {
    event.preventDefault()
    event.target.blur()
  }
  
  updateTitle(event) {
    const newTitle = event.target.textContent.trim()
    if (!newTitle) {
      const placeholder = event.target.dataset.placeholder || "Untitled Job"
      event.target.textContent = placeholder
      return
    }

    // Update via API
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ job: { title: newTitle } })
    })
  }

  // Popover
  togglePopover(event) {
    event.stopPropagation()
    const popover = document.querySelector('.job-popover')
    if (popover) {
      popover.classList.toggle("hidden")
    }
  }
  
  // Schedule Popover
  toggleSchedulePopover(event) {
    console.log('toggleSchedulePopover called')
    event.stopPropagation()
    console.log('hasSchedulePopoverTarget:', this.hasSchedulePopoverTarget)
    
    if (this.hasSchedulePopoverTarget) {
      console.log('Toggling schedule popover')
      this.schedulePopoverTarget.classList.toggle("hidden")
      
      // Close other popovers
      const jobPopover = document.querySelector('.job-popover:not(.schedule-popover)')
      if (jobPopover && !jobPopover.classList.contains('hidden')) {
        jobPopover.classList.add('hidden')
      }
    } else {
      console.log('No schedule popover target found')
      // Fallback: try to find it manually
      const schedulePopover = document.querySelector('[data-job-target="schedulePopover"]')
      if (schedulePopover) {
        console.log('Found popover manually, toggling')
        schedulePopover.classList.toggle("hidden")
      }
    }
  }

  // Status updates
  updateStatus(event) {
    event.preventDefault()
    const newStatus = event.currentTarget.dataset.status
    const dropdownContainer = event.currentTarget.closest('.dropdown-container')
    
    // Close the dropdown immediately
    const dropdownMenu = dropdownContainer?.querySelector('.dropdown-menu')
    if (dropdownMenu) {
      dropdownMenu.classList.add('hidden')
    }
    
    // Update the dropdown button text immediately
    
    const dropdownValue = dropdownContainer?.querySelector('.dropdown-value')
    if (dropdownValue) {
      dropdownValue.innerHTML = `
        <span class="status-emoji">${taskStatusEmoji(newStatus)}</span>
        <span>${newStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
      `
    }
    
    // Update active states
    dropdownContainer?.querySelectorAll('.status-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.status === newStatus)
    })
    
    // Update the internal status value IMMEDIATELY before server call
    this._statusValue = newStatus
    this.updateStatusBubble()
    
    // Update the server
    this.api.updateResource('job', this.jobIdValue, 'status', newStatus)
      .then(data => {
        // Status already updated above
      })
      .catch(error => {
        console.error('Failed to update status:', error)
        // Optionally revert the optimistic update
      })
  }

  updatePriority(event) {
    event.preventDefault()
    const newPriority = event.currentTarget.dataset.priority
    const dropdownContainer = event.currentTarget.closest('.dropdown-container')
    
    // Close the dropdown immediately
    const dropdownMenu = dropdownContainer?.querySelector('.dropdown-menu')
    if (dropdownMenu) {
      dropdownMenu.classList.add('hidden')
    }
    
    // Update the dropdown button text immediately
    
    const dropdownValue = dropdownContainer?.querySelector('.dropdown-value')
    if (dropdownValue) {
      const emoji = jobPriorityEmoji(newPriority)
      const label = newPriority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      dropdownValue.innerHTML = emoji ? 
        `<span class="priority-emoji">${emoji}</span><span>${label}</span>` :
        `<span>${label}</span>`
    }
    
    // Update active states
    dropdownContainer?.querySelectorAll('.priority-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.priority === newPriority)
    })
    
    // Update the internal priority value IMMEDIATELY before server call
    this._priorityValue = newPriority
    this.updateStatusBubble()
    
    // Update the server
    this.api.updateResource('job', this.jobIdValue, 'priority', newPriority)
      .then(data => {
        // Priority already updated above
      })
      .catch(error => {
        console.error('Failed to update priority:', error)
        // Optionally revert the optimistic update
      })
  }

  updateStatusBubble() {
    // Update the status bubble in the toolbar
    const statusBubble = document.querySelector('.job-status-bubble')
    if (!statusBubble) {
      console.error('Status bubble not found')
      return
    }
    
    // Clear existing content
    statusBubble.innerHTML = ''
    
    // Add status icon
    const currentStatus = this.statusValue || this.getValueFromJobView('jobStatusValue')
    const statusIcon = document.createElement('span')
    statusIcon.className = 'bubble-icon status-icon'
    statusIcon.textContent = jobStatusEmoji(currentStatus)
    statusBubble.appendChild(statusIcon)
    
    // Add assignee icon
    const assigneeIcon = document.createElement('span')
    assigneeIcon.className = 'bubble-icon assignee-icon'
    
    // Get current assignees from the dropdown
    const assignedTechs = document.querySelectorAll('.assignee-option.active[data-technician-id]')
    if (assignedTechs.length > 0) {
      // Show first technician's icon
      const firstTechIcon = assignedTechs[0].querySelector('span:first-child')
      if (firstTechIcon) {
        assigneeIcon.innerHTML = firstTechIcon.outerHTML
      }
    } else {
      assigneeIcon.textContent = '❓'
    }
    statusBubble.appendChild(assigneeIcon)
    
    // Add priority icon if not normal
    const currentPriority = this.priorityValue || this.getValueFromJobView('jobPriorityValue')
    if (currentPriority && currentPriority !== 'normal') {
      const priorityEmojis = {
        'critical': '🔥',
        'high': '❗',
        'low': '➖',
        'proactive_followup': '💬'
      }
      const priorityIcon = priorityEmojis[currentPriority]
      if (priorityIcon) {
        const span = document.createElement('span')
        span.className = 'bubble-icon priority-icon'
        span.textContent = priorityIcon
        statusBubble.appendChild(span)
      }
    }
  }
  
  setUnassigned(event) {
    event.preventDefault()
    const dropdownContainer = event.currentTarget.closest('.dropdown-container')
    
    // Update the dropdown button text immediately
    const dropdownValue = dropdownContainer?.querySelector('.dropdown-value')
    if (dropdownValue) {
      dropdownValue.innerHTML = '<span>❓</span><span>Unassigned</span>'
    }
    
    // Remove active from all technician options
    dropdownContainer?.querySelectorAll('.assignee-option[data-technician-id]').forEach(opt => {
      opt.classList.remove('active')
      const checkmark = opt.querySelector('.checkmark')
      if (checkmark) checkmark.remove()
    })
    
    // Add active to Unassigned
    event.currentTarget.classList.add('active')
    
    // Close the dropdown
    const dropdownMenu = dropdownContainer?.querySelector('.dropdown-menu')
    if (dropdownMenu) {
      dropdownMenu.classList.add('hidden')
    }
    
    // Update status bubble immediately
    this.updateStatusBubble()
    
    // Update the server
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ job: { technician_ids: [] } })
    }).then(response => response.json())
      .then(data => {
        // Already updated above
      })
  }
  
  toggleAssignee(event) {
    event.preventDefault()
    const technicianId = event.currentTarget.dataset.technicianId
    const dropdownContainer = event.currentTarget.closest('.dropdown-container')
    
    // Toggle active state immediately
    event.currentTarget.classList.toggle('active')
    
    // If we're selecting a technician (activating), remove active from Unassigned
    if (event.currentTarget.classList.contains('active')) {
      const unassignedOption = dropdownContainer.querySelector('.assignee-option[data-action*="setUnassigned"]')
      if (unassignedOption) {
        unassignedOption.classList.remove('active')
      }
    }
    
    // Get current technician IDs after toggling
    const currentTechIds = Array.from(dropdownContainer.querySelectorAll('.assignee-option.active'))
      .map(el => el.dataset.technicianId)
      .filter(id => id) // Remove undefined values
    
    // Update the dropdown button text immediately
    const selectedTechs = Array.from(dropdownContainer.querySelectorAll('.assignee-option.active'))
      .filter(opt => opt.dataset.technicianId) // Exclude unassigned option
      .map(opt => opt.querySelector('span:nth-child(2)').textContent)
    
    const dropdownValue = dropdownContainer?.querySelector('.dropdown-value')
    if (dropdownValue) {
      if (selectedTechs.length === 0) {
        dropdownValue.innerHTML = '<span>❓</span><span>Unassigned</span>'
      } else if (selectedTechs.length === 1) {
        // Get the icon HTML from the selected option
        const selectedOption = dropdownContainer.querySelector('.assignee-option.active[data-technician-id]')
        const iconHtml = selectedOption?.querySelector('span:first-child')?.outerHTML || ''
        dropdownValue.innerHTML = `${iconHtml}<span>${selectedTechs[0]}</span>`
      } else {
        dropdownValue.innerHTML = `<span>${selectedTechs.length} assigned</span>`
      }
    }
    
    // Update checkmarks immediately
    const checkmark = event.currentTarget.querySelector('.checkmark')
    if (event.currentTarget.classList.contains('active')) {
      if (!checkmark) {
        event.currentTarget.insertAdjacentHTML('beforeend', '<span class="checkmark">✓</span>')
      }
    } else {
      if (checkmark) {
        checkmark.remove()
      }
    }
    
    // Don't close dropdown for assignee multi-select - keep it open
    
    // Update status bubble immediately
    this.updateStatusBubble()
    
    // Update the server
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ job: { technician_ids: currentTechIds } })
    }).then(response => response.json())
      .then(data => {
        // Already updated above
      })
  }

  highlightActiveStatus() {
    this.element.querySelectorAll(".status-option").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.status === this.statusValue)
    })
  }

  highlightActivePriority() {
    this.element.querySelectorAll(".priority-option").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.priority === this.priorityValue)
    })
  }

  // Store original title on focus for comparison later
  storeOriginalTitle(event) {
    const titleElement = event.currentTarget
    // Store the current content as original if not already stored
    if (!titleElement.dataset.originalTitle) {
      titleElement.dataset.originalTitle = titleElement.textContent.trim()
    }
    
    // Clear all selections when entering edit mode
    this.clearSelection()
  }

  // Update task title on blur (contenteditable)
  updateTaskTitle(event) {
    const titleElement = event.currentTarget
    const taskElement = titleElement.closest('.task-item')
    const taskId = titleElement.dataset.taskId
    const newTitle = titleElement.textContent.trim()
    
    // Set contenteditable back to false
    titleElement.contentEditable = 'false'
    
    // Get original title from the element's data
    const originalTitle = titleElement.dataset.originalTitle || ''
    
    // If title is empty, handle deletion
    if (newTitle === '') {
      titleElement.textContent = originalTitle // Restore original text
      this.handleEmptyTaskRename(taskElement, taskId)
      return
    }
    
    // If title hasn't changed, just update the stored original
    if (newTitle === originalTitle) {
      titleElement.dataset.originalTitle = newTitle
      return
    }
    
    // Save the new title
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ task: { title: newTitle } })
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Update the stored original title on success
          titleElement.dataset.originalTitle = newTitle
        } else {
          alert(data.error || 'Failed to rename task')
          titleElement.textContent = originalTitle // Restore on error
          titleElement.dataset.originalTitle = originalTitle
        }
      })
      .catch(error => {
        console.error('Error renaming task:', error)
        titleElement.textContent = originalTitle // Restore on error
        titleElement.dataset.originalTitle = originalTitle
      })
  }

  // Handle keydown events on task titles
  handleTaskTitleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault() // Prevent line break in contenteditable
      event.currentTarget.blur() // Trigger blur to save the title
    } else if (event.key === 'Escape') {
      event.preventDefault()
      const titleElement = event.currentTarget
      const originalTitle = titleElement.dataset.originalTitle || ''
      titleElement.textContent = originalTitle // Restore original text
      titleElement.blur() // Exit edit mode
    }
  }

  handleEmptyTaskRename(taskElement, taskId) {
    const hasDeletePermission = this.checkDeletePermission()
    
    const message = hasDeletePermission 
      ? "Are you sure you want to delete this task?" 
      : "Are you sure you want to cancel this task?"
    
    if (confirm(message)) {
      if (hasDeletePermission) {
        this.deleteTaskWithoutConfirm(taskId)
      } else {
        this.cancelTask(taskId)
      }
    }
  }

  // Task management
  showNewTaskInput() {
    // Clear any selection
    this.clearSelection()
    
    // Don't remove empty tasks message - it should stay until task is saved
    
    // Transform the placeholder into contenteditable
    const placeholder = this.newTaskPlaceholderTarget
    if (!placeholder) return
    
    // Find the task-title div and make it editable
    const taskTitle = placeholder.querySelector('.task-title')
    if (!taskTitle) return
    
    // Set up the contenteditable with proper event handlers
    taskTitle.dataset.action = 'blur->job#saveNewTaskFromContentEditable keydown->job#handleNewTaskKeydown'
    taskTitle.dataset.originalTitle = ''
    
    // Make it editable
    taskTitle.contentEditable = 'true'
    
    // Focus the contenteditable div
    taskTitle.focus()
    
    // Store reference for later use
    this.currentNewTaskElement = taskTitle
    
    // Remove click handler temporarily from the parent
    placeholder.dataset.action = ''
  }
  
  
  handleTasksContainerClick(event) {
    // Only proceed if clicked on the container itself or empty space
    // Not on a task or other interactive element
    if (event.target === event.currentTarget || 
        event.target.classList.contains('tasks-list') ||
        event.target.classList.contains('tasks-container')) {
      
      // Find the new task field and focus it
      const newTaskField = this.newTaskTextTarget
      if (newTaskField && newTaskField.contentEditable === 'true') {
        newTaskField.focus()
        // The focus event will trigger clearNewTaskPlaceholder
      }
    }
  }
  

  cancelNewTask(event) {
    // Restore the placeholder
    const placeholder = this.newTaskPlaceholderTarget
    if (placeholder && this.currentNewTaskElement) {
      const taskTitle = this.currentNewTaskElement
      
      // Clear content and handlers
      taskTitle.textContent = ''
      taskTitle.dataset.action = ''
      taskTitle.blur()
      
      // Restore click handler on the parent
      placeholder.dataset.action = 'click->job#showNewTaskInput'
      
      this.currentNewTaskElement = null
    }
    
    // Don't add empty message here - the ListComponent handles it
  }
  
  createNewTaskBelow(selectedTask) {
    // Clear selection
    this.clearSelection()
    
    // Check if this is a subtask (has a parent)
    const isSubtask = selectedTask.dataset.parentId
    const parentId = isSubtask ? selectedTask.dataset.parentId : null
    
    // Create a new task element that matches the existing task structure
    const newTaskWrapper = document.createElement('div')
    newTaskWrapper.className = 'task-wrapper'
    
    const newTaskItem = document.createElement('div')
    newTaskItem.className = 'task-item new-inline-task'
    newTaskItem.dataset.jobTarget = 'task'
    newTaskItem.dataset.action = 'click->job#handleTaskClick'
    if (parentId) {
      newTaskItem.dataset.parentId = parentId
    }
    
    // Status button container
    const statusContainer = document.createElement('div')
    statusContainer.className = 'task-status-container'
    
    const statusButton = document.createElement('button')
    statusButton.className = 'task-status-button'
    statusButton.dataset.action = 'click->job#toggleTaskStatus'
    statusButton.innerHTML = `<span>${taskStatusEmoji('new_task')}</span>`
    statusContainer.appendChild(statusButton)
    
    // Task content
    const taskContent = document.createElement('div')
    taskContent.className = 'task-content'
    
    const taskTitle = document.createElement('div')
    taskTitle.className = 'task-title'
    taskTitle.contentEditable = 'true'
    taskTitle.dataset.action = 'focus->job#storeOriginalTitle blur->job#saveNewInlineTask keydown->job#handleNewTaskKeydown'
    taskTitle.dataset.originalTitle = ''
    if (parentId) {
      taskTitle.dataset.parentId = parentId
    }
    taskContent.appendChild(taskTitle)
    
    // Assemble the task
    newTaskItem.appendChild(statusContainer)
    newTaskItem.appendChild(taskContent)
    newTaskWrapper.appendChild(newTaskItem)
    
    // Insert after the selected task
    const selectedWrapper = selectedTask.closest('.task-wrapper')
    if (selectedWrapper && selectedWrapper.nextSibling) {
      selectedWrapper.parentNode.insertBefore(newTaskWrapper, selectedWrapper.nextSibling)
    } else if (selectedWrapper) {
      selectedWrapper.parentNode.appendChild(newTaskWrapper)
    }
    
    // Focus the new task title for immediate editing
    taskTitle.focus()
  }
  
  async saveNewInlineTask(event) {
    const titleElement = event.currentTarget
    const newTitle = titleElement.textContent.trim()
    
    // If empty, remove the task element
    if (newTitle === '') {
      const taskWrapper = titleElement.closest('.task-wrapper')
      if (taskWrapper) {
        taskWrapper.remove()
      }
      return
    }
    
    // Create the task via API
    const formData = new FormData()
    formData.append('task[title]', newTitle)
    formData.append('task[job_id]', this.jobIdValue)
    formData.append('task[status]', 'new_task')
    
    // Add parent_id if this is a subtask
    const parentId = titleElement.dataset.parentId
    if (parentId) {
      formData.append('task[parent_id]', parentId)
    }
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': this.getCsrfToken(),
          'Accept': 'application/json'
        },
        body: formData
      })
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Task created response:', responseData)
        
        // The response might wrap the task in a data object
        const task = responseData.task || responseData
        
        // Insert the new task before the NEW TASK placeholder
        const taskWrapper = titleElement.closest('.task-wrapper')
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = this.createTaskHtml(task)
        const newTaskElement = tempDiv.firstElementChild
        
        if (taskWrapper && newTaskElement) {
          // Insert the new task before the placeholder
          taskWrapper.parentElement.insertBefore(newTaskElement, taskWrapper)
          
          // Reset the NEW TASK placeholder to its original state
          titleElement.textContent = 'New task...'
          titleElement.blur()
          
          // Remove the temporary inline task wrapper if it's not the main placeholder
          if (!taskWrapper.classList.contains('new-task-wrapper')) {
            taskWrapper.remove()
          }
          
          // Reinitialize Sortable if needed
          if (this.hasSortableTarget && this.sortableTarget) {
            const sortableController = this.application.getControllerForElementAndIdentifier(
              this.sortableTarget, 
              'sortable'
            )
            if (sortableController && sortableController.initializeSortable) {
              sortableController.initializeSortable()
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating task:', error)
      // Show error to user
      alert('Failed to create task. Please try again.')
    }
  }
  
  handleNewTaskKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      // Check if this is the main NEW TASK placeholder
      const taskWrapper = event.currentTarget.closest('.task-wrapper')
      if (taskWrapper && taskWrapper.classList.contains('new-task-wrapper')) {
        // It's the main placeholder, just cancel
        this.cancelNewTask()
      } else {
        // It's an inline new task, remove it
        taskWrapper.remove()
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur() // This will trigger the save
    }
  }
  
  async saveNewTaskFromContentEditable(event) {
    const titleElement = event.currentTarget
    const newTitle = titleElement.textContent.trim()
    
    // Set contenteditable back to false
    titleElement.contentEditable = 'false'
    
    // If empty, cancel the new task
    if (newTitle === '') {
      this.cancelNewTask()
      return
    }
    
    // Create the task
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCsrfToken()
        },
        body: JSON.stringify({ task: { title: newTitle, status: 'new_task' } })
      })
      
      const data = await response.json()
      
      if (data.status === 'success') {
        // Remove empty tasks message if present
        const emptyMessage = this.tasksListTarget.querySelector('.empty-tasks')
        if (emptyMessage) {
          emptyMessage.remove()
        }
        
        // Get the tasks container
        const tasksContainer = this.tasksListTarget
        
        // Create task element HTML
        const newTaskHtml = this.createTaskHtml(data.task)
        
        // Find the NEW TASK placeholder
        const newTaskPlaceholder = tasksContainer.querySelector('.new-task-wrapper')
        
        if (newTaskPlaceholder) {
          // Insert the new task before the NEW TASK placeholder
          newTaskPlaceholder.insertAdjacentHTML('beforebegin', newTaskHtml)
          
          // Force re-render of the placeholder to fix display issues
          const placeholderTitle = newTaskPlaceholder.querySelector('.new-task-placeholder')
          if (placeholderTitle) {
            // Force a reflow by reading offsetHeight
            void placeholderTitle.offsetHeight
            // Toggle a class to trigger re-render
            placeholderTitle.classList.add('force-rerender')
            requestAnimationFrame(() => {
              placeholderTitle.classList.remove('force-rerender')
            })
          }
        } else {
          // Fallback: insert at the end if placeholder not found
          tasksContainer.insertAdjacentHTML('beforeend', newTaskHtml)
        }
        
        // Reset the NEW TASK placeholder for another task
        this.cancelNewTask()
        
        // Automatically focus the new task placeholder for quick entry
        this.showNewTaskInput()
        
        // Refresh sortable controller to set up drag handlers on new task
        const sortableController = this.application.getControllerForElementAndIdentifier(
          this.element,
          'sortable'
        )
        if (sortableController && sortableController.refresh) {
          sortableController.refresh()
        }
      } else {
        console.error('Failed to create task:', data.error)
        alert('Failed to create task: ' + (data.error || 'Unknown error'))
        // Restore focus to allow retry
        titleElement.focus()
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
      // Restore focus to allow retry
      titleElement.focus()
    }
  }
  
  async handleTaskReorder(event) {
    const { taskId, oldIndex, newIndex } = event.detail
    
    // Get all task wrappers
    const taskWrappers = Array.from(this.element.querySelectorAll('.tasks-list > .task-wrapper:not(.new-task-wrapper)'))
    
    // Calculate new position based on surrounding tasks
    let newPosition
    if (newIndex === 0) {
      // Moved to top
      const nextTask = taskWrappers[1]?.querySelector('.task-item')
      const nextPosition = nextTask ? parseInt(nextTask.dataset.taskPosition) : 1000
      newPosition = Math.max(nextPosition - 1000, 100)
    } else if (newIndex === taskWrappers.length - 1) {
      // Moved to bottom
      const prevTask = taskWrappers[newIndex - 1]?.querySelector('.task-item')
      const prevPosition = prevTask ? parseInt(prevTask.dataset.taskPosition) : 0
      newPosition = prevPosition + 1000
    } else {
      // Moved between two tasks
      const prevTask = taskWrappers[newIndex - 1]?.querySelector('.task-item')
      const nextTask = taskWrappers[newIndex + 1]?.querySelector('.task-item')
      const prevPosition = prevTask ? parseInt(prevTask.dataset.taskPosition) : 0
      const nextPosition = nextTask ? parseInt(nextTask.dataset.taskPosition) : prevPosition + 2000
      newPosition = Math.floor((prevPosition + nextPosition) / 2)
    }
    
    // Update position in the DOM immediately for responsiveness
    const movedTaskItem = taskWrappers[newIndex].querySelector('.task-item')
    if (movedTaskItem) {
      movedTaskItem.dataset.taskPosition = newPosition
    }
    
    // Send update to server with lock version
    try {
      const body = { position: newPosition }
      
      // Include lock version if we have it
      const lockVersion = this.taskLockVersions.get(taskId)
      if (lockVersion !== undefined) {
        body.lock_version = lockVersion
      }
      
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCsrfToken()
        },
        body: JSON.stringify(body)
      })
      
      if (response.status === 409) {
        // Conflict - another user modified the task
        const data = await response.json()
        this.handleReorderConflict(data)
      } else if (response.ok) {
        // Update lock version from response
        const data = await response.json()
        if (data.lock_version !== undefined) {
          this.taskLockVersions.set(taskId, data.lock_version)
        }
      } else {
        console.error('Failed to update task position')
        // Could revert the DOM change here if needed
      }
    } catch (error) {
      console.error('Error updating task position:', error)
    }
  }
  
  handleNewTaskBlur(event) {
    // Don't cancel if we're tabbing to save another task
    if (event.relatedTarget && event.relatedTarget.classList.contains('new-task-input')) {
      return
    }
    
    // Small delay to allow for clicks on other elements
    setTimeout(() => {
      const input = event.target
      if (input.value.trim() === '') {
        this.cancelNewTask()
      }
    }, 200)
  }
  

  addTaskToList(task) {
    const taskHtml = this.renderTask(task)
    if (this.taskTargets.length === 0) {
      // Remove empty state
      this.tasksListTarget.innerHTML = taskHtml
    } else {
      // Prepend new task
      this.tasksListTarget.insertAdjacentHTML("afterbegin", taskHtml)
    }
  }

  renderTask(task) {
    const emoji = taskStatusEmoji(task.status)
    const isCompleted = task.status === 'successfully_completed'
    
    return `
      <div class="task-wrapper">
        <div class="task-item ${isCompleted ? 'completed' : ''}" 
             draggable="true"
             data-task-id="${task.id}" 
             data-task-status="${task.status}" 
             data-task-position="${task.position || 0}"
             data-job-target="task"
             data-action="click->job#handleTaskClick dragstart->job#handleDragStart dragover->job#handleDragOver drop->job#handleDrop dragend->job#handleDragEnd">
          <div class="task-status-container">
            <button class="task-status-button" data-action="click->job#toggleTaskStatus">
              <span>${emoji}</span>
            </button>
            <div class="task-status-dropdown hidden" data-job-target="taskStatusDropdown">
              ${['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'].map(status => `
                <button class="task-status-option ${task.status === status ? 'active' : ''}" 
                        data-action="click->job#updateTaskStatus" 
                        data-task-id="${task.id}" 
                        data-status="${status}">
                  <span class="status-emoji">${taskStatusEmoji(status)}</span>
                  <span>${status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="task-content">
            <div class="task-title" 
                 contenteditable="true"
                 data-action="focus->job#storeOriginalTitle blur->job#updateTaskTitle click->job#handleTaskTitleClick keydown->job#handleTaskTitleKeydown"
                 data-task-id="${task.id}"
                 data-original-title="${task.title || task.name || ''}">${task.title || task.name || ''}</div>
          </div>
          <div class="task-right">
            <!-- Task icons and time tracking go here -->
          </div>
        </div>
      </div>
    `
  }

  // Toggle subtasks visibility
  toggleSubtasks(event) {
    event.stopPropagation()
    const taskId = event.currentTarget.dataset.taskId
    const taskWrapper = event.currentTarget.closest('.task-wrapper')
    const subtasksContainer = taskWrapper.querySelector('.subtasks-container')
    const triangle = event.currentTarget
    const disclosureContainer = triangle.closest('.disclosure-container')
    const subtaskCount = disclosureContainer?.querySelector('.subtask-count')
    
    if (subtasksContainer) {
      const isCollapsed = subtasksContainer.classList.contains('collapsed')
      
      // Trigger FLIP animation for smooth collapse/expand
      if (window.flipController) {
        window.flipController.captureInitialPositions()
      }
      
      // Toggle collapsed state
      subtasksContainer.classList.toggle('collapsed')
      
      // Update aria-expanded attribute (inverse of collapsed)
      triangle.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false')
      
      // Toggle subtask count visibility
      if (subtaskCount) {
        subtaskCount.style.display = isCollapsed ? 'none' : 'inline-block'
      }
      
      // Save state in localStorage for persistence
      const collapsedTasks = JSON.parse(localStorage.getItem('collapsedTasks') || '{}')
      if (!isCollapsed) {
        collapsedTasks[taskId] = true
      } else {
        delete collapsedTasks[taskId]
      }
      localStorage.setItem('collapsedTasks', JSON.stringify(collapsedTasks))
      
      // Trigger FLIP animation after state change
      if (window.flipController) {
        requestAnimationFrame(() => {
          window.flipController.animateReorder()
        })
      }
    }
  }
  
  // Restore collapsed state on page load
  restoreCollapsedState() {
    const collapsedTasks = JSON.parse(localStorage.getItem('collapsedTasks') || '{}')
    Object.keys(collapsedTasks).forEach(taskId => {
      const taskWrapper = document.querySelector(`[data-task-id="${taskId}"]`)
      if (taskWrapper) {
        const subtasksContainer = taskWrapper.querySelector('.subtasks-container')
        const triangle = taskWrapper.querySelector('.disclosure-triangle')
        const disclosureContainer = taskWrapper.querySelector('.disclosure-container')
        const subtaskCount = disclosureContainer?.querySelector('.subtask-count')
        
        if (subtasksContainer && triangle) {
          subtasksContainer.classList.add('collapsed')
          triangle.setAttribute('aria-expanded', 'false')
          
          // Show subtask count when collapsed
          if (subtaskCount) {
            subtaskCount.style.display = 'inline-block'
          }
        }
      }
    })
  }
  
  updateTaskStatus(event) {
    event.stopPropagation()
    const taskId = event.currentTarget.dataset.taskId
    const newStatus = event.currentTarget.dataset.status
    // Find the task element
    const taskElement = event.target.closest(".task-item")
    
    // Save initial status for reverting on error
    const initialStatus = taskElement.dataset.taskStatus
    
    // The dropdown controller will handle closing via the click->dropdown#close action
    
    // Optimistic UI update - update immediately before server response
    // Update the status button emoji immediately
    const statusButton = taskElement.querySelector(".task-status-button span")
    if (statusButton) {
      statusButton.textContent = taskStatusEmoji(newStatus)
    }
    
    // Update data attributes
    taskElement.dataset.taskStatus = newStatus
    taskElement.classList.toggle("completed", newStatus === "successfully_completed")
    
    // Update active state in dropdown
    taskElement.querySelectorAll(".task-status-option").forEach(opt => {
      opt.classList.toggle("active", opt.dataset.status === newStatus)
    })
    
    // Send request to server
    console.log(`Updating task ${taskId} status to ${newStatus}`)
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json", 
        "X-CSRF-Token": this.getCsrfToken(),
        "Accept": "text/vnd.turbo-stream.html, application/json"
      },
      body: JSON.stringify({ 
        task: { 
          status: newStatus 
        } 
      })
    }).then(response => {
      const contentType = response.headers.get('content-type')
      console.log('Response received:', {
        status: response.status,
        contentType: contentType,
        ok: response.ok
      })
      
      // Check if response is Turbo Stream
      if (contentType && contentType.includes('text/vnd.turbo-stream.html')) {
        console.log('Processing Turbo Stream response...')
        return response.text().then(html => {
          console.log('Turbo Stream HTML:', html.substring(0, 200) + '...')
          // Use our custom renderer that refreshes sortable controllers
          Bos.renderTurboStreamMessage(html)
          console.log('Turbo Stream processed')
        }).catch(error => {
          console.error('Error processing Turbo Stream:', error)
          console.error('Response was:', response)
        })
      } else {
        console.log('Not a Turbo Stream response, trying JSON...')
        // Fallback to JSON response - UI already updated optimistically
        return response.text().then(text => {
          console.log('Response text:', text.substring(0, 200))
          try {
            const data = JSON.parse(text)
            // Only update if server returned a different status than what we set
            if (data.task && data.task.status !== newStatus) {
            console.warn('Server returned different status:', data.task.status, 'vs', newStatus)
            // Revert to server's status
            taskElement.dataset.taskStatus = data.task.status
            taskElement.classList.toggle("completed", data.task.status === "successfully_completed")
            
            const statusButton = taskElement.querySelector(".task-status-button span")
            if (statusButton) {
              statusButton.textContent = taskStatusEmoji(data.task.status)
            }
            
            taskElement.querySelectorAll(".task-status-option").forEach(opt => {
              opt.classList.toggle("active", opt.dataset.status === data.task.status)
            })
          }
          
            // Check if we should resort tasks locally (fallback when no Turbo Stream)
            if (this.shouldResortTasks()) {
              this.resortTasksByStatus()
            }
          } catch (e) {
            console.error('Failed to parse JSON response:', e)
            console.error('Response was:', text)
          }
        })
      }
    }).catch(error => {
      console.error('Fetch error:', error)
      // Revert UI on error
      taskElement.dataset.taskStatus = initialStatus
      taskElement.classList.toggle("completed", initialStatus === "successfully_completed")
      
      const statusButton = taskElement.querySelector(".task-status-button span, .subtask-status-button span")
      if (statusButton) {
        statusButton.textContent = taskStatusEmoji(initialStatus)
      }
    })
  }
  
  shouldResortTasks() {
    // Check the user setting from the body data attribute
    const resortSetting = document.body.dataset.resortTasksOnStatusChange
    return resortSetting === 'true'
  }
  
  resortTasksByStatus() {
    // Define the sort order for task statuses
    const statusOrder = {
      'in_progress': 1,
      'paused': 2,
      'new_task': 3,
      'successfully_completed': 4,
      'cancelled': 5
    }
    
    // Get the tasks list container
    const tasksList = this.element.querySelector('.tasks-list')
    if (!tasksList) return
    
    // IMPORTANT: Only get root-level task wrappers, not subtasks
    // Use direct children selector to avoid selecting nested subtasks
    const taskWrappers = Array.from(tasksList.querySelectorAll(':scope > .task-wrapper:not(.new-task-wrapper)'))
    
    // Sort task wrappers by status order, then by position
    taskWrappers.sort((a, b) => {
      const taskA = a.querySelector('.task-item')
      const taskB = b.querySelector('.task-item')
      
      const statusA = taskA?.dataset.taskStatus || 'new_task'
      const statusB = taskB?.dataset.taskStatus || 'new_task'
      
      const orderA = statusOrder[statusA] || 999
      const orderB = statusOrder[statusB] || 999
      
      // First sort by status
      if (orderA !== orderB) {
        return orderA - orderB
      }
      
      // Then by position within the same status
      const positionA = parseInt(taskA?.dataset.taskPosition || 0)
      const positionB = parseInt(taskB?.dataset.taskPosition || 0)
      
      return positionA - positionB
    })
    
    // Find the new task placeholder
    const newTaskWrapper = tasksList.querySelector('.new-task-wrapper')
    
    // Reorder the DOM with animation
    taskWrappers.forEach((wrapper, index) => {
      // Calculate the target position
      const currentIndex = Array.from(tasksList.children).indexOf(wrapper)
      
      if (currentIndex !== index) {
        // Add a transition for smooth movement
        wrapper.style.transition = 'transform 0.3s ease-in-out'
        
        // Calculate translation needed
        const rect = wrapper.getBoundingClientRect()
        const targetElement = tasksList.children[index]
        const targetRect = targetElement?.getBoundingClientRect()
        
        if (targetRect) {
          const translateY = targetRect.top - rect.top
          wrapper.style.transform = `translateY(${translateY}px)`
          
          // After animation, update DOM and remove transform
          setTimeout(() => {
            wrapper.style.transition = ''
            wrapper.style.transform = ''
            
            // Insert at the correct position
            if (index === 0) {
              tasksList.insertBefore(wrapper, tasksList.firstChild)
            } else {
              tasksList.insertBefore(wrapper, tasksList.children[index])
            }
          }, 300)
        }
      }
    })
    
    // Make sure new task placeholder stays at the end
    if (newTaskWrapper) {
      setTimeout(() => {
        tasksList.appendChild(newTaskWrapper)
      }, 350)
    }
  }
  
  // Update status for all selected tasks
  async updateSelectedTasksStatus(newStatus) {
    const tasksToUpdate = this.selectionManager.getSelectedElements()
    
    // Update each selected task
    const updates = tasksToUpdate.map(async taskElement => {
      const taskId = taskElement.dataset.taskId
      
      try {
        const data = await this.api.updateResource('task', taskId, 'status', newStatus)
        
        if (data.status === 'success') {
          // Update the task element using TaskRenderer
          this.taskRenderer.updateTaskElement(taskElement, { status: newStatus })
          
          // Update active state in dropdown if open
          taskElement.querySelectorAll(".task-status-option").forEach(opt => {
            opt.classList.toggle("active", opt.dataset.status === newStatus)
          })
        }
      } catch (error) {
        console.error('Error updating task status:', error)
      }
    })
    
    await Promise.all(updates)
    
    // Resort after all updates are done
    if (this.shouldResortTasks()) {
      setTimeout(() => {
        this.resortTasksByStatus()
      }, 100)
    }
  }
  
  // Open status menu for selected task
  openStatusMenuForSelectedTask() {
    if (this.selectionManager.selectedTasks.size !== 1) return
    
    const selectedTask = Array.from(this.selectionManager.selectedTasks)[0]
    const statusButton = selectedTask.querySelector('.task-status-button, .subtask-status-button')
    if (!statusButton) return
    
    // Close all other dropdowns
    document.querySelectorAll('.task-status-dropdown').forEach(d => d.classList.add('hidden'))
    
    // Open this dropdown
    const dropdown = selectedTask.querySelector('.task-status-dropdown')
    if (dropdown) {
      dropdown.classList.remove('hidden')
      this.activeStatusDropdown = dropdown
      this.activeStatusTask = selectedTask
      
      // Focus on the dropdown for keyboard navigation
      dropdown.setAttribute('tabindex', '-1')
      dropdown.focus()
    }
  }
  
  // Handle keyboard navigation in status menu
  handleStatusMenuKeyboard(event) {
    if (!this.activeStatusDropdown) return
    
    const statusMap = {
      'n': 'new_task',        // N for New
      'i': 'in_progress',     // I for In Progress
      'p': 'paused',          // P for Paused
      's': 'successfully_completed', // S for Successfully completed
      'c': 'cancelled'        // C for Cancelled
    }
    
    // Handle letter keys for quick selection
    const key = event.key.toLowerCase()
    if (statusMap[key]) {
      event.preventDefault()
      this.selectStatusByKey(statusMap[key])
      return
    }
    
    // Handle Enter/Space to confirm selection
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const focusedOption = this.activeStatusDropdown.querySelector('.task-status-option:focus, .task-status-option.keyboard-focused')
      if (focusedOption) {
        focusedOption.click()
      }
      return
    }
    
    // Handle Escape to close
    if (event.key === 'Escape') {
      event.preventDefault()
      this.closeStatusMenu()
      return
    }
    
    // Handle arrow keys for navigation
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      this.navigateStatusMenu(event.key === 'ArrowUp' ? -1 : 1)
      return
    }
  }
  
  // Select status by first letter
  selectStatusByKey(status) {
    const option = this.activeStatusDropdown.querySelector(`[data-status="${status}"]`)
    if (option) {
      // Highlight the option and remove active from others
      this.activeStatusDropdown.querySelectorAll('.task-status-option').forEach(opt => {
        opt.classList.remove('keyboard-focused', 'active')
      })
      option.classList.add('keyboard-focused')
      
      // Auto-select after a brief moment
      setTimeout(() => {
        option.click()
        this.closeStatusMenu()
      }, 100)
    }
  }
  
  // Navigate status menu with arrow keys
  navigateStatusMenu(direction) {
    const options = Array.from(this.activeStatusDropdown.querySelectorAll('.task-status-option'))
    const currentIndex = options.findIndex(opt => opt.classList.contains('keyboard-focused'))
    
    let newIndex
    if (currentIndex === -1) {
      // Start from the active option if no keyboard focus yet
      const activeIndex = options.findIndex(opt => opt.classList.contains('active'))
      if (activeIndex !== -1) {
        newIndex = activeIndex + direction
      } else {
        newIndex = direction === 1 ? 0 : options.length - 1
      }
    } else {
      newIndex = currentIndex + direction
      if (newIndex < 0) newIndex = options.length - 1
      if (newIndex >= options.length) newIndex = 0
    }
    
    // Remove active class when we start navigating
    options.forEach((opt, i) => {
      opt.classList.remove('active')
      opt.classList.toggle('keyboard-focused', i === newIndex)
    })
  }
  
  // Close status menu
  closeStatusMenu() {
    if (this.activeStatusDropdown) {
      this.activeStatusDropdown.classList.add('hidden')
      this.activeStatusDropdown = null
      this.activeStatusTask = null
    }
  }

  // Search/filter
  filterTasks(event) {
    const searchTerm = event.target.value.toLowerCase()
    
    this.taskTargets.forEach(task => {
      const title = task.querySelector(".task-title").textContent.toLowerCase()
      const matches = title.includes(searchTerm)
      task.style.display = matches ? "flex" : "none"
    })
  }

  // Assignee management
  removeAssignee(event) {
    const technicianId = event.currentTarget.dataset.technicianId
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/remove_technician`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ technician_id: technicianId })
    }).then(() => {
      event.currentTarget.closest(".assignee-tag").remove()
      this.updateStatusBubble()
    })
  }

  // Delete job
  confirmDelete(event) {
    if (confirm("Are you sure you want to delete this cancelled job? This will also delete all associated tasks and notes.")) {
      fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": this.getCsrfToken()
        }
      }).then(() => {
        window.location.href = `/clients/${this.clientIdValue}/jobs`
      })
    }
  }
  
  // Handle Sortable.js events
  handleTaskReorder(event) {
    const { taskId, oldIndex, newIndex, items } = event.detail
    
    // Update positions on server
    this.updateTaskPositions()
  }
  
  handleSubtaskReorder(event) {
    const { subtaskId, parentTaskId, oldIndex, newIndex } = event.detail
    
    // Update subtask positions on server
    this.updateSubtaskPositions(parentTaskId)
  }
  
  updateSubtaskPositions(parentTaskId) {
    const parentTask = document.querySelector(`[data-task-id="${parentTaskId}"]`)
    if (!parentTask) return
    
    const subtaskContainer = parentTask.querySelector('.subtasks')
    if (!subtaskContainer) return
    
    const subtaskElements = Array.from(subtaskContainer.querySelectorAll('.subtask-item'))
    const positions = subtaskElements.map((element, index) => ({
      id: element.dataset.taskId,
      position: index + 1
    }))
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${parentTaskId}/subtasks/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ positions: positions })
    })
  }
  
  updateTaskPositions() {
    const taskElements = this.taskTargets
    const positions = taskElements.map((element, index) => ({
      id: element.dataset.taskId,
      position: index + 1
    }))
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ positions: positions })
    })
  }
  
  // Handle batch reorder from new sortable controller
  handleTasksReorder(event) {
    const { positions } = event.detail
    
    // Check if we're only reordering subtasks (all have same parent_id)
    const taskElements = positions.map(p => 
      this.element.querySelector(`[data-task-id="${p.id}"]`)
    ).filter(el => el)
    
    const parentIds = new Set(taskElements.map(el => el.dataset.parentId || 'root'))
    const isSubtaskOnlyReorder = parentIds.size === 1 && !parentIds.has('root')
    
    // Send batch update to server
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ positions: positions })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        // Update DOM attributes with new positions to ensure fresh data for resort
        positions.forEach(positionData => {
          const taskElement = this.element.querySelector(`[data-task-id="${positionData.id}"]`)
          if (taskElement) {
            taskElement.dataset.taskPosition = positionData.position
          }
        })
        
        // Only trigger resort if enabled AND we're not just reordering subtasks
        if (this.shouldResortTasks() && !isSubtaskOnlyReorder) {
          this.resortTasksByStatus()
        }
      }
    })
  }
  
  // Handle parent change from drag and drop
  handleTaskParentChanged(event) {
    const { taskId, parentId, targetPosition } = event.detail
    
    // Update the DOM to reflect the change
    const taskWrapper = this.element.querySelector(`[data-task-id="${taskId}"]`)?.closest('.task-wrapper')
    if (taskWrapper) {
      // Update data attributes
      const taskItem = taskWrapper.querySelector('.task-item, .subtask-item')
      if (taskItem) {
        taskItem.dataset.parentId = parentId
      }
    }
    
    // If we have a target position, update it after parent change completes
    if (targetPosition && taskId) {
      // Wait a moment for acts_as_list to process the parent change
      setTimeout(() => {
        this.updateTaskPosition(taskId, targetPosition)
      }, 100)
    }
    
    // Refresh sortable if needed
    const sortableController = this.application.getControllerForElementAndIdentifier(this.element, 'sortable')
    if (sortableController) {
      sortableController.refresh()
    }
  }
  
  // Update a single task's position
  updateTaskPosition(taskId, position) {
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ 
        positions: [{ id: taskId, position: position }]
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        // Position updated successfully
        const taskElement = this.element.querySelector(`[data-task-id="${taskId}"]`)
        if (taskElement) {
          taskElement.dataset.taskPosition = position
        }
      }
    })
    .catch(error => {
      console.error('Error updating task position:', error)
    })
  }
  
  // Timer management
  startTimers() {
    this.updateAllTimers()
    this.timerInterval = setInterval(() => {
      this.updateAllTimers()
    }, 1000) // Update every second
  }
  
  stopTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
  
  updateAllTimers() {
    this.taskTimerTargets.forEach(timerElement => {
      const taskItem = timerElement.closest('.task-item')
      if (!taskItem) return
      
      const inProgressSince = taskItem.dataset.inProgressSince
      const accumulatedSeconds = parseInt(taskItem.dataset.accumulatedSeconds || 0)
      
      if (inProgressSince) {
        // Calculate current session time
        const startTime = new Date(inProgressSince)
        const now = new Date()
        const currentSessionSeconds = Math.floor((now - startTime) / 1000)
        
        // Total time = accumulated + current session
        const totalSeconds = accumulatedSeconds + currentSessionSeconds
        
        // Format and display
        const displayElement = timerElement.querySelector('.timer-display')
        if (displayElement) {
          displayElement.textContent = this.formatTime(totalSeconds)
        }
      }
    })
  }
  
  formatTime(totalSeconds) {
    const hours = totalSeconds / 3600
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    
    if (hours >= 1.0) {
      // Show only hours with exactly 1 decimal place
      return `${hours.toFixed(1)} hr`
    } else {
      // Show only minutes, rounded down
      return `${minutes} min`
    }
  }
  
  // New task creation methods
  saveNewTask(event) {
    if (event && event.preventDefault) {
      event.preventDefault()
    }
    const input = event.target || event.currentTarget || this.currentNewTaskInput
    const title = input.value.trim()
    
    if (!title) {
      this.cancelNewTask()
      return
    }
    
    // Create the task
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.getCsrfToken()
      },
      body: JSON.stringify({ task: { title: title, status: 'new_task' } })
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Remove empty tasks message if present
          const emptyMessage = this.tasksListTarget.querySelector('.empty-tasks')
          if (emptyMessage) {
            emptyMessage.remove()
          }
          
          // Get the tasks container
          const tasksContainer = this.tasksListTarget
          
          // Create task element HTML
          const newTaskHtml = this.createTaskHtml(data.task)
          
          // Find the NEW TASK placeholder
          const newTaskPlaceholder = tasksContainer.querySelector('.new-task-wrapper')
          
          if (newTaskPlaceholder) {
            // Insert the new task before the NEW TASK placeholder
            newTaskPlaceholder.insertAdjacentHTML('beforebegin', newTaskHtml)
            
            // Force re-render of the placeholder to fix display issues
            const placeholderTitle = newTaskPlaceholder.querySelector('.new-task-placeholder')
            if (placeholderTitle) {
              // Force a reflow by reading offsetHeight
              void placeholderTitle.offsetHeight
              // Toggle a class to trigger re-render
              placeholderTitle.classList.add('force-rerender')
              requestAnimationFrame(() => {
                placeholderTitle.classList.remove('force-rerender')
              })
            }
          } else {
            // Fallback: insert at the end if placeholder not found
            tasksContainer.insertAdjacentHTML('beforeend', newTaskHtml)
          }
          
          // Clear the input and keep focus for another task
          input.value = ''
          input.focus()
          
          // Store reference to the current input
          this.currentNewTaskInput = input
          
          // Refresh sortable controller to set up drag handlers on new task
          const sortableController = this.application.getControllerForElementAndIdentifier(
            this.element,
            'sortable'
          )
          if (sortableController && sortableController.refresh) {
            sortableController.refresh()
          }
        } else {
          console.error('Failed to create task:', data.error)
          alert('Failed to create task: ' + (data.error || 'Unknown error'))
        }
      })
      .catch(error => {
        console.error('Error creating task:', error)
        alert('Failed to create task')
      })
  }
  
  
  handleNewTaskBlur(event) {
    // Don't cancel if we're tabbing to save another task
    if (event.relatedTarget && event.relatedTarget.classList.contains('new-task-input')) {
      return
    }
    
    // Small delay to allow for clicks on other elements
    setTimeout(() => {
      const input = event.target
      if (input.value.trim() === '') {
        this.cancelNewTask(event)
      }
    }, 200)
  }
  
  createTaskHtml(task) {
    const taskElement = this.taskRenderer.createTaskElement(task, { isNew: true })
    
    // Wrap in task-wrapper div
    const wrapper = document.createElement('div')
    wrapper.className = 'task-wrapper'
    wrapper.appendChild(taskElement)
    
    return wrapper.outerHTML
  }
  
  handleArrowNavigation(direction) {
    // Close any open status menu first
    if (this.activeStatusDropdown) {
      this.closeStatusMenu()
    }
    
    // Get all visible tasks (including subtasks)
    const allTasks = Array.from(document.querySelectorAll('.task-item:not(.new-task-item), .subtask-item'))
    
    if (allTasks.length === 0) return
    
    
    // Clean up selectedTasks set - remove any tasks that are no longer in DOM
    const tasksToRemove = []
    this.selectionManager.selectedTasks.forEach(task => {
      if (!document.body.contains(task)) {
        tasksToRemove.push(task)
      }
    })
    tasksToRemove.forEach(task => this.selectionManager.selectedTasks.delete(task))
    
    // Get the currently selected task from the set (not from DOM classes)
    let currentTask = null
    if (this.selectionManager.selectedTasks.size === 1) {
      currentTask = Array.from(this.selectionManager.selectedTasks)[0]
    } else if (this.selectionManager.selectedTasks.size > 1) {
      // If multiple selected, use the last clicked one
      currentTask = this.lastClickedTask || Array.from(this.selectionManager.selectedTasks)[0]
    }
    
    // If no current task, select first/last based on direction
    if (!currentTask) {
      const taskToSelect = direction === 'down' ? allTasks[0] : allTasks[allTasks.length - 1]
      this.clearSelection()
      this.selectTask(taskToSelect)
      this.lastClickedTask = taskToSelect
      taskToSelect.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }
    
    // Find the current task's index
    const currentIndex = allTasks.indexOf(currentTask)
    if (currentIndex === -1) {
      // Current task not found, select first/last
      const taskToSelect = direction === 'down' ? allTasks[0] : allTasks[allTasks.length - 1]
      this.clearSelection()
      this.selectTask(taskToSelect)
      this.lastClickedTask = taskToSelect
      taskToSelect.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      return
    }
    
    // Calculate new index
    let newIndex
    if (direction === 'up') {
      newIndex = Math.max(0, currentIndex - 1)
    } else {
      newIndex = Math.min(allTasks.length - 1, currentIndex + 1)
    }
    
    // Select the new task
    if (newIndex !== currentIndex) {
      const newTask = allTasks[newIndex]
      this.clearSelection()
      this.selectTask(newTask)
      this.lastClickedTask = newTask
      newTask.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
  
  handleReorderConflict(conflictData) {
    // Show user-friendly error message
    const message = conflictData.error || "The tasks have been modified by another user. The page will refresh with the latest changes."
    
    // Show alert or toast notification
    alert(message)
    
    // Update lock versions from server response
    if (conflictData.current_state) {
      if (conflictData.current_state.job_lock_version !== undefined) {
        this.jobLockVersion = conflictData.current_state.job_lock_version
      }
      
      if (conflictData.current_state.tasks) {
        conflictData.current_state.tasks.forEach(task => {
          if (task.lock_version !== undefined) {
            this.taskLockVersions.set(task.id, task.lock_version)
          }
        })
      }
    }
    
    // Refresh the page to get latest state
    // In a more sophisticated implementation, we could update the UI without a full reload
    Turbo.visit(window.location.href, { action: 'replace' })
  }
  
  // Initialize lock versions from data attributes on page load
  initializeLockVersions() {
    // Get job lock version if available
    const jobElement = this.element
    if (jobElement.dataset.lockVersion) {
      this.jobLockVersion = parseInt(jobElement.dataset.lockVersion)
    }
    
    // Get task lock versions
    this.taskTargets.forEach(taskElement => {
      const taskId = parseInt(taskElement.dataset.taskId)
      const lockVersion = taskElement.dataset.lockVersion
      if (lockVersion !== undefined) {
        this.taskLockVersions.set(taskId, parseInt(lockVersion))
      }
    })
  }
  
  // Register the flip controller globally for access
  registerFlipController(event) {
    const flipController = event.target
    if (flipController && flipController.stimulusController) {
      window.flipController = flipController.stimulusController
    }
  }
}