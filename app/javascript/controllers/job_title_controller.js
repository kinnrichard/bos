import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["titleField"]
  static values = { userFirstName: String }
  
  connect() {
    this.checkUntitledState()
    this.originalTitle = this.titleFieldTarget.textContent.trim()
  }
  
  handleBlur() {
    const currentText = this.titleFieldTarget.textContent.trim()
    
    // If empty, restore placeholder
    if (!currentText) {
      const placeholder = `${this.userFirstNameValue}'s Untitled Job`
      this.titleFieldTarget.textContent = placeholder
    }
    
    this.checkUntitledState()
  }
  
  handleFocus() {
    this.titleFieldTarget.classList.remove('untitled-pulse')
    
    // Store original title for escape key handling
    this.titleFieldTarget.dataset.originalTitle = this.titleFieldTarget.textContent
  }
  
  handleInput() {
    // Remove pulse if user starts typing
    this.titleFieldTarget.classList.remove('untitled-pulse')
  }
  
  checkUntitledState() {
    const currentText = this.titleFieldTarget.textContent.trim()
    const placeholder = `${this.userFirstNameValue}'s Untitled Job`
    const placeholderPattern = new RegExp(`^.+'s Untitled Job( \\(\\d+\\))?$`)
    
    if (!currentText || currentText === placeholder || placeholderPattern.test(currentText)) {
      this.titleFieldTarget.classList.add('untitled-pulse')
    } else {
      this.titleFieldTarget.classList.remove('untitled-pulse')
    }
  }
}