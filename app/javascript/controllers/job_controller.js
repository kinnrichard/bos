import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["title", "statusBubble", "popover", "tasksContainer", "tasksList", 
                    "newTaskPlaceholder", "newTaskText", "searchInput", "task", "taskTimer", "addSubtaskButton"]
  
  static values = { 
    jobId: Number,
    clientId: Number,
    status: String,
    priority: String
  }
  
  timerInterval = null
  selectedTasks = new Set()
  lastClickedTask = null
  clickTimer = null
  isRenaming = false
  draggedTasks = []
  activeStatusDropdown = null
  activeStatusTask = null
  
  
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

  connect() {
    // Clear any stale selections on connect
    this.selectedTasks.clear()
    this.lastClickedTask = null
    
    // Start timers for task time tracking
    this.startTimers()
    
    // Close popover when clicking outside
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.handleOutsideClick)
    
    // Handle keyboard navigation
    this.handleKeydown = this.handleKeydown.bind(this)
    // Use capture phase to intercept before browser default
    document.addEventListener("keydown", this.handleKeydown, true)
    
    // Store controller reference for debugging
    if (this.element) {
      this.element._jobController = this
    }
  }

  disconnect() {
    this.stopTimers()
    document.removeEventListener("click", this.handleOutsideClick)
    document.removeEventListener("keydown", this.handleKeydown, true)
    
    if (this.element && this.element._jobController === this) {
      delete this.element._jobController
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
    if (!event.target.closest('.task-item') && !event.target.closest('.subtask-item') && 
        !this.isRenaming && !event.metaKey && !event.ctrlKey) {
      this.clearSelection()
    }
  }
  
  // Task selection and renaming
  handleTaskClick(event) {
    const taskElement = event.currentTarget
    const isSubtask = taskElement.classList.contains('subtask-item')
    
    // Don't handle clicks on interactive elements
    if (event.target.closest('.task-status-container') || 
        event.target.closest('.add-subtask-button') ||
        event.target.closest('input')) {
      return
    }
    
    // Prevent text selection on shift-click
    if (event.shiftKey) {
      event.preventDefault()
    }
    
    // Handle selection
    if (event.metaKey || event.ctrlKey) {
      // Toggle selection with Cmd/Ctrl
      this.toggleTaskSelection(taskElement)
    } else if (event.shiftKey && this.lastClickedTask) {
      // Range select with Shift
      this.selectTaskRange(this.lastClickedTask, taskElement)
    } else {
      // Check if clicking on already selected task
      const wasSelected = this.selectedTasks.has(taskElement)
      
      // Clear selection unless clicking on already selected
      if (!wasSelected) {
        this.clearSelection()
        this.selectTask(taskElement)
      } else {
        // Second click on selected task - check for rename
        if (this.clickTimer) {
          clearTimeout(this.clickTimer)
          this.clickTimer = null
        }
        
        this.clickTimer = setTimeout(() => {
          if (this.selectedTasks.has(taskElement) && this.selectedTasks.size === 1) {
            this.startRename(taskElement, event)
          }
          this.clickTimer = null
        }, 500)
      }
    }
    
    this.lastClickedTask = taskElement
  }
  
  selectTask(taskElement) {
    this.selectedTasks.add(taskElement)
    taskElement.classList.add('selected')
    taskElement.setAttribute('aria-selected', 'true')
  }
  
  deselectTask(taskElement) {
    this.selectedTasks.delete(taskElement)
    taskElement.classList.remove('selected')
    taskElement.setAttribute('aria-selected', 'false')
  }
  
  toggleTaskSelection(taskElement) {
    if (this.selectedTasks.has(taskElement)) {
      this.deselectTask(taskElement)
    } else {
      this.selectTask(taskElement)
    }
  }
  
  clearSelection() {
    this.selectedTasks.forEach(task => {
      task.classList.remove('selected')
      task.setAttribute('aria-selected', 'false')
    })
    this.selectedTasks.clear()
  }
  
  selectTaskRange(fromTask, toTask) {
    const allTasks = [...document.querySelectorAll('.task-item, .subtask-item')]
    const fromIndex = allTasks.indexOf(fromTask)
    const toIndex = allTasks.indexOf(toTask)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    
    this.clearSelection()
    for (let i = start; i <= end; i++) {
      this.selectTask(allTasks[i])
    }
  }
  
  selectAllTasks() {
    const allTasks = document.querySelectorAll('.task-item, .subtask-item')
    this.clearSelection()
    allTasks.forEach(task => this.selectTask(task))
  }
  
  // Keyboard navigation
  handleKeydown(event) {
    // Check if we're in an input field
    const activeElement = document.activeElement
    const isInputField = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA'
    
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
    
    // Escape key to deselect all tasks (only when not in input field)
    if (event.key === 'Escape' && !isInputField) {
      if (this.selectedTasks.size > 0) {
        event.preventDefault()
        this.clearSelection()
        return false
      }
    }
    
    // Return key to create new task (only when not in input field and no task selected)
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.altKey && !isInputField) {
      // Only create new task if no tasks are selected (otherwise Enter renames)
      if (this.selectedTasks.size === 0) {
        event.preventDefault()
        this.showNewTaskInput()
        return false
      }
    }
    
    // Select all with Cmd/Ctrl+A
    if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        event.preventDefault()
        this.selectAllTasks()
      }
    }
    
    // Spacebar to open status menu
    if (event.key === ' ' && this.selectedTasks.size === 1 && !this.isRenaming && !isInputField) {
      event.preventDefault()
      this.openStatusMenuForSelectedTask()
      return false
    }
    
    
    // Status change shortcuts (Cmd+Shift+...)
    if (event.metaKey && event.shiftKey && this.selectedTasks.size > 0 && !this.isRenaming) {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        let newStatus = null
        
        switch(event.key.toLowerCase()) {
          case 'p': // In Progress
            newStatus = 'in_progress'
            break
          case 'n': // New
            newStatus = 'new_task'
            break
          case 'c': // Completed Successfully
            newStatus = 'successfully_completed'
            break
        }
        
        if (newStatus) {
          event.preventDefault()
          this.updateSelectedTasksStatus(newStatus)
          return false
        }
      }
    }
    
    // Delete selected tasks
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedTasks.size > 0 && !this.isRenaming) {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        event.preventDefault()
        this.deleteSelectedTasks()
      }
    }
    
    // Enter to rename selected task
    if (event.key === 'Enter' && this.selectedTasks.size === 1 && !this.isRenaming) {
      event.preventDefault()
      const selectedTask = Array.from(this.selectedTasks)[0]
      this.startRename(selectedTask)
    }
    
    // Escape to cancel rename
    if (event.key === 'Escape' && this.isRenaming) {
      event.preventDefault()
      this.cancelRename()
    }
    
    // Remove duplicate arrow key handler - already handled above
  }
  
  // Removed navigateSelection - using handleArrowNavigation instead
  
  // Rename functionality
  startRename(taskElement, clickEvent = null) {
    if (this.isRenaming) return
    
    this.isRenaming = true
    this.renamingTask = taskElement
    
    const titleElement = taskElement.querySelector('.task-title, .subtask-title')
    if (!titleElement) return
    
    // Store original text
    this.originalTaskTitle = titleElement.textContent.trim()
    
    // Create input element
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'task-rename-input'
    input.value = this.originalTaskTitle
    
    // Replace title with input
    titleElement.style.display = 'none'
    titleElement.parentNode.insertBefore(input, titleElement)
    
    // Set cursor position if click event provided
    if (clickEvent) {
      const rect = titleElement.getBoundingClientRect()
      const x = clickEvent.clientX - rect.left
      const charWidth = rect.width / this.originalTaskTitle.length
      const position = Math.round(x / charWidth)
      
      input.focus()
      input.setSelectionRange(position, position)
    } else {
      input.focus()
      input.select()
    }
    
    // Handle input events
    input.addEventListener('keydown', (e) => this.handleRenameKeydown(e))
    input.addEventListener('blur', (e) => {
      // Don't finish rename if we're handling a keydown event
      if (!this.isHandlingRenameKeydown) {
        this.finishRename()
      }
    })
  }
  
  handleRenameKeydown(event) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      this.isHandlingRenameKeydown = true
      this.finishRename()
      // Reset flag after a short delay
      setTimeout(() => {
        this.isHandlingRenameKeydown = false
      }, 100)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelRename()
    }
  }
  
  finishRename() {
    if (!this.isRenaming) return
    
    // Prevent duplicate processing
    if (this.isProcessingRename) return
    this.isProcessingRename = true
    
    const input = this.renamingTask.querySelector('.task-rename-input')
    const titleElement = this.renamingTask.querySelector('.task-title, .subtask-title')
    const newTitle = input.value.trim()
    
    if (newTitle === '') {
      this.handleEmptyRename()
    } else if (newTitle !== this.originalTaskTitle) {
      this.saveTaskRename(newTitle)
    } else {
      this.cleanupRename()
    }
    
    // Reset flag after processing
    setTimeout(() => {
      this.isProcessingRename = false
    }, 100)
  }
  
  cancelRename() {
    if (!this.isRenaming) return
    
    const titleElement = this.renamingTask.querySelector('.task-title, .subtask-title')
    titleElement.textContent = this.originalTaskTitle
    
    this.cleanupRename()
  }
  
  cleanupRename() {
    const input = this.renamingTask.querySelector('.task-rename-input')
    const titleElement = this.renamingTask.querySelector('.task-title, .subtask-title')
    
    if (input) input.remove()
    if (titleElement) titleElement.style.display = ''
    
    this.isRenaming = false
    this.renamingTask = null
    this.originalTaskTitle = null
  }
  
  handleEmptyRename() {
    const taskId = this.renamingTask.dataset.taskId
    const hasDeletePermission = this.checkDeletePermission()
    
    const message = hasDeletePermission 
      ? "Are you sure you want to delete this task?" 
      : "Are you sure you want to cancel this task?"
    
    // Clean up rename state first to prevent any duplicate processing
    this.cleanupRename()
    
    if (confirm(message)) {
      if (hasDeletePermission) {
        this.deleteTaskWithoutConfirm(taskId)
      } else {
        this.cancelTask(taskId)
      }
    }
  }
  
  checkDeletePermission() {
    // TODO: Check actual user permissions
    // For now, assume admin/superadmin can delete
    const currentUser = document.querySelector('[data-current-user-role]')
    const role = currentUser?.dataset.currentUserRole
    return role === 'admin' || role === 'superadmin'
  }
  
  saveTaskRename(newTitle) {
    const taskId = this.renamingTask.dataset.taskId
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ task: { title: newTitle } })
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          const titleElement = this.renamingTask.querySelector('.task-title, .subtask-title')
          titleElement.textContent = newTitle
          this.cleanupRename()
        } else {
          alert(data.error || 'Failed to rename task')
          this.cancelRename()
        }
      })
      .catch(error => {
        console.error('Error renaming task:', error)
        this.cancelRename()
      })
  }
  
  deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return
    this.deleteTaskWithoutConfirm(taskId)
  }
  
  deleteTaskWithoutConfirm(taskId) {
    // Store reference to task element before cleanup
    const taskElement = this.renamingTask || document.querySelector(`[data-task-id="${taskId}"]`)
    
    // Clean up rename state first to prevent multiple confirmations
    if (this.isRenaming) {
      this.cleanupRename()
    }
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content,
        "Accept": "application/json"
      }
    }).then(response => {
      // Check if response is ok (2xx status)
      if (response.ok || response.status === 204) {
        // Task deleted successfully (204 No Content is common for DELETE)
        // Find the task wrapper to remove (handles both tasks and subtasks)
        const wrapper = taskElement.closest('.task-wrapper') || taskElement
        
        // Remove from selection if selected
        if (this.selectedTasks.has(taskElement)) {
          this.selectedTasks.delete(taskElement)
        }
        
        // Animate removal
        wrapper.style.transition = 'opacity 0.2s ease-out'
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
        }, 200)
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
    const count = this.selectedTasks.size
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
      const tasksToProcess = Array.from(this.selectedTasks)
      
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
    const taskElement = this.renamingTask || document.querySelector(`[data-task-id="${taskId}"]`)
    
    // Clean up rename state first
    if (this.isRenaming) {
      this.cleanupRename()
    }
    
    // Update status to cancelled
    const statusUpdate = { task: { status: 'cancelled' } }
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify(statusUpdate)
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Update UI immediately
          taskElement.dataset.taskStatus = 'cancelled'
          
          // Update status button
          const statusButton = taskElement.querySelector('.task-status-button span, .subtask-status-button span')
          if (statusButton) {
            statusButton.textContent = '❌'
          }
          
          // Clear selection if task was selected
          if (this.selectedTasks.has(taskElement)) {
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
      event.target.textContent = "Untitled Job"
      return
    }

    // Update via API
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
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
    const statusEmojis = {
      'open': '⚫',
      'new': '⚫',
      'in_progress': '🟢',
      'paused': '⏸️',
      'successfully_completed': '☑️',
      'cancelled': '❌'
    }
    const statusLabels = {
      'open': 'New',
      'new': 'New',
      'in_progress': 'In Progress',
      'paused': 'Paused',
      'successfully_completed': 'Successfully Completed',
      'cancelled': 'Cancelled'
    }
    
    const dropdownValue = dropdownContainer?.querySelector('.dropdown-value')
    if (dropdownValue) {
      dropdownValue.innerHTML = `
        <span class="status-emoji">${statusEmojis[newStatus] || '⚫'}</span>
        <span>${statusLabels[newStatus] || newStatus}</span>
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
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ job: { status: newStatus } })
    }).then(response => response.json())
      .then(data => {
        // Status already updated above
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
    const priorityEmojis = {
      'critical': '🔥',
      'high': '❗',
      'normal': '',
      'low': '➖',
      'proactive_followup': '💬'
    }
    const priorityLabels = {
      'critical': 'Critical',
      'high': 'High',
      'normal': 'Normal',
      'low': 'Low',
      'proactive_followup': 'Proactive Followup'
    }
    
    const dropdownValue = dropdownContainer?.querySelector('.dropdown-value')
    if (dropdownValue) {
      const emoji = priorityEmojis[newPriority] || ''
      const label = priorityLabels[newPriority] || newPriority
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
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH", 
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ job: { priority: newPriority } })
    }).then(response => response.json())
      .then(data => {
        // Priority already updated above
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
    const statusEmojis = {
      'open': '⚫',
      'new': '⚫',
      'in_progress': '🟢',
      'paused': '⏸️',
      'successfully_completed': '☑️',
      'cancelled': '❌'
    }
    const statusIcon = document.createElement('span')
    statusIcon.className = 'bubble-icon status-icon'
    statusIcon.textContent = statusEmojis[currentStatus] || '⚫'
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
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
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
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
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

  // Task management
  showNewTaskInput() {
    // Clear any selection
    this.clearSelection()
    
    // Remove empty tasks message if present
    const emptyMessage = document.querySelector('.empty-tasks')
    if (emptyMessage) {
      emptyMessage.remove()
    }
    
    // Transform the placeholder into an input
    const placeholder = this.newTaskPlaceholderTarget
    if (!placeholder) return
    
    // Create input element
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'new-task-input'
    input.placeholder = 'What needs to be done?'
    
    // Clear the placeholder content and add the input
    placeholder.innerHTML = ''
    placeholder.appendChild(input)
    
    // Add event listeners
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.saveNewTask(e)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelNewTask()
      }
    })
    
    input.addEventListener('blur', (e) => this.handleNewTaskBlur(e))
    
    // Focus the input
    input.focus()
    this.currentNewTaskInput = input
    
    // Remove click handler temporarily
    placeholder.dataset.action = ''
  }
  

  cancelNewTask(event) {
    // Restore the placeholder
    const placeholder = this.newTaskPlaceholderTarget
    if (placeholder && this.currentNewTaskInput) {
      placeholder.innerHTML = '<span data-job-target="newTaskText">New task...</span>'
      placeholder.dataset.action = 'click->job#showNewTaskInput'
      this.currentNewTaskInput = null
    }
    
    // Check if tasks list is empty
    const remainingTasks = document.querySelectorAll('.task-item')
    if (remainingTasks.length === 0) {
      const tasksList = this.tasksListTarget
      if (tasksList && !tasksList.querySelector('.empty-tasks')) {
        tasksList.innerHTML = '<div class="empty-tasks"><p>No tasks yet. Click below to add a task.</p></div>'
      }
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
  
  addSubtask(event) {
    const parentTaskId = event.currentTarget.dataset.parentTaskId
    const title = prompt("Enter subtask title:")
    
    if (!title || !title.trim()) return
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ task: { title: title.trim(), parent_id: parentTaskId } })
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          location.reload() // Reload to show the new subtask
        } else {
          alert(data.error || 'Failed to create subtask')
        }
      })
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
    const statusEmojis = {
      'new_task': '⚫',
      'in_progress': '🟢',
      'paused': '⏸️',
      'successfully_completed': '☑️',
      'cancelled': '❌'
    }
    
    const statusLabels = {
      'new_task': 'New',
      'open': 'New',
      'in_progress': 'In Progress',
      'paused': 'Paused',
      'waiting': 'Waiting',
      'successfully_completed': 'Successfully Completed',
      'cancelled': 'Cancelled'
    }
    
    const emoji = statusEmojis[task.status] || '⚫'
    const isCompleted = task.status === 'successfully_completed'
    
    return `
      <div class="task-wrapper">
        <div class="task-item ${isCompleted ? 'completed' : ''}" 
             draggable="true"
             data-task-id="${task.id}" 
             data-task-status="${task.status}" 
             data-task-position="${task.position || 0}"
             data-job-target="task"
             data-action="click->job#handleTaskClick dragstart->job#handleDragStart dragover->job#handleDragOver drop->job#handleDrop dragend->job#handleDragEnd mouseenter->job#showAddSubtask mouseleave->job#hideAddSubtask">
          <div class="task-status-container">
            <button class="task-status-button" data-action="click->job#toggleTaskStatus">
              <span>${emoji}</span>
            </button>
            <div class="task-status-dropdown hidden" data-job-target="taskStatusDropdown">
              ${Object.entries(statusEmojis).map(([status, emoji]) => `
                <button class="task-status-option ${task.status === status ? 'active' : ''}" 
                        data-action="click->job#updateTaskStatus" 
                        data-task-id="${task.id}" 
                        data-status="${status}">
                  <span class="status-emoji">${emoji}</span>
                  <span>${statusLabels[status]}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="task-content">
            <div class="task-title">${task.title}</div>
          </div>
          <div class="task-right">
            <!-- Task icons and time tracking go here -->
          </div>
        </div>
      </div>
    `
  }

  toggleTaskStatus(event) {
    event.stopPropagation()
    // Find the task element - could be either task-item or subtask-item
    const taskElement = event.target.closest(".task-item") || event.target.closest(".subtask-item")
    const dropdown = taskElement.querySelector(".task-status-dropdown")
    
    // Close all other dropdowns and clear active dropdown
    document.querySelectorAll(".task-status-dropdown").forEach(d => {
      if (d !== dropdown) {
        d.classList.add("hidden")
      }
    })
    
    // If there was a previously active dropdown, close it
    if (this.activeStatusDropdown && this.activeStatusDropdown !== dropdown) {
      this.closeStatusMenu()
    }
    
    // Toggle this dropdown
    dropdown.classList.toggle("hidden")
    
    // If we're opening the dropdown, set it as active and focus it
    if (!dropdown.classList.contains("hidden")) {
      this.activeStatusDropdown = dropdown
      this.activeStatusTask = taskElement
      
      // Focus on the dropdown for keyboard navigation
      dropdown.setAttribute('tabindex', '-1')
      dropdown.focus()
    } else {
      // If closing, clear the active dropdown
      this.activeStatusDropdown = null
      this.activeStatusTask = null
    }
  }
  
  toggleSubtaskStatus(event) {
    event.stopPropagation()
    const subtaskItem = event.currentTarget.closest('.subtask-item')
    const taskId = subtaskItem.dataset.taskId
    const currentStatus = subtaskItem.dataset.taskStatus
    
    // Simple toggle between new_task and successfully_completed for subtasks
    const newStatus = currentStatus === 'successfully_completed' ? 'new_task' : 'successfully_completed'
    const newStatusLabel = newStatus === 'successfully_completed' ? 'Successfully Completed' : 'New'
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ task: { status: newStatus } })
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Update UI
          subtaskItem.dataset.taskStatus = newStatus
          subtaskItem.classList.toggle('completed', newStatus === 'successfully_completed')
          event.currentTarget.querySelector('span').textContent = newStatus === 'successfully_completed' ? '☑️' : '⚫️'
        }
      })
  }
  
  updateTaskStatus(event) {
    event.stopPropagation()
    const taskId = event.currentTarget.dataset.taskId
    const newStatus = event.currentTarget.dataset.status
    // Find the task element - could be either task-item or subtask-item
    const taskElement = event.target.closest(".task-item") || event.target.closest(".subtask-item")
    const dropdown = taskElement.querySelector(".task-status-dropdown")
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json", 
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ 
        task: { 
          status: newStatus 
        } 
      })
    }).then(response => response.json())
      .then(data => {
        // Update the task element
        taskElement.dataset.taskStatus = data.task.status
        taskElement.classList.toggle("completed", data.task.status === "successfully_completed")
        
        // Update the status button emoji
        const statusEmojis = {
          'new_task': '⚫',
          'in_progress': '🟢',
          'paused': '⏸️',
          'successfully_completed': '☑️',
          'cancelled': '❌'
        }
        const statusButton = taskElement.querySelector(".task-status-button span, .subtask-status-button span")
        if (statusButton) {
          statusButton.textContent = statusEmojis[data.task.status] || '⚫'
        }
        
        // Update active state in dropdown
        taskElement.querySelectorAll(".task-status-option").forEach(opt => {
          opt.classList.toggle("active", opt.dataset.status === data.task.status)
        })
        
        // Hide dropdown
        dropdown.classList.add("hidden")
      })
  }
  
  // Update status for all selected tasks
  updateSelectedTasksStatus(newStatus) {
    const tasksToUpdate = Array.from(this.selectedTasks)
    
    // Update each selected task
    tasksToUpdate.forEach(taskElement => {
      const taskId = taskElement.dataset.taskId
      
      fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        },
        body: JSON.stringify({ task: { status: newStatus } })
      }).then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            // Update the task element
            taskElement.dataset.taskStatus = newStatus
            taskElement.classList.toggle("completed", newStatus === "successfully_completed")
            
            // Update the status button emoji
            const statusEmojis = {
              'new_task': '⚫',
              'in_progress': '🟢',
              'paused': '⏸️',
              'successfully_completed': '☑️',
              'cancelled': '❌'
            }
            const statusButton = taskElement.querySelector(".task-status-button span, .subtask-status-button span")
            if (statusButton) {
              statusButton.textContent = statusEmojis[newStatus] || '⚫'
            }
            
            // Update active state in dropdown if open
            taskElement.querySelectorAll(".task-status-option").forEach(opt => {
              opt.classList.toggle("active", opt.dataset.status === newStatus)
            })
          }
        })
        .catch(error => {
          console.error('Error updating task status:', error)
        })
    })
  }
  
  // Open status menu for selected task
  openStatusMenuForSelectedTask() {
    if (this.selectedTasks.size !== 1) return
    
    const selectedTask = Array.from(this.selectedTasks)[0]
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
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ technician_id: technicianId })
    }).then(() => {
      event.currentTarget.closest(".assignee-tag").remove()
      this.updateStatusBubble()
    })
  }

  // Delete job
  confirmDelete(event) {
    if (confirm("Are you sure you want to delete this job? This will also delete all associated tasks and notes.")) {
      fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        }
      }).then(() => {
        window.location.href = `/clients/${this.clientIdValue}/jobs`
      })
    }
  }
  
  // Drag and drop handlers
  handleDragStart(event) {
    // Prevent dragging during rename or if it's a new task
    if (this.isRenaming || event.target.classList.contains('new-task-item')) {
      event.preventDefault()
      return
    }
    
    // Check if dragging a selected task
    const taskElement = event.target.closest('.task-item')
    if (!taskElement) return
    
    if (!this.selectedTasks.has(taskElement)) {
      // If dragging unselected task, clear selection and select only this task
      this.clearSelection()
      this.selectTask(taskElement)
    }
    
    // Store all selected tasks
    this.draggedTasks = Array.from(this.selectedTasks)
    this.draggedElement = taskElement
    
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', 'multiple tasks')
    
    // Add dragging class to all selected tasks
    this.draggedTasks.forEach(task => task.classList.add('dragging'))
  }
  
  handleDragOver(event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    event.dataTransfer.dropEffect = 'move'
    
    const targetElement = event.target.closest('.task-item')
    
    // Don't show drop indicator if target is one of the dragged tasks
    if (targetElement && !this.draggedTasks.includes(targetElement)) {
      const rect = targetElement.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      
      if (event.clientY < midpoint) {
        targetElement.classList.add('drag-over-top')
        targetElement.classList.remove('drag-over-bottom')
      } else {
        targetElement.classList.add('drag-over-bottom')
        targetElement.classList.remove('drag-over-top')
      }
    }
    
    return false
  }
  
  handleDrop(event) {
    if (event.stopPropagation) {
      event.stopPropagation()
    }
    
    const targetElement = event.target.closest('.task-item')
    
    if (targetElement && !this.draggedTasks.includes(targetElement)) {
      const rect = targetElement.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      const insertBefore = event.clientY < midpoint
      
      const tasksContainer = this.tasksListTarget
      
      // Sort dragged tasks by their current position
      const sortedDraggedTasks = this.draggedTasks.sort((a, b) => {
        return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      })
      
      // Insert all dragged tasks
      sortedDraggedTasks.forEach(draggedTask => {
        if (insertBefore) {
          tasksContainer.insertBefore(draggedTask, targetElement)
        } else {
          tasksContainer.insertBefore(draggedTask, targetElement.nextSibling)
        }
      })
      
      // Update positions on server
      this.updateTaskPositions()
    }
    
    return false
  }
  
  handleDragEnd(event) {
    // Remove dragging class from all dragged tasks
    this.draggedTasks.forEach(task => task.classList.remove('dragging'))
    
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('drag-over-top', 'drag-over-bottom')
    })
    
    this.draggedElement = null
    this.draggedTasks = []
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
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ positions: positions })
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
        timerElement.querySelector('.time-value').textContent = this.formatTime(totalSeconds)
      }
    })
  }
  
  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }
  
  // Show/hide add subtask button on hover
  showAddSubtask(event) {
    // Handled by CSS now
  }
  
  hideAddSubtask(event) {
    // Handled by CSS now
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
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
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
          
          // Insert the new task at the end of the tasks list
          tasksContainer.insertAdjacentHTML('beforeend', newTaskHtml)
          
          // Clear the input and keep focus for another task
          input.value = ''
          input.focus()
          
          // Store reference to the current input
          this.currentNewTaskInput = input
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
    const statusEmojis = {
      'new_task': '⚫',
      'open': '⚫',
      'in_progress': '🟢',
      'paused': '⏸️',
      'waiting': '⏳',
      'successfully_completed': '☑️',
      'cancelled': '❌'
    }
    
    const emoji = statusEmojis[task.status] || '⚫'
    const isCompleted = task.status === 'successfully_completed'
    
    return `
      <div class="task-wrapper">
        <div class="task-item ${isCompleted ? 'completed' : ''}" 
             draggable="true"
             data-task-id="${task.id}" 
             data-task-status="${task.status}" 
             data-task-position="${task.position || 0}"
             data-job-target="task"
             data-action="click->job#handleTaskClick dragstart->job#handleDragStart dragover->job#handleDragOver drop->job#handleDrop dragend->job#handleDragEnd mouseenter->job#showAddSubtask mouseleave->job#hideAddSubtask">
          <div class="task-status-container">
            <button class="task-status-button" data-action="click->job#toggleTaskStatus">
              <span>${emoji}</span>
            </button>
            <div class="task-status-dropdown hidden" data-job-target="taskStatusDropdown">
              <!-- Status options will be populated when dropdown opens -->
            </div>
          </div>
          <div class="task-content">
            <div class="task-title">${task.title}</div>
          </div>
          <div class="task-right">
            <!-- Task icons and time tracking go here -->
          </div>
        </div>
      </div>
    `
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
    this.selectedTasks.forEach(task => {
      if (!document.body.contains(task)) {
        tasksToRemove.push(task)
      }
    })
    tasksToRemove.forEach(task => this.selectedTasks.delete(task))
    
    // Get the currently selected task from the set (not from DOM classes)
    let currentTask = null
    if (this.selectedTasks.size === 1) {
      currentTask = Array.from(this.selectedTasks)[0]
    } else if (this.selectedTasks.size > 1) {
      // If multiple selected, use the last clicked one
      currentTask = this.lastClickedTask || Array.from(this.selectedTasks)[0]
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
}