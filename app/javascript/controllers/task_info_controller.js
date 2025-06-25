import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["notesContainer", "noteInput", "timer"]
  static values = { 
    taskId: Number,
    clientId: Number,
    jobId: Number
  }
  
  timerInterval = null
  
  connect() {
    // Start timer if task is in progress
    if (this.hasTimerTarget && this.timerTarget.dataset.duration) {
      this.startTimer()
    }
  }
  
  disconnect() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }
  
  close() {
    this.element.classList.add('hidden')
    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }
  
  async addNote() {
    const content = this.noteInputTarget.value.trim()
    if (!content) return
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${this.taskIdValue}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ note: { content } })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Add note to the container
        this.prependNote(data.note)
        // Clear input
        this.noteInputTarget.value = ''
        // Update note indicator in task list
        this.updateNoteIndicator(true)
      } else {
        console.error('Failed to add note')
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }
  
  async updateAssignment(event) {
    const technicianId = event.currentTarget.dataset.technicianId
    
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${this.taskIdValue}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ technician_id: technicianId || null })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Update assignment display
        this.updateAssignmentDisplay(data.technician)
        // Update assignee indicator in task list
        this.updateAssigneeIndicator(data.technician)
      } else {
        console.error('Failed to update assignment')
      }
    } catch (error) {
      console.error('Error updating assignment:', error)
    }
  }
  
  prependNote(note) {
    const noteHtml = `
      <div class="note-item" data-note-id="${note.id}">
        <div class="note-header">
          <span class="note-author">${note.user_name}</span>
          <span class="note-time">0s ago</span>
        </div>
        <div class="note-content">${this.escapeHtml(note.content)}</div>
      </div>
    `
    
    this.notesContainerTarget.insertAdjacentHTML('afterbegin', noteHtml)
  }
  
  updateAssignmentDisplay(technician) {
    const dropdownValue = this.element.querySelector('.dropdown-value')
    if (!dropdownValue) return
    
    if (technician) {
      const initials = technician.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      dropdownValue.innerHTML = `
        <span class="technician-badge">${initials}</span>
        <span>${technician.name}</span>
      `
    } else {
      dropdownValue.innerHTML = `
        <span>❓</span>
        <span>Unassigned</span>
      `
    }
  }
  
  updateNoteIndicator(hasNotes) {
    const taskElement = document.querySelector(`[data-task-id="${this.taskIdValue}"]`)
    if (!taskElement) return
    
    const taskRight = taskElement.querySelector('.task-right')
    const existingIndicator = taskRight.querySelector('.note-indicator')
    
    if (hasNotes && !existingIndicator) {
      // Add note indicator after info button
      const infoButton = taskRight.querySelector('.task-info-button')
      infoButton.insertAdjacentHTML('afterend', '<span class="note-indicator" title="Has notes">📝</span>')
    }
  }
  
  updateAssigneeIndicator(technician) {
    const taskElement = document.querySelector(`[data-task-id="${this.taskIdValue}"]`)
    if (!taskElement) return
    
    const taskRight = taskElement.querySelector('.task-right')
    const existingIndicator = taskRight.querySelector('.assignee-indicator')
    
    if (technician) {
      const initials = technician.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      if (existingIndicator) {
        existingIndicator.querySelector('.assignee-initials').textContent = initials
        existingIndicator.title = `Assigned to ${technician.name}`
      } else {
        // Add assignee indicator
        const html = `
          <span class="assignee-indicator" title="Assigned to ${technician.name}">
            <span class="assignee-initials">${initials}</span>
          </span>
        `
        taskRight.insertAdjacentHTML('beforeend', html)
      }
    } else if (existingIndicator) {
      existingIndicator.remove()
    }
  }
  
  startTimer() {
    let startDuration = parseInt(this.timerTarget.dataset.duration) || 0
    const startTime = Date.now() - (startDuration * 1000)
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      this.timerTarget.textContent = this.formatDuration(elapsed)
    }
    
    updateTimer()
    this.timerInterval = setInterval(updateTimer, 1000)
  }
  
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}