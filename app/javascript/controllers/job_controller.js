import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["title", "statusBubble", "popover", "tasksContainer", "tasksList", 
                    "newTaskForm", "newTaskInput", "searchInput", "task", "taskTimer", "addSubtaskButton"]
  
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
    // Start timers for task time tracking
    this.startTimers()
    
    // Close popover when clicking outside
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.handleOutsideClick)
    
    // Handle keyboard navigation
    this.handleKeydown = this.handleKeydown.bind(this)
    document.addEventListener("keydown", this.handleKeydown)
    
    // Store controller reference for debugging
    if (this.element) {
      this.element._jobController = this
    }
  }

  disconnect() {
    this.stopTimers()
    document.removeEventListener("click", this.handleOutsideClick)
    document.removeEventListener("keydown", this.handleKeydown)
    
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
    // Select all with Cmd/Ctrl+A
    if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      const activeElement = document.activeElement
      if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        event.preventDefault()
        this.selectAllTasks()
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
    
    // Arrow key navigation
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && 
        !this.isRenaming && this.selectedTasks.size > 0) {
      event.preventDefault()
      this.navigateSelection(event.key === 'ArrowUp' ? -1 : 1, event.shiftKey)
    }
  }
  
  navigateSelection(direction, extend = false) {
    const allTasks = [...document.querySelectorAll('.task-item, .subtask-item')]
    if (allTasks.length === 0) return
    
    let targetIndex
    if (this.selectedTasks.size === 0) {
      targetIndex = direction === 1 ? 0 : allTasks.length - 1
    } else {
      const selectedIndices = Array.from(this.selectedTasks).map(task => allTasks.indexOf(task))
      const currentIndex = direction === 1 ? Math.max(...selectedIndices) : Math.min(...selectedIndices)
      targetIndex = currentIndex + direction
      
      if (targetIndex < 0) targetIndex = 0
      if (targetIndex >= allTasks.length) targetIndex = allTasks.length - 1
    }
    
    const targetTask = allTasks[targetIndex]
    if (!targetTask) return
    
    if (extend && this.lastClickedTask) {
      this.selectTaskRange(this.lastClickedTask, targetTask)
    } else {
      this.clearSelection()
      this.selectTask(targetTask)
      this.lastClickedTask = targetTask
    }
    
    // Scroll into view if needed
    targetTask.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  
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
    input.addEventListener('blur', () => this.finishRename())
  }
  
  handleRenameKeydown(event) {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      this.finishRename()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelRename()
    }
  }
  
  finishRename() {
    if (!this.isRenaming) return
    
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
    
    if (confirm(message)) {
      if (hasDeletePermission) {
        this.deleteTaskWithoutConfirm(taskId)
      } else {
        this.cancelTask(taskId)
      }
    } else {
      this.cancelRename()
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
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      }
    }).then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
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
        } else {
          alert(data.error || 'Failed to delete task')
        }
      })
      .catch(error => {
        console.error('Error deleting task:', error)
        alert('Failed to delete task')
      })
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
  
  get newTaskFormTarget() {
    return document.querySelector('[data-job-target="newTaskForm"]')
  }
  
  get newTaskInputTarget() {
    return document.querySelector('[data-job-target="newTaskInput"]')
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
  addNewTask(event) {
    this.newTaskFormTarget.classList.remove("hidden")
    this.newTaskInputTarget.focus()
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

  createTask(event) {
    event.preventDefault()
    const title = this.newTaskInputTarget.value.trim()
    
    if (!title) return

    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ task: { title: title } })
    }).then(response => response.json())
      .then(data => {
        // Add the new task to the list
        this.addTaskToList(data.task)
        // Reset form
        this.newTaskInputTarget.value = ""
        this.newTaskFormTarget.classList.add("hidden")
      })
  }

  cancelNewTask(event) {
    this.newTaskInputTarget.value = ""
    this.newTaskFormTarget.classList.add("hidden")
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
      'in_progress': 'In Progress',
      'paused': 'Paused',
      'successfully_completed': 'Successfully Completed',
      'cancelled': 'Cancelled'
    }
    
    const emoji = statusEmojis[task.status] || '⚫'
    const isCompleted = task.status === 'successfully_completed'
    
    return `
      <div class="task-item ${isCompleted ? 'completed' : ''}" 
           draggable="true"
           data-task-id="${task.id}" 
           data-task-status="${task.status}" 
           data-task-position="${task.position || 0}"
           data-job-target="task"
           data-action="dragstart->job#handleDragStart dragover->job#handleDragOver drop->job#handleDrop dragend->job#handleDragEnd">
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
        <div class="task-icons"></div>
      </div>
    `
  }

  toggleTaskStatus(event) {
    event.stopPropagation()
    // Find the task element - could be either task-item or subtask-item
    const taskElement = event.target.closest(".task-item") || event.target.closest(".subtask-item")
    const dropdown = taskElement.querySelector(".task-status-dropdown")
    
    // Close all other dropdowns
    document.querySelectorAll(".task-status-dropdown").forEach(d => {
      if (d !== dropdown) d.classList.add("hidden")
    })
    
    dropdown.classList.toggle("hidden")
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
    // Check if dragging a selected task
    const taskElement = event.target
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
}