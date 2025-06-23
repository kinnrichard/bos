import { Controller } from "@hotwired/stimulus"

// Base controller for all popovers with common behaviors
export default class extends Controller {
  static targets = ["content"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    animationDuration: { type: Number, default: 200 } // milliseconds
  }
  
  connect() {
    // Bind event handlers
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.handleResize = this.handleResize.bind(this)
    
    // Add to global popover tracker
    this.registerPopover()
    
    // Call child class connect if exists
    if (this.childConnect) {
      this.childConnect()
    }
  }
  
  disconnect() {
    this.unregisterPopover()
    
    // Call child class disconnect if exists
    if (this.childDisconnect) {
      this.childDisconnect()
    }
  }
  
  show() {
    // Close all other popovers first
    window.popoverManager?.closeAllExcept(this)
    
    this.element.classList.remove('hidden')
    
    // Track open state
    this.element.dataset.popoverOpen = "true"
    
    // Start listening for outside clicks after a small delay
    // This prevents the click that opened the popover from closing it
    setTimeout(() => {
      if (this.closeOnClickOutsideValue) {
        document.addEventListener("click", this.handleOutsideClick, true)
      }
    }, 50) // Increased delay for better reliability
    
    // Notify global tracker
    window.popoverManager?.popoverOpened(this)
    
    // Call child class method if exists
    if (this.onShow) {
      this.onShow()
    }
  }
  
  hide() {
    // Add hidden class which triggers CSS transition
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
    
    // Call child class method if exists
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
    // Store the trigger element
    this.triggerElement = triggerElement
    
    // First show the popover
    this.show()
    
    // Position after a brief delay to ensure proper dimensions
    requestAnimationFrame(() => {
      this.positionRelativeToTrigger(triggerElement)
    })
    
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
    let left = this.calculateHorizontalPosition(triggerRect, popoverRect, viewportWidth)
    
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
  
  // Override in subclasses for different alignment strategies
  calculateHorizontalPosition(triggerRect, popoverRect, viewportWidth) {
    // Default: center-aligned
    let left = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2)
    
    // Check if popover would go off the right edge
    if (left + popoverRect.width > viewportWidth - 10) {
      left = viewportWidth - popoverRect.width - 10
    }
    
    // Check if popover would go off the left edge
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
    // Don't close if clicking inside the popover
    if (this.element.contains(event.target)) {
      return
    }
    
    // Don't close if clicking on the trigger button - let the toggle method handle it
    if (this.triggerElement && (this.triggerElement === event.target || this.triggerElement.contains(event.target))) {
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
}