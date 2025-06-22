import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content", "form", "typeSelect", "dateInput", "timeInput", "timeGroup", "userCheckbox", "technicianDisplay"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    jobId: Number 
  }

  connect() {
    console.log("Schedule popover controller connected", this.jobIdValue)
    // Bind event handlers
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    
    // Add to global popover tracker
    this.registerPopover()
  }
  
  disconnect() {
    this.unregisterPopover()
  }
  
  show() {
    // Close all other popovers first
    window.popoverManager?.closeAllExcept(this)
    
    this.element.classList.remove('hidden')
    
    // Track open state
    this.element.dataset.popoverOpen = "true"
    
    // Start listening for outside clicks after a small delay
    setTimeout(() => {
      if (this.closeOnClickOutsideValue) {
        document.addEventListener("click", this.handleOutsideClick, true)
      }
    }, 50)
    
    // Notify global tracker
    window.popoverManager?.popoverOpened(this)
  }
  
  hide() {
    this.element.classList.add('hidden')
    
    // Track closed state
    this.element.dataset.popoverOpen = "false"
    
    // Stop listening for outside clicks
    document.removeEventListener("click", this.handleOutsideClick, true)
    
    // Close any open dropdowns within this popover
    this.closeChildDropdowns()
    
    // Notify global tracker
    window.popoverManager?.popoverClosed(this)
  }
  
  toggle() {
    if (this.isOpen) {
      this.hide()
    } else {
      this.show()
    }
  }
  
  get isOpen() {
    return !this.element.classList.contains('hidden')
  }
  
  handleOutsideClick(event) {
    // Don't close if clicking inside the popover
    if (this.element.contains(event.target)) {
      return
    }
    
    // Don't close if clicking on the trigger that opened this popover
    const trigger = event.target.closest('[data-action*="toggle"]')
    if (trigger && trigger.dataset.action.includes(this.identifier)) {
      return
    }
    
    // Check if clicking on a dropdown menu
    const clickedDropdown = event.target.closest('.dropdown-menu')
    if (clickedDropdown) {
      return
    }
    
    // Check if there are open dropdowns in this popover
    const openDropdowns = this.element.querySelectorAll('.dropdown-menu:not(.hidden)')
    if (openDropdowns.length > 0) {
      // Close dropdowns first
      openDropdowns.forEach(dropdown => {
        dropdown.classList.add('hidden')
      })
      return
    }
    
    // No open dropdowns, close the popover
    this.hide()
  }
  
  closeChildDropdowns() {
    const dropdowns = this.element.querySelectorAll('[data-controller~="dropdown"]')
    dropdowns.forEach(dropdown => {
      const controller = this.application.getControllerForElementAndIdentifier(dropdown, 'dropdown')
      if (controller && controller.close) {
        controller.close()
      }
    })
  }
  
  registerPopover() {
    // Initialize global popover manager if needed
    if (!window.popoverManager) {
      window.popoverManager = {
        popovers: new Set(),
        dropdowns: new Set(),
        
        popoverOpened(popover) {
          this.popovers.add(popover)
        },
        
        popoverClosed(popover) {
          this.popovers.delete(popover)
        },
        
        dropdownOpened(dropdown) {
          this.dropdowns.add(dropdown)
        },
        
        dropdownClosed(dropdown) {
          this.dropdowns.delete(dropdown)
        },
        
        closeAllExcept(keepOpen) {
          this.popovers.forEach(popover => {
            if (popover !== keepOpen && popover.hide) {
              popover.hide()
            }
          })
        }
      }
    }
    
    window.popoverManager.popovers.add(this)
  }
  
  unregisterPopover() {
    window.popoverManager?.popovers.delete(this)
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
  
  toggleTechnician(event) {
    event.preventDefault()
    event.stopPropagation()
    
    const option = event.currentTarget
    const checkbox = option.querySelector('.hidden-checkbox')
    const technicianId = option.dataset.technicianId
    
    // Toggle the checkbox
    checkbox.checked = !checkbox.checked
    
    // Toggle visual state
    option.classList.toggle('active')
    
    // Add/remove checkmark
    let checkmark = option.querySelector('.checkmark')
    if (checkbox.checked) {
      if (!checkmark) {
        option.insertAdjacentHTML('beforeend', '<span class="checkmark">✓</span>')
      }
    } else {
      if (checkmark) {
        checkmark.remove()
      }
    }
    
    // Update the display
    this.updateTechnicianDisplay()
  }
  
  updateTechnicianDisplay() {
    const selectedCheckboxes = this.userCheckboxTargets.filter(cb => cb.checked)
    const display = this.technicianDisplayTarget
    
    if (selectedCheckboxes.length === 0) {
      display.innerHTML = '<span>Select technicians...</span>'
    } else if (selectedCheckboxes.length === 1) {
      const option = selectedCheckboxes[0].closest('.assignee-option')
      const name = option.querySelector('span').textContent
      display.innerHTML = `<span>${name}</span>`
    } else {
      display.innerHTML = `<span>${selectedCheckboxes.length} technicians selected</span>`
    }
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
      const response = await fetch(`/jobs/${this.jobIdValue}/scheduled_date_times`, {
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
      const response = await fetch(`/jobs/${this.jobIdValue}/scheduled_date_times/${dateId}`, {
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