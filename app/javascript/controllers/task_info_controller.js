import BasePopoverController from "shared/base_popover_controller"
import { noteIconSVG } from "shared/icons"

export default class extends BasePopoverController {
  static targets = ["timelineContainer", "noteInput", "timer"]
  static values = { 
    taskId: Number,
    clientId: Number,
    jobId: Number
  }
  
  timerInterval = null
  
  // Override positioning for left/right placement instead of top/bottom
  positionRelativeToTrigger(triggerElement) {
    if (!triggerElement) return
    
    const triggerRect = triggerElement.getBoundingClientRect()
    const popoverRect = this.element.getBoundingClientRect()
    const arrowElement = this.element.querySelector('.popover-arrow')
    
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Position to the left of the trigger by default
    let left = triggerRect.left - popoverRect.width - 8
    let top = triggerRect.top + (triggerRect.height / 2) - (popoverRect.height / 2)
    
    // Position arrow based on popover position
    let arrowOnRight = true // Arrow on right side by default (popover to left of button)
    
    // If popover would go off the left edge, position to the right instead
    if (left < 10) {
      left = triggerRect.right + 8
      arrowOnRight = false // Arrow should be on left side
    }
    
    // Position arrow
    if (arrowElement) {
      // Calculate vertical position of arrow relative to trigger
      const arrowTop = triggerRect.top + (triggerRect.height / 2) - top
      
      if (arrowOnRight) {
        // Arrow on right side pointing right (to the button)
        arrowElement.style.left = 'auto'
        arrowElement.style.right = '-6px'
        arrowElement.style.top = `${arrowTop}px`
        arrowElement.style.bottom = 'auto'
        arrowElement.style.transform = 'translateY(-50%) rotate(90deg)'
      } else {
        // Arrow on left side pointing left (to the button)
        arrowElement.style.left = '-6px'
        arrowElement.style.right = 'auto'
        arrowElement.style.top = `${arrowTop}px`
        arrowElement.style.bottom = 'auto'
        arrowElement.style.transform = 'translateY(-50%) rotate(-90deg)'
      }
    }
    
    // Ensure popover doesn't go off the top
    if (top < 10) {
      top = 10
    }
    
    // Ensure popover doesn't go off the bottom
    if (top + popoverRect.height > viewportHeight - 10) {
      top = viewportHeight - popoverRect.height - 10
    }
    
    // Ensure popover doesn't go off the right
    if (left + popoverRect.width > viewportWidth - 10) {
      left = viewportWidth - popoverRect.width - 10
    }
    
    this.element.style.position = 'fixed'
    this.element.style.top = `${top}px`
    this.element.style.left = `${left}px`
    this.element.style.right = 'auto'
  }
  
  childConnect() {
    // Start timer if task is in progress
    if (this.hasTimerTarget && this.timerTarget.dataset.duration) {
      this.startTimer()
    }
  }
  
  childDisconnect() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }
  
  onShow() {
    // Scroll to bottom to show latest updates
    setTimeout(() => {
      const scrollableContainer = this.element.querySelector('.popover-content-scrollable')
      if (scrollableContainer) {
        scrollableContainer.scrollTo({
          top: scrollableContainer.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 50) // Small delay to ensure content is rendered
  }
  
  onHide() {
    // Clear timer when hiding
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }
  
  async addNote() {
    const content = this.noteInputTarget.value.trim()
    if (!content) return
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${this.taskIdValue}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ note: { content } })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Add note to the container
        this.prependNote(data.note)
        // Clear input
        this.noteInputTarget.value = ''
        // Update note indicator in task list
        this.updateNoteIndicator(true)
      } else {
        console.error('Failed to add note')
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }
  
  async updateAssignment(event) {
    const technicianId = event.currentTarget.dataset.technicianId
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${this.taskIdValue}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ technician_id: technicianId || null })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Update assignment display
        this.updateAssignmentDisplay(data.technician)
        // Update assignee indicator in task list
        this.updateAssigneeIndicator(data.technician)
      } else {
        console.error('Failed to update assignment')
      }
    } catch (error) {
      console.error('Error updating assignment:', error)
    }
  }
  
  prependNote(note) {
    // Check if we need a new header
    const lastItem = this.timelineContainerTarget.lastElementChild
    const needsHeader = !lastItem || !lastItem.classList.contains('timeline-header') || 
                       !lastItem.textContent.includes(note.user_name) || 
                       !lastItem.textContent.includes('Today')
    
    let html = ''
    if (needsHeader) {
      // Generate initials
      const initials = note.user_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      
      html += `
        <div class="timeline-header">
          <div class="timeline-header-left">
            <span class="timeline-header-icon">
              <span>${initials}</span>
            </span>
            <span class="timeline-header-user">${note.user_name}</span>
          </div>
          <span class="timeline-header-date">Today</span>
        </div>
      `
    }
    
    // Add note to timeline
    html += `
      <div class="timeline-item timeline-item--note" data-note-id="${note.id}">
        <div class="timeline-row">
          <div class="timeline-content">
            <span class="timeline-emoji">
              ${noteIconSVG(18, 18)}
            </span>
            <span class="timeline-note">${this.escapeHtml(note.content)}</span>
          </div>
          <div class="timeline-time">
            <span>${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    `
    
    // Insert at the end of timeline (newest items at bottom)
    this.timelineContainerTarget.insertAdjacentHTML('beforeend', html)
    
    // Scroll to bottom to show new note
    const scrollableContainer = this.element.querySelector('.popover-content-scrollable')
    if (scrollableContainer) {
      scrollableContainer.scrollTo({
        top: scrollableContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }
  
  updateAssignmentDisplay(technician) {
    const dropdownValue = this.element.querySelector('.dropdown-value')
    if (!dropdownValue) return
    
    if (technician) {
      const initials = technician.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      dropdownValue.innerHTML = `
        <span class="technician-badge">${initials}</span>
        <span>${technician.name}</span>
      `
    } else {
      dropdownValue.innerHTML = `
        <span>❓</span>
        <span>Unassigned</span>
      `
    }
  }
  
  updateNoteIndicator(hasNotes) {
    const taskElement = document.querySelector(`[data-task-id="${this.taskIdValue}"]`)
    if (!taskElement) return
    
    const taskRight = taskElement.querySelector('.task-right')
    const existingIndicator = taskRight.querySelector('.note-indicator')
    
    if (hasNotes && !existingIndicator) {
      // Add note indicator after info button
      const infoButton = taskRight.querySelector('.task-info-button')
      const noteIndicatorSvg = `
        <span class="note-indicator" title="Has notes">
          ${noteIconSVG(16, 16)}
        </span>
      `
      infoButton.insertAdjacentHTML('afterend', noteIndicatorSvg)
    }
  }
  
  updateAssigneeIndicator(technician) {
    const taskElement = document.querySelector(`[data-task-id="${this.taskIdValue}"]`)
    if (!taskElement) return
    
    const taskRight = taskElement.querySelector('.task-right')
    const existingIndicator = taskRight.querySelector('.assignee-indicator')
    
    if (technician) {
      const initials = technician.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      if (existingIndicator) {
        existingIndicator.querySelector('.assignee-initials').textContent = initials
        existingIndicator.title = `Assigned to ${technician.name}`
      } else {
        // Add assignee indicator
        const html = `
          <span class="assignee-indicator" title="Assigned to ${technician.name}">
            <span class="assignee-initials">${initials}</span>
          </span>
        `
        taskRight.insertAdjacentHTML('beforeend', html)
      }
    } else if (existingIndicator) {
      existingIndicator.remove()
    }
  }
  
  startTimer() {
    let startDuration = parseInt(this.timerTarget.dataset.duration) || 0
    const startTime = Date.now() - (startDuration * 1000)
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      this.timerTarget.textContent = this.formatDuration(elapsed)
    }
    
    updateTimer()
    this.timerInterval = setInterval(updateTimer, 1000)
  }
  
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}