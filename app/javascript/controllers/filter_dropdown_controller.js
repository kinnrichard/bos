import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu", "button"]
  
  connect() {
    // Close dropdown when clicking outside
    this.outsideClickHandler = this.handleOutsideClick.bind(this)
    document.addEventListener("click", this.outsideClickHandler)
  }
  
  disconnect() {
    document.removeEventListener("click", this.outsideClickHandler)
  }
  
  toggle(event) {
    event.stopPropagation()
    this.menuTarget.classList.toggle("hidden")
    
    // Update button active state
    if (this.hasButtonTarget) {
      this.buttonTarget.classList.toggle("active", !this.menuTarget.classList.contains("hidden"))
    }
  }
  
  close() {
    this.menuTarget.classList.add("hidden")
    if (this.hasButtonTarget) {
      this.buttonTarget.classList.remove("active")
    }
  }
  
  handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
}