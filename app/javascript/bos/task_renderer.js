// Task HTML rendering utilities

export class TaskRenderer {
  constructor(controller) {
    this.controller = controller
    // Get dependencies from window.Bos
    const { taskStatusEmoji, noteIconSVG, infoIconSVG } = window.Bos?.Icons || {}
    const { CLASSES, DATA_ATTRS } = window.Bos?.Constants || {}
    this.taskStatusEmoji = taskStatusEmoji
    this.noteIconSVG = noteIconSVG
    this.infoIconSVG = infoIconSVG
    this.CLASSES = CLASSES
    this.DATA_ATTRS = DATA_ATTRS
  }

  // Create a task element from data
  createTaskElement(taskData, options = {}) {
    const {
      isNew = false,
      isSubtask = false,
      parentId = null,
      insertMode = false
    } = options

    const taskItem = document.createElement('div')
    taskItem.className = this.buildTaskClasses(taskData, { isSubtask })
    this.setTaskAttributes(taskItem, taskData, { parentId })
    
    // Mark new tasks to help Flip controller
    if (isNew || !taskData.id) {
      taskItem.dataset.newTask = 'true'
      // Remove the flag after a short delay
      setTimeout(() => {
        delete taskItem.dataset.newTask
      }, 500)
    }
    
    // Build task HTML
    taskItem.innerHTML = this.buildTaskHTML(taskData, { isNew, insertMode })
    
    // Set up event listeners
    this.attachEventListeners(taskItem, { isNew })
    
    return taskItem
  }

  // Build task classes
  buildTaskClasses(taskData, options = {}) {
    const classes = ['task-item']
    
    if (options.isSubtask) {
      classes.push(this.CLASSES.SUBTASK)
    }
    
    if (taskData.status === 'successfully_completed') {
      classes.push(this.CLASSES.COMPLETED)
    }
    
    if (taskData.status === 'cancelled') {
      classes.push(this.CLASSES.CANCELLED)
    }
    
    if (taskData.subtasks?.length > 0) {
      classes.push(this.CLASSES.HAS_SUBTASKS, this.CLASSES.EXPANDED)
    }
    
    return classes.join(' ')
  }

  // Set task data attributes
  setTaskAttributes(element, taskData, options = {}) {
    element.setAttribute(this.DATA_ATTRS.TASK_ID, taskData.id || '')
    element.setAttribute(this.DATA_ATTRS.STATUS, taskData.status || 'new_task')
    element.setAttribute(this.DATA_ATTRS.POSITION, taskData.position || '0')
    element.setAttribute(this.DATA_ATTRS.SELECTED, 'false')
    
    if (taskData.priority) {
      element.setAttribute(this.DATA_ATTRS.PRIORITY, taskData.priority)
    }
    
    if (options.parentId) {
      element.setAttribute(this.DATA_ATTRS.PARENT_ID, options.parentId)
    }
  }

  // Build task HTML content
  buildTaskHTML(taskData, options = {}) {
    const { isNew, insertMode } = options
    const hasSubtasks = taskData.subtasks?.length > 0
    
    const parts = []
    
    // Subtask toggle if has subtasks (before status)
    if (hasSubtasks) {
      parts.push(`
        <button class="subtask-toggle" 
                data-action="click->job#toggleSubtasks"
                aria-expanded="true">
          <svg class="chevron" xmlns="http://www.w3.org/2000/svg" 
               viewBox="0 0 17.3242 10.4004" width="12" height="8">
            <path d="M8.48633 10.4004C8.73047 10.4004 8.97461 10.3027 9.14062 10.1172L16.6992 2.37305C16.8652 2.20703 16.9629 1.99219 16.9629 1.74805C16.9629 1.24023 16.582 0.849609 16.0742 0.849609C15.8301 0.849609 15.6055 0.947266 15.4395 1.10352L7.95898 8.75L9.00391 8.75L1.52344 1.10352C1.36719 0.947266 1.14258 0.849609 0.888672 0.849609C0.380859 0.849609 0 1.24023 0 1.74805C0 1.99219 0.0976562 2.20703 0.263672 2.38281L7.82227 10.1172C8.00781 10.3027 8.23242 10.4004 8.48633 10.4004Z" 
                  fill="currentColor"/>
          </svg>
        </button>
      `)
    }
    
    // Main content section
    parts.push(this.buildTaskMain(taskData, { isNew, insertMode }))
    
    // Right section with indicators and actions
    parts.push(this.buildTaskRight(taskData))
    
    return parts.join('')
  }

  // Build left section
  buildTaskLeft() {
    return `
      <div class="task-left">
        <input type="checkbox" 
               class="task-checkbox" 
               data-action="change->job#toggleTaskSelection">
        <div class="task-drag-handle" draggable="true">
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
            <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="3" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="3" cy="17" r="1.5" fill="currentColor"/>
            <circle cx="9" cy="17" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      </div>
    `
  }

  // Build main content section
  buildTaskMain(taskData, options = {}) {
    const { isNew, insertMode } = options
    
    let content = ''
    
    // Status button container (matches server-side structure)
    content += `
      <div class="dropdown-container task-status-container" 
           data-controller="dropdown"
           data-dropdown-positioning-value="fixed"
           data-dropdown-z-index-value="10000"
           data-dropdown-auto-width="true"
           data-dropdown-close-on-select-value="true">
        <button class="task-status-button" 
                data-dropdown-target="button"
                data-action="click->dropdown#toggle">
          <span>${this.taskStatusEmoji(taskData.status || 'new_task')}</span>
        </button>
        <div class="dropdown-menu hidden" data-dropdown-target="menu">
          ${this.buildStatusOptions(taskData)}
        </div>
      </div>
    `
    
    // Task content
    content += '<div class="task-content">'
    
    // Task title
    const titleAttrs = {
      class: 'task-title',
      contenteditable: 'true',
      'data-action': 'focus->job#taskTitleFocus blur->job#taskTitleBlur keydown->job#taskTitleKeydown'
    }
    
    if (isNew) {
      titleAttrs['data-action'] += ' blur->job#saveNewInlineTask keydown->job#handleNewTaskKeydown'
      titleAttrs['data-original-title'] = ''
    }
    
    content += `<div ${this.buildAttributes(titleAttrs)}>${this.escapeHtml(taskData.title || '')}</div>`
    
    // Timer for in-progress tasks
    if (taskData.status === 'in_progress' && taskData.duration_seconds) {
      content += this.buildTimer(taskData.duration_seconds)
    }
    
    content += '</div>'
    
    return content
  }

  // Build right section
  buildTaskRight(taskData) {
    let content = '<div class="task-right">'
    
    // Priority indicator
    if (taskData.priority && taskData.priority !== 'normal') {
      const priorityEmoji = this.controller.priorityEmoji ? 
        this.controller.priorityEmoji(taskData.priority) : ''
      if (priorityEmoji) {
        content += `<span class="priority-indicator" title="Priority: ${taskData.priority}">${priorityEmoji}</span>`
      }
    }
    
    // Note indicator
    if (taskData.notes_count > 0) {
      content += `
        <span class="note-indicator" title="Has notes">
          ${this.noteIconSVG(16, 16)}
        </span>
      `
    }
    
    // Assignee indicator
    if (taskData.assigned_technician) {
      const initials = this.getInitials(taskData.assigned_technician.name)
      content += `
        <span class="assignee-indicator" title="Assigned to ${taskData.assigned_technician.name}">
          <span class="assignee-initials">${initials}</span>
        </span>
      `
    }
    
    // Info button
    content += `
      <button class="task-info-button" 
              data-action="click->job#showTaskInfo"
              data-task-id="${taskData.id || ''}"
              title="Task details">
        ${this.infoIconSVG(16, 16, 'icon-info')}
      </button>
    `
    
    content += '</div>'
    
    return content
  }

  // Build timer display
  buildTimer(durationSeconds) {
    const minutes = Math.floor(durationSeconds / 60)
    const display = minutes > 59 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
    
    return `
      <div class="task-timer" 
           data-controller="timer" 
           data-timer-duration-value="${durationSeconds}">
        <span class="timer-display">${display}</span>
      </div>
    `
  }

  // Build status dropdown options
  buildStatusOptions(taskData) {
    const currentStatus = taskData.status || 'new_task'
    const statuses = [
      { key: 'new_task', label: 'New' },
      { key: 'in_progress', label: 'In Progress' },
      { key: 'paused', label: 'Paused' },
      { key: 'successfully_completed', label: 'Successfully Completed' },
      { key: 'cancelled', label: 'Cancelled' }
    ]
    
    return statuses.map(status => `
      <button class="task-status-option dropdown-option ${currentStatus === status.key ? 'active' : ''}"
              data-action="click->job#updateTaskStatus"
              data-task-id="${taskData.id || ''}"
              data-status="${status.key}">
        <span class="status-emoji">${this.taskStatusEmoji(status.key)}</span>
        <span>${status.label}</span>
      </button>
    `).join('')
  }

  // Attach event listeners to task element
  attachEventListeners(taskElement, options = {}) {
    // Click events
    taskElement.addEventListener('click', (e) => {
      if (!e.target.closest('button, input, [contenteditable]')) {
        this.controller.handleTaskClick(e)
      }
    })
  }

  // Utility methods
  buildAttributes(attrs) {
    return Object.entries(attrs)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ')
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text || ''
    return div.innerHTML
  }

  getInitials(name) {
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Update existing task element
  updateTaskElement(taskElement, updates) {
    // Update status
    if (updates.status) {
      taskElement.setAttribute(this.DATA_ATTRS.STATUS, updates.status)
      
      const statusButton = taskElement.querySelector('.task-status-button span')
      if (statusButton) {
        statusButton.textContent = this.taskStatusEmoji(updates.status)
      }
      
      // Update classes
      taskElement.classList.toggle(this.CLASSES.COMPLETED, updates.status === 'successfully_completed')
      taskElement.classList.toggle(this.CLASSES.CANCELLED, updates.status === 'cancelled')
    }
    
    // Update title
    if (updates.title !== undefined) {
      const titleElement = taskElement.querySelector('.task-title')
      if (titleElement) {
        titleElement.textContent = updates.title
      }
    }
    
    // Update priority
    if (updates.priority !== undefined) {
      taskElement.setAttribute(this.DATA_ATTRS.PRIORITY, updates.priority)
      // Update priority indicator
      this.updatePriorityIndicator(taskElement, updates.priority)
    }
    
    // Update assignee
    if (updates.assigned_technician !== undefined) {
      this.updateAssigneeIndicator(taskElement, updates.assigned_technician)
    }
    
    // Update notes count
    if (updates.notes_count !== undefined) {
      this.updateNoteIndicator(taskElement, updates.notes_count)
    }
  }

  updatePriorityIndicator(taskElement, priority) {
    const taskRight = taskElement.querySelector('.task-right')
    if (!taskRight) return
    
    const existing = taskRight.querySelector('.priority-indicator')
    
    if (priority && priority !== 'normal') {
      const emoji = this.controller.priorityEmoji ? 
        this.controller.priorityEmoji(priority) : ''
      
      if (emoji) {
        if (existing) {
          existing.textContent = emoji
          existing.title = `Priority: ${priority}`
        } else {
          const indicator = `<span class="priority-indicator" title="Priority: ${priority}">${emoji}</span>`
          taskRight.insertAdjacentHTML('afterbegin', indicator)
        }
      }
    } else if (existing) {
      existing.remove()
    }
  }

  updateAssigneeIndicator(taskElement, technician) {
    const taskRight = taskElement.querySelector('.task-right')
    if (!taskRight) return
    
    const existing = taskRight.querySelector('.assignee-indicator')
    
    if (technician) {
      const initials = this.getInitials(technician.name)
      
      if (existing) {
        existing.querySelector('.assignee-initials').textContent = initials
        existing.title = `Assigned to ${technician.name}`
      } else {
        const noteIndicator = taskRight.querySelector('.note-indicator')
        const insertPosition = noteIndicator ? 'afterend' : 'beforeend'
        const target = noteIndicator || taskRight
        
        const indicator = `
          <span class="assignee-indicator" title="Assigned to ${technician.name}">
            <span class="assignee-initials">${initials}</span>
          </span>
        `
        
        if (noteIndicator) {
          noteIndicator.insertAdjacentHTML('afterend', indicator)
        } else {
          const infoButton = taskRight.querySelector('.task-info-button')
          if (infoButton) {
            infoButton.insertAdjacentHTML('beforebegin', indicator)
          } else {
            taskRight.insertAdjacentHTML('beforeend', indicator)
          }
        }
      }
    } else if (existing) {
      existing.remove()
    }
  }

  updateNoteIndicator(taskElement, notesCount) {
    const taskRight = taskElement.querySelector('.task-right')
    if (!taskRight) return
    
    const existing = taskRight.querySelector('.note-indicator')
    
    if (notesCount > 0) {
      if (!existing) {
        const priorityIndicator = taskRight.querySelector('.priority-indicator')
        const insertPosition = priorityIndicator ? 'afterend' : 'afterbegin'
        const target = priorityIndicator || taskRight
        
        const indicator = `
          <span class="note-indicator" title="Has notes">
            ${this.noteIconSVG(16, 16)}
          </span>
        `
        
        if (priorityIndicator) {
          priorityIndicator.insertAdjacentHTML('afterend', indicator)
        } else {
          taskRight.insertAdjacentHTML('afterbegin', indicator)
        }
      }
    } else if (existing) {
      existing.remove()
    }
  }
}