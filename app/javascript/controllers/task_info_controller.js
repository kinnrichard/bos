// Import BasePopoverController
import { Controller } from "@hotwired/stimulus"

// Copy BasePopoverController methods inline for now to fix module loading issue
class BasePopoverController extends Controller {
  static targets = ["content"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    animationDuration: { type: Number, default: 200 }
  }
  
  connect() {
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.handleResize = this.handleResize.bind(this)
    this.registerPopover()
    if (this.childConnect) {
      this.childConnect()
    }
  }
  
  disconnect() {
    this.unregisterPopover()
    if (this.childDisconnect) {
      this.childDisconnect()
    }
  }
  
  show() {
    window.popoverManager?.closeAllExcept(this)
    this.element.classList.remove('hidden')
    this.element.dataset.popoverOpen = "true"
    setTimeout(() => {
      if (this.closeOnClickOutsideValue) {
        document.addEventListener("click", this.handleOutsideClick, true)
      }
    }, 50)
    window.popoverManager?.popoverOpened(this)
    if (this.onShow) {
      this.onShow()
    }
  }
  
  hide() {
    this.element.classList.add('hidden')
    this.element.dataset.popoverOpen = "false"
    document.removeEventListener("click", this.handleOutsideClick, true)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('scroll', this.handleResize, true)
    this.triggerElement = null
    this.closeChildDropdowns()
    window.popoverManager?.popoverClosed(this)
    if (this.onHide) {
      this.onHide()
    }
  }
  
  toggle() {
    if (this.isOpen) {
      this.hide()
    } else {
      this.show()
    }
  }
  
  toggleWithTrigger(triggerElement) {
    if (this.isOpen) {
      this.hide()
    } else {
      this.showWithTrigger(triggerElement)
    }
  }
  
  showWithTrigger(triggerElement) {
    this.triggerElement = triggerElement
    this.show()
    requestAnimationFrame(() => {
      this.positionRelativeToTrigger(triggerElement)
    })
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('scroll', this.handleResize, true)
  }
  
  positionRelativeToTrigger(triggerElement) {
    if (!triggerElement) return
    
    const triggerRect = triggerElement.getBoundingClientRect()
    const popoverRect = this.element.getBoundingClientRect()
    const arrowElement = this.element.querySelector('.popover-arrow')
    
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let top = triggerRect.bottom + 8
    let left = this.calculateHorizontalPosition(triggerRect, popoverRect, viewportWidth)
    
    if (top + popoverRect.height > viewportHeight - 10) {
      top = triggerRect.top - popoverRect.height - 8
      if (arrowElement) {
        arrowElement.style.top = 'auto'
        arrowElement.style.bottom = '-6px'
        arrowElement.style.transform = 'rotate(180deg)'
      }
    } else {
      if (arrowElement) {
        arrowElement.style.top = '-6px'
        arrowElement.style.bottom = 'auto'
        arrowElement.style.transform = 'none'
      }
    }
    
    if (arrowElement) {
      const arrowLeft = triggerRect.left + (triggerRect.width / 2) - left - 6
      arrowElement.style.left = `${Math.max(10, Math.min(arrowLeft, popoverRect.width - 20))}px`
      arrowElement.style.right = 'auto'
    }
    
    this.element.style.position = 'fixed'
    this.element.style.top = `${top}px`
    this.element.style.left = `${left}px`
    this.element.style.right = 'auto'
  }
  
  calculateHorizontalPosition(triggerRect, popoverRect, viewportWidth) {
    let left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2)
    if (left + popoverRect.width > viewportWidth - 10) {
      left = viewportWidth - popoverRect.width - 10
    }
    if (left < 10) {
      left = 10
    }
    return left
  }
  
  handleResize() {
    if (this.triggerElement && this.isOpen) {
      this.positionRelativeToTrigger(this.triggerElement)
    }
  }
  
  get isOpen() {
    return !this.element.classList.contains('hidden')
  }
  
  handleOutsideClick(event) {
    if (this.element.contains(event.target)) {
      return
    }
    if (this.triggerElement && (this.triggerElement === event.target || this.triggerElement.contains(event.target))) {
      return
    }
    const clickedDropdownElement = event.target.closest('[data-controller~="dropdown"]')
    if (clickedDropdownElement && this.element.contains(clickedDropdownElement)) {
      return
    }
    const clickedDropdownMenu = event.target.closest('.dropdown-menu')
    if (clickedDropdownMenu) {
      return
    }
    const openDropdowns = this.element.querySelectorAll('.dropdown-menu:not(.hidden)')
    if (openDropdowns.length > 0) {
      this.closeChildDropdowns()
      return
    }
    this.hide()
  }
  
  closeChildDropdowns() {
    const dropdowns = this.element.querySelectorAll('[data-controller~="dropdown"]')
    dropdowns.forEach(dropdown => {
      const controller = this.application.getControllerForElementAndIdentifier(dropdown, 'dropdown')
      if (controller && controller.close) {
        controller.close()
      }
    })
  }
  
  registerPopover() {
    if (!window.popoverManager) {
      window.popoverManager = {
        popovers: new Set(),
        dropdowns: new Set(),
        popoverOpened(popover) {
          this.popovers.add(popover)
        },
        popoverClosed(popover) {
          this.popovers.delete(popover)
        },
        dropdownOpened(dropdown) {
          this.dropdowns.add(dropdown)
        },
        dropdownClosed(dropdown) {
          this.dropdowns.delete(dropdown)
        },
        closeAllExcept(keepOpen) {
          this.popovers.forEach(popover => {
            if (popover !== keepOpen && popover.hide) {
              popover.hide()
            }
          })
        }
      }
    }
    window.popoverManager.popovers.add(this)
  }
  
  unregisterPopover() {
    window.popoverManager?.popovers.delete(this)
  }
}

export default class extends BasePopoverController {
  static targets = ["notesContainer", "noteInput", "timer"]
  static values = { 
    taskId: Number,
    clientId: Number,
    jobId: Number
  }
  
  timerInterval = null
  
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
  
  close() {
    this.hide()
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
    // Remove "no notes" message if it exists
    const noNotes = this.notesContainerTarget.querySelector('.no-notes')
    if (noNotes) {
      noNotes.remove()
    }
    
    const noteHtml = `
      <div class="note-item" data-note-id="${note.id}">
        <div class="note-header">
          <span class="note-author">${note.user_name}</span>
          <span class="note-time">0s ago</span>
        </div>
        <div class="note-content">${this.escapeHtml(note.content)}</div>
      </div>
    `
    
    this.notesContainerTarget.insertAdjacentHTML('afterbegin', noteHtml)
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
      infoButton.insertAdjacentHTML('afterend', '<span class="note-indicator" title="Has notes">📝</span>')
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