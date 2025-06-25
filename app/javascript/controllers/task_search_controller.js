import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "clearButton", "results", "resultsContent"]
  static values = { jobId: Number, clientId: Number }
  
  searchTimeout = null
  
  connect() {
    // Add keyboard shortcut listener
    this.handleKeyboardShortcut = this.handleKeyboardShortcut.bind(this)
    document.addEventListener('keydown', this.handleKeyboardShortcut)
  }
  
  disconnect() {
    document.removeEventListener('keydown', this.handleKeyboardShortcut)
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
  }
  
  handleKeyboardShortcut(event) {
    // CMD+K or CTRL+K to focus search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault()
      this.inputTarget.focus()
      this.inputTarget.select()
    }
  }
  
  search() {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
    
    const query = this.inputTarget.value.trim()
    
    // Show/hide clear button
    if (query) {
      this.clearButtonTarget.classList.remove('hidden')
    } else {
      this.clearButtonTarget.classList.add('hidden')
      this.hideResults()
      return
    }
    
    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query)
    }, 200)
  }
  
  async performSearch(query) {
    try {
      const response = await fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        this.displayResults(data.tasks, query)
      }
    } catch (error) {
      console.error('Search error:', error)
    }
  }
  
  displayResults(tasks, query) {
    if (tasks.length === 0) {
      this.resultsContentTarget.innerHTML = `
        <div class="search-no-results">
          No tasks found for "${this.escapeHtml(query)}"
        </div>
      `
    } else {
      const resultsHtml = tasks.map(task => this.renderTaskResult(task, query)).join('')
      this.resultsContentTarget.innerHTML = resultsHtml
    }
    
    this.resultsTarget.classList.remove('hidden')
  }
  
  renderTaskResult(task, query) {
    const highlightedTitle = this.highlightMatch(task.title, query)
    const path = task.parent_titles ? task.parent_titles.join(' › ') + ' › ' : ''
    
    return `
      <div class="search-result-item" data-task-id="${task.id}">
        <div class="result-content" data-action="click->task-search#goToTask">
          <div class="result-title">
            <span class="result-status">${this.getStatusEmoji(task.status)}</span>
            <span class="result-text">${highlightedTitle}</span>
          </div>
          ${path ? `<div class="result-path">${this.escapeHtml(path)}</div>` : ''}
        </div>
      </div>
    `
  }
  
  highlightMatch(text, query) {
    const escaped = this.escapeHtml(text)
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi')
    return escaped.replace(regex, '<mark>$1</mark>')
  }
  
  goToTask(event) {
    const taskId = event.currentTarget.closest('.search-result-item').dataset.taskId
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`)
    
    if (taskElement) {
      // Clear search
      this.clear()
      
      // Expand parent tasks if needed
      this.expandParentTasks(taskElement)
      
      // Scroll to task
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Highlight task temporarily
      taskElement.classList.add('highlighted')
      setTimeout(() => {
        taskElement.classList.remove('highlighted')
      }, 2000)
    }
  }
  
  expandParentTasks(taskElement) {
    let parent = taskElement.closest('.task-wrapper')
    while (parent) {
      const parentWrapper = parent.parentElement.closest('.task-wrapper')
      if (parentWrapper) {
        const subtasksContainer = parentWrapper.querySelector('.subtasks-container')
        const disclosureTriangle = parentWrapper.querySelector('.disclosure-triangle')
        
        if (subtasksContainer && subtasksContainer.classList.contains('collapsed')) {
          subtasksContainer.classList.remove('collapsed')
          if (disclosureTriangle) {
            disclosureTriangle.setAttribute('aria-expanded', 'true')
          }
        }
      }
      parent = parentWrapper
    }
  }
  
  clear() {
    this.inputTarget.value = ''
    this.clearButtonTarget.classList.add('hidden')
    this.hideResults()
  }
  
  hideResults() {
    this.resultsTarget.classList.add('hidden')
    this.resultsContentTarget.innerHTML = ''
  }
  
  getStatusEmoji(status) {
    const emojis = {
      'new_task': '⚫',
      'in_progress': '🟢',
      'paused': '⏸️',
      'successfully_completed': '☑️',
      'cancelled': '❌'
    }
    return emojis[status] || '⚫'
  }
  
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}