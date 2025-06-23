import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["header", "content", "toggle"]
  
  connect() {
    // Headers start collapsed by default
    this.collapseAll()
  }
  
  toggle(event) {
    event.preventDefault()
    event.stopPropagation()
    
    const header = event.currentTarget
    const isCollapsed = header.classList.contains("logs-group--collapsed")
    
    if (isCollapsed) {
      this.expand(header)
    } else {
      this.collapse(header)
    }
  }
  
  expand(header) {
    header.classList.remove("logs-group--collapsed")
    
    // Find all content rows after this header until the next header
    let sibling = header.nextElementSibling
    while (sibling && !sibling.classList.contains("logs-group-header")) {
      if (sibling.classList.contains("logs-group-content")) {
        sibling.style.display = ""
      }
      sibling = sibling.nextElementSibling
    }
    
    // Update toggle icon
    const toggle = header.querySelector("[data-logs-collapsible-target='toggle']")
    if (toggle) {
      toggle.textContent = "▼"
    }
  }
  
  collapse(header) {
    header.classList.add("logs-group--collapsed")
    
    // Find all content rows after this header until the next header
    let sibling = header.nextElementSibling
    while (sibling && !sibling.classList.contains("logs-group-header")) {
      if (sibling.classList.contains("logs-group-content")) {
        sibling.style.display = "none"
      }
      sibling = sibling.nextElementSibling
    }
    
    // Update toggle icon
    const toggle = header.querySelector("[data-logs-collapsible-target='toggle']")
    if (toggle) {
      toggle.textContent = "▶"
    }
  }
  
  collapseAll() {
    // Find all group headers
    const headers = this.element.querySelectorAll(".logs-group-header")
    headers.forEach(header => {
      this.collapse(header)
    })
  }
}