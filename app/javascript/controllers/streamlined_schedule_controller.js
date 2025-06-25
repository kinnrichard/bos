import BasePopoverController from "controllers/base_popover_controller"

export default class extends BasePopoverController {
  static targets = [
    "calendarSection", "dateInput", "quickActions", "optionalDetails",
    "timeGroup", "startTimeInput", "endTimeInput", "arrivalWindow", "arrivalWindowCheckbox",
    "technicianCheckbox", "technicianGroup", "notesInput", "saveButton"
  ]
  
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    animationDuration: { type: Number, default: 200 },
    jobId: Number,
    clientId: Number 
  }
  
  selectedDate = null
  selectedType = null
  
  childConnect() {
    // Focus on date input when popover opens
    requestAnimationFrame(() => {
      if (this.hasDateInputTarget) {
        this.dateInputTarget.focus()
        // Show calendar picker on some browsers
        this.dateInputTarget.showPicker?.()
      }
    })
  }
  
  dateSelected(event) {
    this.selectedDate = event.target.value
    if (this.selectedDate) {
      // Show quick action buttons
      this.quickActionsTarget.classList.remove('hidden')
      // Scroll to ensure buttons are visible
      this.quickActionsTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      this.quickActionsTarget.classList.add('hidden')
      this.optionalDetailsTarget.classList.add('hidden')
    }
  }
  
  scheduleAppointment(event) {
    this.selectedType = event.currentTarget.dataset.scheduleType
    this.showOptionalDetails(true) // Time is mandatory for appointments
  }
  
  scheduleFollowup(event) {
    this.selectedType = event.currentTarget.dataset.scheduleType
    this.showOptionalDetails(false)
  }
  
  scheduleDueDate(event) {
    this.selectedType = event.currentTarget.dataset.scheduleType
    this.showOptionalDetails(false)
  }
  
  scheduleStartDate(event) {
    this.selectedType = event.currentTarget.dataset.scheduleType
    this.showOptionalDetails(false)
  }
  
  showOptionalDetails(timeRequired = false) {
    // Highlight selected button
    this.element.querySelectorAll('.action-button').forEach(btn => {
      btn.classList.remove('selected')
    })
    event.currentTarget.classList.add('selected')
    
    // Show optional details section
    this.optionalDetailsTarget.classList.remove('hidden')
    
    // Show/hide time group based on requirement
    if (timeRequired) {
      this.timeGroupTarget.classList.remove('hidden')
      this.startTimeInputTarget.required = true
      // Focus on time input
      requestAnimationFrame(() => {
        this.startTimeInputTarget.focus()
      })
    } else {
      this.timeGroupTarget.classList.add('hidden')
      this.startTimeInputTarget.required = false
    }
    
    // Update save button text
    const typeLabels = {
      'appointment': 'Schedule Appointment',
      'follow_up': 'Schedule Follow-up',
      'due_date': 'Set Due Date',
      'start_date': 'Set Start Date'
    }
    this.saveButtonTarget.textContent = typeLabels[this.selectedType] || 'Save'
    
    // Scroll to details
    this.optionalDetailsTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  
  toggleArrivalWindow(event) {
    if (event.target.checked) {
      this.arrivalWindowTarget.classList.remove('hidden')
    } else {
      this.arrivalWindowTarget.classList.add('hidden')
      this.endTimeInputTarget.value = ''
    }
  }
  
  async saveSchedule() {
    // Validate required fields
    if (!this.selectedDate || !this.selectedType) {
      alert("Please select a date and type")
      return
    }
    
    // Check if time is required for appointments
    if (this.selectedType === 'appointment' && !this.startTimeInputTarget.value) {
      alert("Please select a time for the appointment")
      this.startTimeInputTarget.focus()
      return
    }
    
    // Get selected technician IDs
    const selectedTechnicians = Array.from(this.technicianCheckboxTargets)
      .filter(cb => cb.checked)
      .map(cb => cb.value)
    
    // Build request data
    const data = {
      scheduled_date_time: {
        scheduled_type: this.selectedType,
        scheduled_date: this.selectedDate,
        scheduled_time: this.startTimeInputTarget.value || null,
        end_time: this.endTimeInputTarget.value || null,
        notes: this.notesInputTarget.value || null,
        user_ids: selectedTechnicians
      }
    }
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/scheduled_date_times`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        // Reset form
        this.resetForm()
        
        // Reload the page to show the new scheduled date
        window.location.reload()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to schedule date")
      }
    } catch (error) {
      console.error('Error scheduling date:', error)
      alert("An error occurred while scheduling the date")
    }
  }
  
  cancelSchedule() {
    this.resetForm()
  }
  
  resetForm() {
    this.selectedDate = null
    this.selectedType = null
    this.dateInputTarget.value = ''
    this.startTimeInputTarget.value = ''
    this.endTimeInputTarget.value = ''
    this.notesInputTarget.value = ''
    this.arrivalWindowCheckbox.checked = false
    this.arrivalWindowTarget.classList.add('hidden')
    
    // Uncheck all technicians
    this.technicianCheckboxTargets.forEach(cb => cb.checked = false)
    
    // Hide sections
    this.quickActionsTarget.classList.add('hidden')
    this.optionalDetailsTarget.classList.add('hidden')
    
    // Remove selected state from buttons
    this.element.querySelectorAll('.action-button').forEach(btn => {
      btn.classList.remove('selected')
    })
  }
  
  async deleteDate(event) {
    if (!confirm("Are you sure you want to delete this scheduled date?")) return
    
    const dateItem = event.target.closest('.scheduled-date-item')
    const scheduledDateId = dateItem.dataset.scheduledDateId
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/scheduled_date_times/${scheduledDateId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        }
      })
      
      if (response.ok) {
        // Remove from DOM
        dateItem.remove()
        
        // Check if section is now empty
        const section = event.target.closest('.date-group')
        if (section && section.querySelectorAll('.scheduled-date-item').length === 0) {
          section.remove()
        }
        
        // Check if all dates are gone
        if (this.element.querySelectorAll('.scheduled-date-item').length === 0) {
          const existingSection = this.element.querySelector('.existing-dates-section')
          if (existingSection) {
            existingSection.remove()
          }
        }
      } else {
        alert("Failed to delete scheduled date")
      }
    } catch (error) {
      console.error('Error deleting date:', error)
      alert("An error occurred while deleting the date")
    }
  }
}