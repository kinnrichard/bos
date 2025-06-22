import { Controller } from "@hotwired/stimulus"

// Base controller for all popovers with common behaviors
export default class extends Controller {
  static targets = ["content"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 }
  }
  
  connect() {
    // Bind event handlers
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    
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
    this.element.classList.add('hidden')
    
    // Track closed state
    this.element.dataset.popoverOpen = "false"
    
    // Stop listening for outside clicks
    document.removeEventListener("click", this.handleOutsideClick, true)
    
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
  
  get isOpen() {
    return !this.element.classList.contains('hidden')
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
}