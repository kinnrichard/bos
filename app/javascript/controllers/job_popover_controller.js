import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="job-popover"
export default class extends Controller {
  static targets = ["content"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    jobId: Number,
    clientId: Number
  }
  
  connect() {
    console.log('Job popover controller connected')
    // Bind event handlers
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.handleResize = this.handleResize.bind(this)
    
    // Add to global popover tracker
    this.registerPopover()
  }
  
  disconnect() {
    this.unregisterPopover()
  }
  
  show() {
    // Close all other popovers first
    window.popoverManager?.closeAllExcept(this)
    
    this.element.classList.remove('hidden')
    
    // Track open state
    this.element.dataset.popoverOpen = "true"
    
    // Update dropdown displays to reflect current state
    this.updateDropdownDisplays()
    
    // Start listening for outside clicks after a small delay
    setTimeout(() => {
      if (this.closeOnClickOutsideValue) {
        document.addEventListener("click", this.handleOutsideClick, true)
      }
    }, 50)
    
    // Notify global tracker
    window.popoverManager?.popoverOpened(this)
  }
  
  hide() {
    this.element.classList.add('hidden')
    
    // Track closed state
    this.element.dataset.popoverOpen = "false"
    
    // Stop listening for outside clicks
    document.removeEventListener("click", this.handleOutsideClick, true)
    
    // Stop listening for resize/scroll
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('scroll', this.handleResize, true)
    
    // Clear trigger element reference
    this.triggerElement = null
    
    // Close any open dropdowns within this popover
    this.closeChildDropdowns()
    
    // Notify global tracker
    window.popoverManager?.popoverClosed(this)
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
    // Store the trigger element
    this.triggerElement = triggerElement
    
    // First show the popover
    this.show()
    
    // Then position it relative to the trigger
    this.positionRelativeToTrigger(triggerElement)
    
    // Listen for window resize
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('scroll', this.handleResize, true)
  }
  
  positionRelativeToTrigger(triggerElement) {
    if (!triggerElement) return
    
    const triggerRect = triggerElement.getBoundingClientRect()
    const popoverRect = this.element.getBoundingClientRect()
    const arrowElement = this.element.querySelector('.popover-arrow')
    
    // Calculate positions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Default positioning below the trigger
    let top = triggerRect.bottom + 8 // 8px gap
    let left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2)
    
    // Check if popover would go off the right edge
    if (left + popoverRect.width > viewportWidth - 10) {
      left = viewportWidth - popoverRect.width - 10
    }
    
    // Check if popover would go off the left edge
    if (left < 10) {
      left = 10
    }
    
    // Check if popover would go off the bottom
    if (top + popoverRect.height > viewportHeight - 10) {
      // Position above the trigger instead
      top = triggerRect.top - popoverRect.height - 8
      
      // Move arrow to bottom
      if (arrowElement) {
        arrowElement.style.top = 'auto'
        arrowElement.style.bottom = '-6px'
        arrowElement.style.transform = 'rotate(180deg)'
      }
    } else {
      // Reset arrow to top
      if (arrowElement) {
        arrowElement.style.top = '-6px'
        arrowElement.style.bottom = 'auto'
        arrowElement.style.transform = 'none'
      }
    }
    
    // Position arrow horizontally to point at trigger
    if (arrowElement) {
      const arrowLeft = triggerRect.left + (triggerRect.width / 2) - left - 6 // 6px is half arrow width
      arrowElement.style.left = `${Math.max(10, Math.min(arrowLeft, popoverRect.width - 20))}px`
      arrowElement.style.right = 'auto'
    }
    
    // Apply positioning
    this.element.style.position = 'fixed'
    this.element.style.top = `${top}px`
    this.element.style.left = `${left}px`
    this.element.style.right = 'auto'
  }
  
  get isOpen() {
    return !this.element.classList.contains('hidden')
  }
  
  handleResize() {
    if (this.triggerElement && this.isOpen) {
      this.positionRelativeToTrigger(this.triggerElement)
    }
  }
  
  handleOutsideClick(event) {
    // Don't close if clicking inside the popover
    if (this.element.contains(event.target)) {
      return
    }
    
    // Don't close if clicking on the trigger that opened this popover
    const trigger = event.target.closest('[data-action*="toggle"]')
    if (trigger && trigger.dataset.action.includes(this.identifier)) {
      return
    }
    
    // Check if clicking on a dropdown menu
    const clickedDropdown = event.target.closest('.dropdown-menu')
    if (clickedDropdown) {
      return
    }
    
    // Check if there are open dropdowns in this popover
    const openDropdowns = this.element.querySelectorAll('.dropdown-menu:not(.hidden)')
    if (openDropdowns.length > 0) {
      // Close dropdowns first
      openDropdowns.forEach(dropdown => {
        dropdown.classList.add('hidden')
      })
      return
    }
    
    // No open dropdowns, close the popover
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
    // Initialize global popover manager if needed
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
  
  updateDropdownDisplays() {
    // Get the job controller to access current values
    const jobView = document.querySelector('.job-view')
    if (!jobView) return
    
    const jobController = this.application.getControllerForElementAndIdentifier(jobView, 'job')
    if (!jobController) return
    
    // Update status dropdown
    const statusDropdown = this.element.querySelector('.popover-section:nth-child(1) .dropdown-container')
    if (statusDropdown) {
      const currentStatus = jobController.statusValue || jobController.getValueFromJobView('jobStatusValue')
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
      
      const statusValue = statusDropdown.querySelector('.dropdown-value')
      if (statusValue && currentStatus) {
        statusValue.innerHTML = `
          <span class="status-emoji">${statusEmojis[currentStatus] || '⚫'}</span>
          <span>${statusLabels[currentStatus] || currentStatus}</span>
        `
      }
      
      // Update active states
      statusDropdown.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.status === currentStatus)
      })
    }
    
    // Update priority dropdown
    const priorityDropdown = this.element.querySelector('.popover-section:nth-child(3) .dropdown-container')
    if (priorityDropdown) {
      const currentPriority = jobController.priorityValue || jobController.getValueFromJobView('jobPriorityValue')
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
      
      const priorityValue = priorityDropdown.querySelector('.dropdown-value')
      if (priorityValue && currentPriority) {
        const emoji = priorityEmojis[currentPriority] || ''
        const label = priorityLabels[currentPriority] || currentPriority
        priorityValue.innerHTML = emoji ? 
          `<span class="priority-emoji">${emoji}</span><span>${label}</span>` :
          `<span>${label}</span>`
      }
      
      // Update active states
      priorityDropdown.querySelectorAll('.priority-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.priority === currentPriority)
      })
    }
    
    // Update assignee dropdown (more complex due to multi-select)
    const assigneeDropdown = this.element.querySelector('.popover-section:nth-child(2) .dropdown-container')
    if (assigneeDropdown) {
      // Get currently selected technicians from active assignee options
      const activeTechs = assigneeDropdown.querySelectorAll('.assignee-option.active[data-technician-id]')
      const assigneeValue = assigneeDropdown.querySelector('.dropdown-value')
      
      if (assigneeValue) {
        if (activeTechs.length === 0) {
          // Check if unassigned option is active
          const unassignedActive = assigneeDropdown.querySelector('.assignee-option[data-action*="setUnassigned"]')?.classList.contains('active')
          if (!unassignedActive) {
            // If nothing is marked active, default to unassigned
            const unassignedOption = assigneeDropdown.querySelector('.assignee-option[data-action*="setUnassigned"]')
            if (unassignedOption) {
              unassignedOption.classList.add('active')
            }
          }
          assigneeValue.innerHTML = '<span>❓</span><span>Unassigned</span>'
        } else if (activeTechs.length === 1) {
          const tech = activeTechs[0]
          const iconHtml = tech.querySelector('span:first-child')?.outerHTML || ''
          const name = tech.querySelector('span:nth-child(2)')?.textContent || ''
          assigneeValue.innerHTML = `${iconHtml}<span>${name}</span>`
        } else {
          assigneeValue.innerHTML = `<span>${activeTechs.length} assigned</span>`
        }
      }
    }
  }
}