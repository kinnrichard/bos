import BasePopoverController from "shared/base_popover_controller"

export default class extends BasePopoverController {
  static targets = ["content", "form", "typeSelect", "typeDisplay", "dateInput", "timeInput", "timeGroup", "userCheckbox", "technicianDisplay"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    animationDuration: { type: Number, default: 200 },
    jobId: Number,
    clientId: Number 
  }

  childConnect() {
    // Schedule popover controller connected
  }
  
  
  dateChanged(event) {
    // Show time field when a date is selected
    if (event.target.value) {
      this.timeGroupTarget.classList.remove('hidden')
    } else {
      this.timeGroupTarget.classList.add('hidden')
      this.timeInputTarget.value = '' // Clear time if date is cleared
    }
  }
  
  techniciansSelected(event) {
    // The dropdown controller already updated the display
    // We just need to handle any custom logic here if needed
  }
  
  typeSelected(event) {
    // The dropdown controller already updated the display and value
    // We just need to handle any custom logic here if needed
  }

  async addDate(event) {
    event.preventDefault()
    
    const type = this.typeSelectTarget.value
    const date = this.dateInputTarget.value
    const time = this.timeInputTarget.value
    
    if (!date) {
      alert("Please select a date")
      return
    }
    
    // Get selected user IDs
    const userIds = Array.from(this.userCheckboxTargets)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value)
    
    const formData = new FormData()
    formData.append("scheduled_date_time[scheduled_type]", type)
    formData.append("scheduled_date_time[scheduled_date]", date)
    if (time) {
      formData.append("scheduled_date_time[scheduled_time]", time)
    }
    userIds.forEach(userId => {
      formData.append("scheduled_date_time[user_ids][]", userId)
    })
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/scheduled_date_times`, {
        method: "POST",
        headers: {
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        },
        body: formData
      })
      
      if (response.ok) {
        // Reload the page to show the new date
        window.location.reload()
      } else {
        const errorText = await response.text()
        console.error("Error creating scheduled date:", errorText)
        alert("Failed to add scheduled date")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("An error occurred")
    }
  }
  
  async editDate(event) {
    const item = event.target.closest("[data-scheduled-date-id]")
    const dateId = item.dataset.scheduledDateId
    
    // For now, just alert - we'd implement inline editing later
    alert(`Edit functionality for date ${dateId} coming soon!`)
  }
  
  async deleteDate(event) {
    if (!confirm("Are you sure you want to delete this scheduled date?")) {
      return
    }
    
    const item = event.target.closest("[data-scheduled-date-id]")
    const dateId = item.dataset.scheduledDateId
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/scheduled_date_times/${dateId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        }
      })
      
      if (response.ok) {
        // Remove the item from the DOM
        item.remove()
      } else {
        alert("Failed to delete scheduled date")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("An error occurred")
    }
  }
}