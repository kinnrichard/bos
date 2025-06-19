import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tasksSection", "notesSection"]
  
  addTask(event) {
    event.preventDefault()
    
    // Create a form for adding a new task
    const formHtml = `
      <div class="task-form" style="margin-top: 16px; padding: 16px; background-color: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px;">
        <form data-action="submit->job#submitTask">
          <div class="form-group">
            <label class="form-label">Task Title</label>
            <input type="text" class="form-input" name="title" placeholder="Enter task title" required>
          </div>
          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label">Description (optional)</label>
            <textarea class="form-input" name="description" rows="3" placeholder="Enter task description"></textarea>
          </div>
          <div class="form-actions" style="margin-top: 12px;">
            <button type="submit" class="btn btn-primary">Add Task</button>
            <button type="button" class="btn btn-secondary" data-action="click->job#cancelTaskForm">Cancel</button>
          </div>
        </form>
      </div>
    `
    
    // Insert the form after the button
    event.target.insertAdjacentHTML('afterend', formHtml)
    
    // Hide the add button
    event.target.style.display = 'none'
    
    // Focus on the title input
    const titleInput = this.tasksSectionTarget.querySelector('input[name="title"]')
    if (titleInput) titleInput.focus()
  }
  
  addNote(event) {
    event.preventDefault()
    
    // Create a form for adding a new note
    const formHtml = `
      <div class="note-form" style="margin-top: 16px; padding: 16px; background-color: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 8px;">
        <form data-action="submit->job#submitNote">
          <div class="form-group">
            <label class="form-label">Note</label>
            <textarea class="form-input" name="content" rows="4" placeholder="Enter your note" required></textarea>
          </div>
          <div class="form-actions" style="margin-top: 12px;">
            <button type="submit" class="btn btn-primary">Add Note</button>
            <button type="button" class="btn btn-secondary" data-action="click->job#cancelNoteForm">Cancel</button>
          </div>
        </form>
      </div>
    `
    
    // Insert the form after the button
    event.target.insertAdjacentHTML('afterend', formHtml)
    
    // Hide the add button
    event.target.style.display = 'none'
    
    // Focus on the textarea
    const textarea = this.notesSectionTarget.querySelector('textarea[name="content"]')
    if (textarea) textarea.focus()
  }
  
  async submitTask(event) {
    event.preventDefault()
    
    const form = event.target
    const formData = new FormData(form)
    
    const jobId = this.element.dataset.jobId
    const clientId = this.element.dataset.clientId
    
    try {
      const response = await fetch(`/clients/${clientId}/jobs/${jobId}/tasks`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: {
            title: formData.get('title'),
            description: formData.get('description')
          }
        })
      })
      
      if (response.ok) {
        // Reload the page to show the new task
        window.location.reload()
      } else {
        const data = await response.json()
        alert('Error creating task: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error creating task: ' + error.message)
    }
  }
  
  async submitNote(event) {
    event.preventDefault()
    
    const form = event.target
    const formData = new FormData(form)
    
    const jobId = this.element.dataset.jobId
    const clientId = this.element.dataset.clientId
    
    try {
      const response = await fetch(`/clients/${clientId}/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note: {
            content: formData.get('content')
          }
        })
      })
      
      if (response.ok) {
        // Reload the page to show the new note
        window.location.reload()
      } else {
        const data = await response.json()
        alert('Error creating note: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Error creating note: ' + error.message)
    }
  }
  
  cancelTaskForm(event) {
    const form = event.target.closest('.task-form')
    const addButton = form.previousElementSibling
    
    form.remove()
    addButton.style.display = ''
  }
  
  cancelNoteForm(event) {
    const form = event.target.closest('.note-form')
    const addButton = form.previousElementSibling
    
    form.remove()
    addButton.style.display = ''
  }
}