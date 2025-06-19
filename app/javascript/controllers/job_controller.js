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

  connect() {
    // Close popover when clicking outside
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.handleOutsideClick)
  }

  disconnect() {
    document.removeEventListener("click", this.handleOutsideClick)
  }

  handleOutsideClick(event) {
    if (!this.popoverTarget.contains(event.target) && 
        !this.statusBubbleTarget.contains(event.target)) {
      this.popoverTarget.classList.add("hidden")
    }
  }

  // Title editing
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
    this.popoverTarget.classList.toggle("hidden")
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
        this.addTaskToList(data)
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
    return `
      <div class="task-item" data-task-id="${task.id}" data-job-target="task">
        <div class="task-checkbox">
          <button class="checkbox-circle" data-action="click->job#toggleTask">
          </button>
        </div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
        </div>
        <div class="task-icons"></div>
      </div>
    `
  }

  toggleTask(event) {
    const taskElement = event.target.closest(".task-item")
    const taskId = taskElement.dataset.taskId
    const isCompleted = taskElement.classList.contains("completed")
    
    fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json", 
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ 
        task: { 
          status: isCompleted ? "pending" : "successfully_completed" 
        } 
      })
    }).then(response => response.json())
      .then(data => {
        taskElement.classList.toggle("completed")
        const checkbox = taskElement.querySelector(".checkbox-circle")
        checkbox.classList.toggle("checked")
        checkbox.innerHTML = data.status === "successfully_completed" ? "<span>✓</span>" : ""
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
}