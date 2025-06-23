import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="user-menu-popover"
export default class extends Controller {
  static targets = ["content"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 }
  }
  
  connect() {
    console.log('User menu popover controller connected')
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
    let left = triggerRect.right - popoverRect.width // Align to right edge by default for user menu
    
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
    
    // Close the popover
    this.hide()
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
}