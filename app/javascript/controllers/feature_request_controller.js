import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["overlay", "form", "screen", "input", "backButton", "nextButton", "submitButton"]
  
  connect() {
    this.currentScreen = 1
    this.totalScreens = this.screenTargets.length
    this.formData = {}
    
    // Load saved draft from localStorage
    this.loadDraft()
    
    // Update navigation buttons
    this.updateNavigation()
  }
  
  disconnect() {
    // Clear draft when form is submitted successfully
    if (this.formSubmitted) {
      localStorage.removeItem('featureRequestDraft')
    }
  }
  
  nextScreen(event) {
    event?.preventDefault()
    
    // Validate current screen
    if (!this.validateCurrentScreen()) {
      return
    }
    
    // Save current screen data
    this.saveCurrentScreenData()
    
    // Move to next screen
    if (this.currentScreen < this.totalScreens) {
      this.currentScreen++
      this.showScreen(this.currentScreen)
      this.updateNavigation()
      this.updateProgressIndicator()
    }
  }
  
  previousScreen(event) {
    event?.preventDefault()
    
    // Save current screen data
    this.saveCurrentScreenData()
    
    // Move to previous screen
    if (this.currentScreen > 1) {
      this.currentScreen--
      this.showScreen(this.currentScreen)
      this.updateNavigation()
      this.updateProgressIndicator()
    }
  }
  
  showScreen(screenNumber) {
    // Hide all screens
    this.screenTargets.forEach(screen => {
      screen.classList.remove('active')
    })
    
    // Show the target screen
    const targetScreen = this.screenTargets.find(screen => 
      screen.dataset.screen === screenNumber.toString()
    )
    if (targetScreen) {
      targetScreen.classList.add('active')
    }
  }
  
  updateNavigation() {
    // Back button
    if (this.hasBackButtonTarget) {
      this.backButtonTarget.style.display = this.currentScreen === 1 ? 'none' : 'block'
    }
    
    // Next/Submit buttons
    if (this.hasNextButtonTarget && this.hasSubmitButtonTarget) {
      if (this.currentScreen === this.totalScreens) {
        this.nextButtonTarget.style.display = 'none'
        this.submitButtonTarget.style.display = 'block'
      } else {
        this.nextButtonTarget.style.display = 'block'
        this.submitButtonTarget.style.display = 'none'
      }
    }
  }
  
  updateProgressIndicator() {
    // Update progress steps
    const steps = this.element.querySelectorAll('.progress-step')
    steps.forEach((step, index) => {
      if (index + 1 <= this.currentScreen) {
        step.classList.add('active')
      } else {
        step.classList.remove('active')
      }
    })
  }
  
  validateCurrentScreen() {
    const currentScreenElement = this.screenTargets.find(screen => 
      screen.dataset.screen === this.currentScreen.toString()
    )
    
    if (!currentScreenElement) return true
    
    // Find required inputs in current screen
    const requiredInputs = currentScreenElement.querySelectorAll('[required]')
    let isValid = true
    
    requiredInputs.forEach(input => {
      if (input.type === 'radio') {
        // Check if any radio in the group is selected
        const radioGroup = currentScreenElement.querySelectorAll(`input[name="${input.name}"]`)
        const isChecked = Array.from(radioGroup).some(radio => radio.checked)
        if (!isChecked) {
          isValid = false
          // Add error styling
          const radioLabels = currentScreenElement.querySelectorAll('.radio-label')
          radioLabels.forEach(label => label.classList.add('error'))
        }
      } else if (!input.value.trim()) {
        isValid = false
        input.classList.add('error')
      }
    })
    
    if (!isValid) {
      // Show error message
      this.showValidationError()
    }
    
    return isValid
  }
  
  showValidationError() {
    // You could add a toast notification here
    const firstError = this.element.querySelector('.error')
    if (firstError) {
      firstError.focus()
    }
  }
  
  saveCurrentScreenData() {
    const currentScreenElement = this.screenTargets.find(screen => 
      screen.dataset.screen === this.currentScreen.toString()
    )
    
    if (!currentScreenElement) return
    
    // Save all input values from current screen
    const inputs = currentScreenElement.querySelectorAll('input, textarea, select')
    inputs.forEach(input => {
      if (input.type === 'radio' && input.checked) {
        this.formData[input.name] = input.value
      } else if (input.type !== 'radio') {
        this.formData[input.name] = input.value
      }
    })
    
    // Save draft to localStorage
    this.saveDraft()
  }
  
  saveDraft() {
    const draft = {
      formData: this.formData,
      currentScreen: this.currentScreen,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('featureRequestDraft', JSON.stringify(draft))
  }
  
  loadDraft() {
    const draftString = localStorage.getItem('featureRequestDraft')
    if (!draftString) return
    
    try {
      const draft = JSON.parse(draftString)
      
      // Check if draft is less than 24 hours old
      const draftAge = new Date() - new Date(draft.timestamp)
      if (draftAge > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('featureRequestDraft')
        return
      }
      
      // Restore form data
      this.formData = draft.formData || {}
      this.currentScreen = draft.currentScreen || 1
      
      // Fill in the form fields
      Object.entries(this.formData).forEach(([name, value]) => {
        const input = this.formTarget.querySelector(`[name="${name}"]`)
        if (input) {
          if (input.type === 'radio') {
            const radio = this.formTarget.querySelector(`[name="${name}"][value="${value}"]`)
            if (radio) radio.checked = true
          } else {
            input.value = value
          }
        }
      })
      
      // Show the current screen
      this.showScreen(this.currentScreen)
      this.updateNavigation()
      this.updateProgressIndicator()
      
    } catch (error) {
      console.error('Failed to load draft:', error)
      localStorage.removeItem('featureRequestDraft')
    }
  }
  
  handleSubmit(event) {
    // Validate last screen
    if (!this.validateCurrentScreen()) {
      event.preventDefault()
      return
    }
    
    // Save final data
    this.saveCurrentScreenData()
    
    // Mark as submitted
    this.formSubmitted = true
    
    // The form will submit normally
  }
  
  close(event) {
    event?.preventDefault()
    
    // Save draft before closing
    this.saveCurrentScreenData()
    
    // Go back to previous page
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }
  
  // Remove error styling when user interacts with input
  inputTargetConnected(element) {
    element.addEventListener('input', () => {
      element.classList.remove('error')
    })
    
    // For radio buttons, remove error from all labels in the group
    if (element.type === 'radio') {
      element.addEventListener('change', () => {
        const labels = element.closest('.form-group').querySelectorAll('.radio-label')
        labels.forEach(label => label.classList.remove('error'))
      })
    }
  }
}