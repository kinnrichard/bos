import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="delete-confirmation"
export default class extends Controller {
  static targets = ["modal", "checkbox", "deleteButton", "message"]
  static values = { 
    message: String,
    checkboxLabel: String 
  }
  
  connect() {
    // Set default values if not provided
    if (!this.hasMessageValue) {
      this.messageValue = "Are you sure you want to delete this item? This action cannot be undone."
    }
    if (!this.hasCheckboxLabelValue) {
      this.checkboxLabelValue = "I understand this action cannot be undone"
    }
  }
  
  open(event) {
    event.preventDefault()
    
    // Store the form that triggered this
    this.deleteForm = event.currentTarget.closest('form')
    
    // Set the message
    this.messageTarget.textContent = this.messageValue
    
    // Reset checkbox
    this.checkboxTarget.checked = false
    this.deleteButtonTarget.disabled = true
    
    // Show modal
    this.modalTarget.classList.remove("hidden")
    document.body.style.overflow = 'hidden'
  }
  
  close(event) {
    event?.preventDefault()
    this.modalTarget.classList.add("hidden")
    document.body.style.overflow = ''
  }
  
  toggleDeleteButton() {
    this.deleteButtonTarget.disabled = !this.checkboxTarget.checked
  }
  
  confirmDelete(event) {
    event.preventDefault()
    if (this.checkboxTarget.checked && this.deleteForm) {
      this.deleteForm.submit()
    }
  }
  
  // Close on escape key
  disconnect() {
    document.body.style.overflow = ''
  }
}