// Selection management for tasks

import { CLASSES, DATA_ATTRS } from './constants'

export class SelectionManager {
  constructor(controller) {
    this.controller = controller
    this.selectedTasks = new Set()
    this.lastClickedTask = null
  }

  // Get selected task elements
  getSelectedElements() {
    return Array.from(this.selectedTasks)
  }

  // Get selected task IDs
  getSelectedIds() {
    return this.getSelectedElements()
      .map(el => el.getAttribute(DATA_ATTRS.TASK_ID))
      .filter(id => id)
  }

  // Check if any tasks are selected
  hasSelection() {
    return this.selectedTasks.size > 0
  }

  // Check if a specific task is selected
  isSelected(taskElement) {
    return this.selectedTasks.has(taskElement)
  }

  // Select a single task
  select(taskElement) {
    if (!taskElement || this.isSelected(taskElement)) return
    
    this.selectedTasks.add(taskElement)
    taskElement.classList.add(CLASSES.SELECTED)
    taskElement.setAttribute(DATA_ATTRS.SELECTED, 'true')
    this.updateUI()
  }

  // Deselect a single task
  deselect(taskElement) {
    if (!taskElement || !this.isSelected(taskElement)) return
    
    this.selectedTasks.delete(taskElement)
    taskElement.classList.remove(CLASSES.SELECTED)
    taskElement.setAttribute(DATA_ATTRS.SELECTED, 'false')
    this.updateUI()
  }

  // Toggle selection
  toggle(taskElement) {
    if (this.isSelected(taskElement)) {
      this.deselect(taskElement)
    } else {
      this.select(taskElement)
    }
  }

  // Clear all selections
  clearAll() {
    this.selectedTasks.forEach(task => {
      task.classList.remove(CLASSES.SELECTED)
      task.setAttribute(DATA_ATTRS.SELECTED, 'false')
    })
    this.selectedTasks.clear()
    this.lastClickedTask = null
    this.updateUI()
  }

  // Select all tasks
  selectAll() {
    const allTasks = this.controller.element.querySelectorAll('.task-item')
    allTasks.forEach(task => this.select(task))
  }

  // Select range between two tasks
  selectRange(fromTask, toTask) {
    const allTasks = Array.from(this.controller.element.querySelectorAll('.task-item'))
    const fromIndex = allTasks.indexOf(fromTask)
    const toIndex = allTasks.indexOf(toTask)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    
    for (let i = start; i <= end; i++) {
      this.select(allTasks[i])
    }
  }

  // Handle click with modifiers
  handleClick(taskElement, event) {
    if (event.metaKey || event.ctrlKey) {
      // Toggle selection
      this.toggle(taskElement)
    } else if (event.shiftKey && this.lastClickedTask) {
      // Range selection
      this.selectRange(this.lastClickedTask, taskElement)
    } else {
      // Single selection
      this.clearAll()
      this.select(taskElement)
    }
    
    this.lastClickedTask = taskElement
  }

  // Update UI based on selection
  updateUI() {
    const hasSelection = this.hasSelection()
    const count = this.selectedTasks.size
    
    // Update bulk actions visibility
    const bulkActions = this.controller.element.querySelector('.bulk-actions')
    if (bulkActions) {
      bulkActions.classList.toggle(CLASSES.HIDDEN, !hasSelection)
      
      const countElement = bulkActions.querySelector('.selection-count')
      if (countElement) {
        countElement.textContent = `${count} selected`
      }
    }
    
    // Notify controller
    if (this.controller.onSelectionChange) {
      this.controller.onSelectionChange(count)
    }
  }

  // Get selection info
  getSelectionInfo() {
    const elements = this.getSelectedElements()
    const statuses = new Set()
    const priorities = new Set()
    
    elements.forEach(el => {
      const status = el.getAttribute(DATA_ATTRS.STATUS)
      const priority = el.getAttribute(DATA_ATTRS.PRIORITY)
      if (status) statuses.add(status)
      if (priority) priorities.add(priority)
    })
    
    return {
      count: elements.length,
      ids: this.getSelectedIds(),
      elements,
      statuses: Array.from(statuses),
      priorities: Array.from(priorities),
      hasMultipleStatuses: statuses.size > 1,
      hasMultiplePriorities: priorities.size > 1
    }
  }
}