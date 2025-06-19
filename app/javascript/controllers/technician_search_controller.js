import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "dropdown"]
  
  connect() {
    this.hideDropdown = this.hideDropdown.bind(this)
    document.addEventListener("click", this.hideDropdown)
  }
  
  disconnect() {
    document.removeEventListener("click", this.hideDropdown)
  }
  
  hideDropdown(event) {
    if (!this.element.contains(event.target)) {
      this.dropdownTarget.classList.add("hidden")
    }
  }
  
  async showDropdown() {
    // Load initial technicians
    const response = await fetch("/api/technicians?limit=5", {
      headers: {
        "Accept": "application/json"
      }
    })
    
    if (response.ok) {
      const technicians = await response.json()
      this.renderTechnicians(technicians)
      this.dropdownTarget.classList.remove("hidden")
    }
  }
  
  async search(event) {
    const query = event.target.value
    
    if (query.length < 2) {
      this.showDropdown()
      return
    }
    
    const response = await fetch(`/api/technicians/search?q=${encodeURIComponent(query)}`, {
      headers: {
        "Accept": "application/json"
      }
    })
    
    if (response.ok) {
      const technicians = await response.json()
      this.renderTechnicians(technicians)
      this.dropdownTarget.classList.remove("hidden")
    }
  }
  
  renderTechnicians(technicians) {
    if (technicians.length === 0) {
      this.dropdownTarget.innerHTML = `
        <div class="dropdown-empty">No technicians found</div>
      `
      return
    }
    
    this.dropdownTarget.innerHTML = technicians.map(tech => `
      <button class="dropdown-item" data-action="click->technician-search#selectTechnician" data-technician-id="${tech.id}" data-technician-name="${tech.name}">
        <span class="technician-initials">${this.getInitials(tech.name)}</span>
        <span>${tech.name}</span>
        <span class="technician-role">${tech.role}</span>
      </button>
    `).join("")
  }
  
  selectTechnician(event) {
    const techId = event.currentTarget.dataset.technicianId
    const techName = event.currentTarget.dataset.technicianName
    
    // Get job controller data
    const jobElement = this.element.closest("[data-controller*='job']")
    const jobId = jobElement.dataset.jobIdValue
    const clientId = jobElement.dataset.clientIdValue
    
    // Add technician to job
    fetch(`/clients/${clientId}/jobs/${jobId}/add_technician`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify({ technician_id: techId })
    }).then(() => {
      // Reload to show updated assignees
      location.reload()
    })
    
    // Clear input and hide dropdown
    this.inputTarget.value = ""
    this.dropdownTarget.classList.add("hidden")
  }
  
  getInitials(name) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }
}