import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["trigger", "menu"]
  static values = { selected: Array }
  
  connect() {
    this.isOpen = false
    this.updateTriggerDisplay()
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
    this.isOpen = true
    this.menuTarget.classList.remove("hidden")
    
    // Close other dropdowns
    document.querySelectorAll('[data-controller~="multiselect"]').forEach(element => {
      if (element !== this.element) {
        const controller = this.application.getControllerForElementAndIdentifier(element, "multiselect")
        if (controller) controller.close()
      }
    })
    
    // Position menu
    this.positionMenu()
    
    // Add click outside listener
    requestAnimationFrame(() => {
      document.addEventListener("click", this.handleClickOutside)
    })
  }
  
  close() {
    this.isOpen = false
    this.menuTarget.classList.add("hidden")
    document.removeEventListener("click", this.handleClickOutside)
  }
  
  updateSelection(event) {
    event.stopPropagation()
    this.updateTriggerDisplay()
  }
  
  updateTriggerDisplay() {
    const checkedInputs = this.menuTarget.querySelectorAll('input[type="checkbox"]:checked')
    const count = checkedInputs.length
    const valueDisplay = this.triggerTarget.querySelector('.dropdown-value')
    
    if (!valueDisplay) return
    
    if (count === 0) {
      valueDisplay.innerHTML = '<span class="placeholder">Select options</span>'
    } else if (count === 1) {
      // For single selection, show the label
      const label = checkedInputs[0].closest('.dropdown-option').querySelector('.option-label').textContent
      const avatar = checkedInputs[0].closest('.dropdown-option').querySelector('.user-avatar')
      
      if (avatar) {
        valueDisplay.innerHTML = `
          <div class="selected-single">
            <span class="user-avatar small">${avatar.textContent}</span>
            <span>${label}</span>
          </div>
        `
      } else {
        valueDisplay.innerHTML = `<span>${label}</span>`
      }
    } else {
      valueDisplay.innerHTML = `<span class="selected-count">${count} selected</span>`
    }
  }
  
  positionMenu() {
    const triggerRect = this.triggerTarget.getBoundingClientRect()
    const menuRect = this.menuTarget.getBoundingClientRect()
    
    let top = triggerRect.bottom + 4
    let left = triggerRect.left
    
    // Adjust if menu would go off screen
    if (top + menuRect.height > window.innerHeight - 20) {
      top = triggerRect.top - menuRect.height - 4
    }
    
    if (left + menuRect.width > window.innerWidth - 20) {
      left = window.innerWidth - menuRect.width - 20
    }
    
    this.menuTarget.style.position = 'fixed'
    this.menuTarget.style.top = `${top}px`
    this.menuTarget.style.left = `${left}px`
    this.menuTarget.style.width = `${triggerRect.width}px`
  }
  
  handleClickOutside = (event) => {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
}