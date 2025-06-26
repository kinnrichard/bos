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
  static targets = ["timelineContainer", "noteInput", "timer"]
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
  
  onShow() {
    // Scroll to bottom to show latest updates
    setTimeout(() => {
      const scrollableContainer = this.element.querySelector('.popover-content-scrollable')
      if (scrollableContainer) {
        scrollableContainer.scrollTop = scrollableContainer.scrollHeight
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.8242 17.998" width="18" height="18" style="display: block;">
                <path d="M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258Z" fill="currentColor" fill-opacity="0.85"/>
                <path d="M4.61914 8.11523L14.873 8.11523C15.2148 8.11523 15.4785 7.8418 15.4785 7.5C15.4785 7.16797 15.2148 6.91406 14.873 6.91406L4.61914 6.91406C4.25781 6.91406 4.00391 7.16797 4.00391 7.5C4.00391 7.8418 4.25781 8.11523 4.61914 8.11523Z" fill="currentColor" fill-opacity="0.85"/>
                <path d="M4.61914 11.0547L14.873 11.0547C15.2148 11.0547 15.4785 10.8008 15.4785 10.4688C15.4785 10.1172 15.2148 9.85352 14.873 9.85352L4.61914 9.85352C4.25781 9.85352 4.00391 10.1172 4.00391 10.4688C4.00391 10.8008 4.25781 11.0547 4.61914 11.0547Z" fill="currentColor" fill-opacity="0.85"/>
                <path d="M4.61914 13.9941L11.1328 13.9941C11.4746 13.9941 11.7383 13.7402 11.7383 13.4082C11.7383 13.0664 11.4746 12.793 11.1328 12.793L4.61914 12.793C4.25781 12.793 4.00391 13.0664 4.00391 13.4082C4.00391 13.7402 4.25781 13.9941 4.61914 13.9941Z" fill="currentColor" fill-opacity="0.85"/>
              </svg>
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
      scrollableContainer.scrollTop = scrollableContainer.scrollHeight
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.8242 17.998" width="16" height="16">
            <path d="M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258Z" fill="currentColor" fill-opacity="0.85"/>
            <path d="M4.61914 8.11523L14.873 8.11523C15.2148 8.11523 15.4785 7.8418 15.4785 7.5C15.4785 7.16797 15.2148 6.91406 14.873 6.91406L4.61914 6.91406C4.25781 6.91406 4.00391 7.16797 4.00391 7.5C4.00391 7.8418 4.25781 8.11523 4.61914 8.11523Z" fill="currentColor" fill-opacity="0.85"/>
            <path d="M4.61914 11.0547L14.873 11.0547C15.2148 11.0547 15.4785 10.8008 15.4785 10.4688C15.4785 10.1172 15.2148 9.85352 14.873 9.85352L4.61914 9.85352C4.25781 9.85352 4.00391 10.1172 4.00391 10.4688C4.00391 10.8008 4.25781 11.0547 4.61914 11.0547Z" fill="currentColor" fill-opacity="0.85"/>
            <path d="M4.61914 13.9941L11.1328 13.9941C11.4746 13.9941 11.7383 13.7402 11.7383 13.4082C11.7383 13.0664 11.4746 12.793 11.1328 12.793L4.61914 12.793C4.25781 12.793 4.00391 13.0664 4.00391 13.4082C4.00391 13.7402 4.25781 13.9941 4.61914 13.9941Z" fill="currentColor" fill-opacity="0.85"/>
          </svg>
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