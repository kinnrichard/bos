import { Controller } from "@hotwired/stimulus"

// Dropdown Controller
// ===================
// Provides dropdown menu functionality with configurable positioning.
//
// Usage:
//   <div data-controller="dropdown">
//     <button data-dropdown-target="button" data-action="click->dropdown#toggle">
//       Menu
//     </button>
//     <div data-dropdown-target="menu" class="dropdown-menu hidden">
//       <!-- menu items -->
//     </div>
//   </div>
//
// Positioning Options:
//   - "absolute" (default): Standard positioning relative to container
//   - "fixed": Use for dropdowns in scrollable containers (auto-detected) or popovers
//
// Example with fixed positioning:
//   <div data-controller="dropdown" data-dropdown-positioning-value="fixed">
//
// The controller will auto-detect if it's in a scrollable container and switch
// to fixed positioning automatically.
//
// Connects to data-controller="dropdown"
export default class extends Controller {
  static targets = ["button", "menu", "display", "value"]
  static values = {
    zIndex: { type: Number, default: 9999 }, // Higher than popovers
    position: { type: String, default: "bottom" }, // bottom, top, left, right
    positioning: { type: String, default: "absolute" }, // "absolute" | "fixed" - use fixed for dropdowns in scrollable containers
    mode: { type: String, default: "single" }, // "single" | "multi" - single select or multi select
    closeOnSelect: { type: Boolean, default: true } // Whether to close dropdown after selection
  }
  
  connect() {
    console.log(`Dropdown controller connected! Positioning: ${this.positioningValue}`)
    // Bind event handlers
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    this.handleRepositioning = this.handleRepositioning.bind(this)
    
    // Determine if we should auto-detect fixed positioning
    if (this.positioningValue === "absolute" && this.isInScrollableContainer()) {
      console.log('Auto-detected scrollable container, switching to fixed positioning')
      this.positioningValue = "fixed"
    }
  }
  
  disconnect() {
    document.removeEventListener("click", this.handleOutsideClick, true)
    this.removePositioningListeners()
  }
  
  toggle(event) {
    console.log('Dropdown toggle clicked')
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
      console.log('Opening dropdown menu')
      // Show the menu
      this.menuTarget.classList.remove('hidden')
      
      // Track open state
      this.element.dataset.dropdownOpen = "true"
      
      // Position the menu
      this.positionMenu()
      
      // Add positioning listeners if using fixed positioning
      if (this.positioningValue === "fixed") {
        this.addPositioningListeners()
      }
      
      // Start listening for outside clicks
      setTimeout(() => {
        document.addEventListener("click", this.handleOutsideClick, true)
      }, 10)
      
      // Notify global tracker
      window.popoverManager?.dropdownOpened(this)
    }
  }
  
  close() {
    if (this.hasMenuTarget) {
      console.log('Closing dropdown menu')
      // Hide the menu
      this.menuTarget.classList.add('hidden')
      
      // Track closed state
      this.element.dataset.dropdownOpen = "false"
      
      // Stop listening for events
      document.removeEventListener("click", this.handleOutsideClick, true)
      this.removePositioningListeners()
      
      // Notify global tracker
      window.popoverManager?.dropdownClosed(this)
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
    if (!this.hasMenuTarget || !this.hasButtonTarget) return
    
    const buttonRect = this.buttonTarget.getBoundingClientRect()
    const menuStyle = this.menuTarget.style
    
    console.log(`Positioning menu - mode: ${this.positioningValue}, button width: ${buttonRect.width}`)
    
    if (this.positioningValue === "fixed") {
      // Fixed positioning - good for dropdowns in scrollable containers
      menuStyle.position = 'fixed'
      menuStyle.zIndex = this.zIndexValue
      
      // Calculate position based on button location
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      const menuHeight = this.menuTarget.offsetHeight || 200 // Estimate if not rendered
      
      // Position below button by default, above if not enough space
      if (spaceBelow >= menuHeight || spaceBelow > spaceAbove) {
        menuStyle.top = `${buttonRect.bottom + 4}px`
        menuStyle.bottom = 'auto'
      } else {
        menuStyle.bottom = `${window.innerHeight - buttonRect.top + 4}px`
        menuStyle.top = 'auto'
      }
      
      // Horizontal positioning
      menuStyle.left = `${buttonRect.left}px`
      menuStyle.width = `${buttonRect.width}px` // Match button width exactly
      
      // After setting initial position, check bounds
      // Need to force a reflow to get accurate measurements
      this.menuTarget.offsetHeight
      
      // Ensure menu doesn't go off screen horizontally
      const menuRect = this.menuTarget.getBoundingClientRect()
      if (menuRect.right > window.innerWidth) {
        menuStyle.left = `${window.innerWidth - menuRect.width - 10}px`
      }
    } else {
      // Absolute positioning - default behavior
      menuStyle.position = 'absolute'
      menuStyle.zIndex = this.zIndexValue
      menuStyle.width = `${buttonRect.width}px` // Also set width for absolute positioning
    }
  }
  
  // Helper methods for positioning
  isInScrollableContainer() {
    let element = this.element.parentElement
    while (element && element !== document.body) {
      const style = window.getComputedStyle(element)
      if (style.overflow === 'auto' || style.overflow === 'scroll' || 
          style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return true
      }
      element = element.parentElement
    }
    return false
  }
  
  addPositioningListeners() {
    // Reposition on scroll/resize for fixed positioning
    window.addEventListener('scroll', this.handleRepositioning, true)
    window.addEventListener('resize', this.handleRepositioning)
  }
  
  removePositioningListeners() {
    window.removeEventListener('scroll', this.handleRepositioning, true)
    window.removeEventListener('resize', this.handleRepositioning)
  }
  
  handleRepositioning() {
    if (this.isOpen) {
      this.positionMenu()
    }
  }
  
  // Generic selection handler
  select(event) {
    event.preventDefault()
    event.stopPropagation()
    
    const option = event.currentTarget
    const value = option.dataset.value
    const label = option.dataset.label || option.textContent.trim()
    
    if (this.modeValue === 'multi') {
      this.handleMultiSelect(option, value, label)
    } else {
      this.handleSingleSelect(option, value, label)
    }
  }
  
  handleSingleSelect(option, value, label) {
    // Update hidden input if exists
    if (this.hasValueTarget) {
      this.valueTarget.value = value
    }
    
    // Update display if exists
    if (this.hasDisplayTarget) {
      this.displayTarget.textContent = label
    }
    
    // Update visual state
    this.menuTarget.querySelectorAll('.dropdown-option').forEach(opt => {
      opt.classList.remove('active', 'selected')
    })
    option.classList.add('active', 'selected')
    
    // Dispatch custom event for parent controllers
    this.dispatch('select', { detail: { value, label } })
    
    // Close dropdown if configured
    if (this.closeOnSelectValue) {
      this.close()
    }
  }
  
  handleMultiSelect(option, value, label) {
    // Find checkbox within option
    const checkbox = option.querySelector('input[type="checkbox"]')
    if (checkbox) {
      checkbox.checked = !checkbox.checked
    }
    
    // Toggle visual state
    option.classList.toggle('active')
    
    // Update check mark
    const checkmark = option.querySelector('.dropdown-check')
    if (!checkmark && option.classList.contains('active')) {
      option.insertAdjacentHTML('beforeend', '<span class="dropdown-check">✓</span>')
    } else if (checkmark && !option.classList.contains('active')) {
      checkmark.remove()
    }
    
    // Collect all selected values
    const selectedOptions = Array.from(this.menuTarget.querySelectorAll('.dropdown-option.active'))
    const selectedValues = selectedOptions.map(opt => opt.dataset.value)
    const selectedLabels = selectedOptions.map(opt => opt.dataset.label || opt.textContent.trim())
    
    // Update display
    if (this.hasDisplayTarget) {
      if (selectedOptions.length === 0) {
        this.displayTarget.textContent = this.element.dataset.placeholder || 'Select...'
      } else if (selectedOptions.length === 1) {
        this.displayTarget.textContent = selectedLabels[0]
      } else {
        this.displayTarget.textContent = `${selectedOptions.length} selected`
      }
    }
    
    // Dispatch custom event
    this.dispatch('select', { detail: { values: selectedValues, labels: selectedLabels } })
  }
}