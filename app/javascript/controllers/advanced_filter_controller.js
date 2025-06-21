import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger", "popover", "form"]
  
  initialize() {
    // Ensure we're targeting the correct popover
    this.popoverSelector = '.job-popover.filter-popover'
  }
  
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
    
    // Position below the trigger button
    const top = triggerRect.bottom + 8
    const right = window.innerWidth - triggerRect.right
    
    // Apply positioning
    popover.style.position = 'fixed'
    popover.style.top = `${top}px`
    popover.style.right = `${right}px`
    popover.style.left = 'auto'
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