import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "menu"]
  
  connect() {
    // Close dropdown when clicking outside
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
  }
  
  disconnect() {
    document.removeEventListener("click", this.handleOutsideClick)
  }
  
  toggle(event) {
    event.stopPropagation()
    
    if (this.menuTarget.classList.contains("hidden")) {
      this.open()
    } else {
      this.close()
    }
  }
  
  open() {
    // Close all other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      if (menu !== this.menuTarget) {
        menu.classList.add('hidden')
      }
    })
    
    // Position the dropdown if it's inside a popover
    if (this.element.closest('.popover-section')) {
      const buttonRect = this.buttonTarget.getBoundingClientRect()
      this.menuTarget.style.top = `${buttonRect.bottom + 4}px`
      this.menuTarget.style.left = `${buttonRect.left}px`
      this.menuTarget.style.width = `${buttonRect.width}px`
    }
    
    this.menuTarget.classList.remove("hidden")
    document.addEventListener("click", this.handleOutsideClick)
  }
  
  close() {
    this.menuTarget.classList.add("hidden")
    document.removeEventListener("click", this.handleOutsideClick)
  }
  
  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
}