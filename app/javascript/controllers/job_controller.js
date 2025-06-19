import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["title", "statusBubble", "popover", "tasksContainer", "tasksList", 
                    "newTaskForm", "newTaskInput", "searchInput", "task"]
  
  static values = { 
    jobId: Number,
    clientId: Number,
    status: String,
    priority: String
  }
  
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
    // Close popover when clicking outside
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.handleOutsideClick)
  }

  disconnect() {
    document.removeEventListener("click", this.handleOutsideClick)
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
    const newStatus = event.currentTarget.dataset.status
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ job: { status: newStatus } })
    }).then(response => response.json())
      .then(data => {
        this.statusValue = newStatus
        this.updateStatusBubble()
        this.highlightActiveStatus()
      })
  }

  updatePriority(event) {
    const newPriority = event.currentTarget.dataset.priority
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}`, {
      method: "PATCH", 
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ job: { priority: newPriority } })
    }).then(response => response.json())
      .then(data => {
        this.priorityValue = newPriority
        this.updateStatusBubble()
        this.highlightActivePriority()
      })
  }

  updateStatusBubble() {
    // This would be better done with a partial update from the server
    // For now, we'll update the icons manually
    location.reload()
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
    const taskElement = event.target.closest(".task-item")
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
    const taskElement = event.target.closest(".task-item")
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
        const statusButton = taskElement.querySelector(".task-status-button span")
        statusButton.textContent = statusEmojis[data.task.status] || '⚫'
        
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
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', event.target.innerHTML)
    this.draggedElement = event.target
    event.target.classList.add('dragging')
  }
  
  handleDragOver(event) {
    if (event.preventDefault) {
      event.preventDefault()
    }
    event.dataTransfer.dropEffect = 'move'
    
    const draggingElement = this.draggedElement
    const targetElement = event.target.closest('.task-item')
    
    if (targetElement && targetElement !== draggingElement) {
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
    
    const draggingElement = this.draggedElement
    const targetElement = event.target.closest('.task-item')
    
    if (targetElement && targetElement !== draggingElement) {
      const rect = targetElement.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      const insertBefore = event.clientY < midpoint
      
      const tasksContainer = this.tasksListTarget
      if (insertBefore) {
        tasksContainer.insertBefore(draggingElement, targetElement)
      } else {
        tasksContainer.insertBefore(draggingElement, targetElement.nextSibling)
      }
      
      // Update positions on server
      this.updateTaskPositions()
    }
    
    return false
  }
  
  handleDragEnd(event) {
    event.target.classList.remove('dragging')
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('drag-over-top', 'drag-over-bottom')
    })
    this.draggedElement = null
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
}