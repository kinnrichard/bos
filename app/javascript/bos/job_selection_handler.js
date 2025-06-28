// Module for handling task selection and keyboard navigation
export class JobSelectionHandler {
  constructor(controller) {
    this.controller = controller
    this.lastSelectedTask = null
  }

  handleTaskClick(event, taskElement) {
    // Don't select if clicking on interactive elements
    const isInteractive = event.target.closest('button, input, [contenteditable="true"], .dropdown-menu')
    if (isInteractive) return

    if (event.shiftKey && this.lastSelectedTask) {
      // Range selection
      event.preventDefault()
      this.selectTaskRange(this.lastSelectedTask, taskElement)
    } else if (event.metaKey || event.ctrlKey) {
      // Toggle selection
      event.preventDefault()
      this.toggleTaskSelection(taskElement)
    } else {
      // Single selection
      this.clearSelection()
      this.selectTask(taskElement)
    }
  }

  selectTask(taskElement) {
    if (!taskElement || taskElement.classList.contains('selected')) return
    
    taskElement.classList.add('selected')
    this.lastSelectedTask = taskElement
    this.updateSelectionCount()
  }

  deselectTask(taskElement) {
    if (!taskElement) return
    
    taskElement.classList.remove('selected')
    if (this.lastSelectedTask === taskElement) {
      const selectedTasks = this.controller.element.querySelectorAll('.task-item.selected')
      this.lastSelectedTask = selectedTasks.length > 0 ? selectedTasks[selectedTasks.length - 1] : null
    }
    this.updateSelectionCount()
  }

  toggleTaskSelection(taskElement) {
    if (taskElement.classList.contains('selected')) {
      this.deselectTask(taskElement)
    } else {
      this.selectTask(taskElement)
    }
  }

  clearSelection() {
    const selectedTasks = this.controller.element.querySelectorAll('.task-item.selected')
    selectedTasks.forEach(task => task.classList.remove('selected'))
    this.lastSelectedTask = null
    this.updateSelectionCount()
  }

  selectTaskRange(fromTask, toTask) {
    const allTasks = Array.from(this.controller.element.querySelectorAll('.task-item:not(.new-task)'))
    const fromIndex = allTasks.indexOf(fromTask)
    const toIndex = allTasks.indexOf(toTask)
    
    if (fromIndex === -1 || toIndex === -1) return
    
    const startIndex = Math.min(fromIndex, toIndex)
    const endIndex = Math.max(fromIndex, toIndex)
    
    // Clear existing selection
    this.clearSelection()
    
    // Select range
    for (let i = startIndex; i <= endIndex; i++) {
      allTasks[i].classList.add('selected')
    }
    
    this.lastSelectedTask = toTask
    this.updateSelectionCount()
  }

  selectAllTasks() {
    const allTasks = this.controller.element.querySelectorAll('.task-item:not(.new-task)')
    allTasks.forEach(task => task.classList.add('selected'))
    
    if (allTasks.length > 0) {
      this.lastSelectedTask = allTasks[allTasks.length - 1]
    }
    
    this.updateSelectionCount()
  }

  updateSelectionCount() {
    const selectionManager = window.Bos?.SelectionManager
    if (!selectionManager) return
    
    const selectedCount = this.controller.element.querySelectorAll('.task-item.selected').length
    selectionManager.updateSelectionCount(selectedCount)
  }

  handleArrowNavigation(direction) {
    const selectedTasks = Array.from(this.controller.element.querySelectorAll('.task-item.selected'))
    const allTasks = Array.from(this.controller.element.querySelectorAll('.task-item:not(.new-task)'))
    
    if (allTasks.length === 0) return
    
    let targetTask
    
    if (selectedTasks.length === 0) {
      // No selection, select first/last based on direction
      targetTask = direction === 'up' ? allTasks[allTasks.length - 1] : allTasks[0]
    } else {
      // Get the boundary task based on direction
      const boundaryTask = direction === 'up' ? selectedTasks[0] : selectedTasks[selectedTasks.length - 1]
      const currentIndex = allTasks.indexOf(boundaryTask)
      
      if (currentIndex === -1) return
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      if (targetIndex >= 0 && targetIndex < allTasks.length) {
        targetTask = allTasks[targetIndex]
      }
    }
    
    if (targetTask) {
      this.clearSelection()
      this.selectTask(targetTask)
      
      // Scroll into view if needed
      const rect = targetTask.getBoundingClientRect()
      const containerRect = this.controller.element.getBoundingClientRect()
      
      if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        targetTask.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }

  getSelectedTasks() {
    return Array.from(this.controller.element.querySelectorAll('.task-item.selected'))
  }

  getSelectedTaskIds() {
    return this.getSelectedTasks().map(task => task.dataset.taskId)
  }

  hasSelection() {
    return this.getSelectedTasks().length > 0
  }
}