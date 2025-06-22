import { Controller } from "@hotwired/stimulus"

// Base controller for all dropdowns with proper z-index and positioning
export default class extends Controller {
  static targets = ["button", "menu"]
  static values = {
    zIndex: { type: Number, default: 9999 }, // Higher than popovers
    position: { type: String, default: "bottom" } // bottom, top, left, right
  }
  
  connect() {
    // Bind event handlers
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.positionMenu = this.positionMenu.bind(this)
    
    // Call child class connect if exists
    if (this.childConnect) {
      this.childConnect()
    }
  }
  
  disconnect() {
    document.removeEventListener("click", this.handleOutsideClick, true)
    window.removeEventListener("scroll", this.positionMenu, true)
    window.removeEventListener("resize", this.positionMenu)
    
    // Call child class disconnect if exists
    if (this.childDisconnect) {
      this.childDisconnect()
    }
  }
  
  toggle(event) {
    event.preventDefault()
    event.stopPropagation()
    
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }
  
  open() {
    if (this.hasMenuTarget) {
      // Show the menu
      this.menuTarget.classList.remove('hidden')
      
      // Track open state
      this.element.dataset.dropdownOpen = "true"
      
      // Position the menu using CSS
      this.positionMenu()
      
      // Start listening for events
      setTimeout(() => {
        document.addEventListener("click", this.handleOutsideClick, true)
      }, 10)
      
      // Notify global tracker
      window.popoverManager?.dropdownOpened(this)
      
      // Call child class method if exists
      if (this.onOpen) {
        this.onOpen()
      }
    }
  }
  
  close() {
    if (this.hasMenuTarget) {
      // Hide the menu
      this.menuTarget.classList.add('hidden')
      
      // Track closed state
      this.element.dataset.dropdownOpen = "false"
      
      // Stop listening for events
      document.removeEventListener("click", this.handleOutsideClick, true)
      
      // Notify global tracker
      window.popoverManager?.dropdownClosed(this)
      
      // Call child class method if exists
      if (this.onClose) {
        this.onClose()
      }
    }
  }
  
  get isOpen() {
    return this.hasMenuTarget && !this.menuTarget.classList.contains('hidden')
  }
  
  handleOutsideClick(event) {
    // Don't close if clicking inside the dropdown
    if (this.element.contains(event.target) || this.menuTarget.contains(event.target)) {
      return
    }
    
    this.close()
  }
  
  positionMenu() {
    // Simple CSS-based positioning
    // The menu should be positioned relative to its container
    // Let CSS handle the actual positioning
  }
}