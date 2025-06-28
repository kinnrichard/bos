import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["titleField"]
  
  connect() {
    this.isNewJob = this.element.dataset.newJob === "true"
    this.originalTitle = this.titleFieldTarget.textContent.trim()
  }
  
  handleBlur(event) {
    const currentText = this.titleFieldTarget.textContent.trim()
    
    // For new jobs, check if title is empty or placeholder
    if (this.isNewJob) {
      if (!currentText || currentText === 'Untitled Job') {
        // Refocus field
        event.preventDefault()
        this.titleFieldTarget.focus()
        
        // Clear field for true placeholder behavior
        this.titleFieldTarget.textContent = ''
        return
      } else {
        // Valid title entered, create the job
        this.createJob(currentText)
        return
      }
    }
    
    // Existing job behavior
    if (!currentText) {
      this.titleFieldTarget.textContent = 'Untitled Job'
    }
  }
  
  handleFocus() {
    // Store original title for escape key handling
    this.titleFieldTarget.dataset.originalTitle = this.titleFieldTarget.textContent
  }
  
  handleInput() {
    // No longer need to handle pulsing
  }
  
  handleEnter(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      
      // Trigger blur to handle the logic
      this.titleFieldTarget.blur()
    }
  }
  
  async createJob(title) {
    // Get client ID from the job-view element
    const clientId = this.element.dataset.clientId
    
    // Disable the field while creating
    this.titleFieldTarget.contentEditable = false
    this.titleFieldTarget.classList.add('saving')
    
    try {
      const response = await fetch(`/clients/${clientId}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
          job: {
            title: title,
            status: 'open',
            priority: 'normal'
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Redirect to the newly created job
        window.location.href = `/clients/${clientId}/jobs/${data.job.id}`
      } else {
        // Handle error
        const error = await response.json()
        console.error('Failed to create job:', error)
        
        // Re-enable editing
        this.titleFieldTarget.contentEditable = true
        this.titleFieldTarget.classList.remove('saving')
        
        // Show error message (you might want to add a proper error display)
        alert(error.error || 'Failed to create job. Please try again.')
      }
    } catch (error) {
      console.error('Network error:', error)
      
      // Re-enable editing
      this.titleFieldTarget.contentEditable = true
      this.titleFieldTarget.classList.remove('saving')
      
      alert('Network error. Please check your connection and try again.')
    }
  }
}