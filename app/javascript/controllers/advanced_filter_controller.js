import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger", "popover", "form"]
  
  connect() {
    this.isOpen = false
    this.boundClickOutside = this.clickOutside.bind(this)
    this.boundKeydown = this.handleKeydown.bind(this)
  }
  
  disconnect() {
    this.removeEventListeners()
  }
  
  toggle(event) {
    event.stopPropagation()
    this.isOpen ? this.close() : this.open()
  }
  
  open() {
    this.isOpen = true
    this.popoverTarget.classList.remove("hidden")
    this.triggerTarget.setAttribute("aria-expanded", "true")
    
    // Position the popover
    this.positionPopover()
    
    // Add event listeners
    requestAnimationFrame(() => {
      document.addEventListener("click", this.boundClickOutside)
      document.addEventListener("keydown", this.boundKeydown)
    })
  }
  
  close() {
    this.isOpen = false
    this.popoverTarget.classList.add("hidden")
    this.triggerTarget.setAttribute("aria-expanded", "false")
    this.removeEventListeners()
  }
  
  clear(event) {
    event.preventDefault()
    
    // Uncheck all checkboxes
    this.formTarget.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false
    })
    
    // Submit the form to clear filters
    const url = new URL(this.formTarget.action)
    const filterParam = this.formTarget.querySelector('input[name="filter"]').value
    if (filterParam) {
      url.searchParams.set('filter', filterParam)
    }
    window.location.href = url.toString()
  }
  
  positionPopover() {
    const trigger = this.triggerTarget
    const popover = this.popoverTarget
    const triggerRect = trigger.getBoundingClientRect()
    
    // Calculate position relative to viewport
    let top = triggerRect.bottom + 8
    let right = window.innerWidth - triggerRect.right
    
    // Ensure minimum spacing from edges
    const minSpacing = 20
    
    // Get popover dimensions after making visible
    popover.style.visibility = 'hidden'
    popover.style.display = 'block'
    const popoverRect = popover.getBoundingClientRect()
    popover.style.visibility = ''
    popover.style.display = ''
    
    // Adjust horizontal position if needed
    if (right < minSpacing) {
      right = minSpacing
    } else if (right + popoverRect.width > window.innerWidth - minSpacing) {
      right = window.innerWidth - popoverRect.width - minSpacing
    }
    
    // Adjust vertical position if popover would go off bottom
    if (top + popoverRect.height > window.innerHeight - minSpacing) {
      // Position above the trigger
      top = triggerRect.top - popoverRect.height - 8
      popover.classList.add("above")
    } else {
      popover.classList.remove("above")
    }
    
    // Ensure popover doesn't go above viewport
    if (top < minSpacing) {
      top = minSpacing
    }
    
    popover.style.top = `${top}px`
    popover.style.right = `${right}px`
  }
  
  clickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
  
  handleKeydown(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }
  
  removeEventListeners() {
    document.removeEventListener("click", this.boundClickOutside)
    document.removeEventListener("keydown", this.boundKeydown)
  }
}