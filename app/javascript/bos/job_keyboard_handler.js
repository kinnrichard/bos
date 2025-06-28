// Module for handling keyboard shortcuts
export class JobKeyboardHandler {
  constructor(controller, selectionHandler, taskManager) {
    this.controller = controller
    this.selectionHandler = selectionHandler
    this.taskManager = taskManager
    this.statusMenuOpen = false
  }

  handleKeydown(event) {
    // Don't handle shortcuts when typing in inputs
    const isTyping = event.target.matches('input, textarea, [contenteditable="true"]')
    if (isTyping && !event.target.classList.contains('new-task-input')) {
      return
    }

    // Handle different key combinations
    if (event.key === 'Escape') {
      this.handleEscape(event)
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!isTyping) {
        this.handleDelete(event)
      }
    } else if (event.metaKey || event.ctrlKey) {
      this.handleMetaKey(event)
    } else if (!isTyping) {
      this.handleSingleKey(event)
    }
  }

  handleEscape(event) {
    event.preventDefault()
    
    if (this.statusMenuOpen) {
      this.closeStatusMenu()
    } else {
      this.selectionHandler.clearSelection()
    }
  }

  handleDelete(event) {
    if (this.selectionHandler.hasSelection()) {
      event.preventDefault()
      this.taskManager.deleteSelectedTasks()
    }
  }

  handleMetaKey(event) {
    switch (event.key) {
      case 'a':
        event.preventDefault()
        this.selectionHandler.selectAllTasks()
        break
      case 'n':
        event.preventDefault()
        this.taskManager.showNewTaskInput()
        break
      case 'd':
        if (this.selectionHandler.hasSelection()) {
          event.preventDefault()
          this.taskManager.deleteSelectedTasks()
        }
        break
    }
  }

  handleSingleKey(event) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        this.selectionHandler.handleArrowNavigation('up')
        break
      case 'ArrowDown':
        event.preventDefault()
        this.selectionHandler.handleArrowNavigation('down')
        break
      case 'Enter':
        if (this.selectionHandler.getSelectedTasks().length === 1) {
          event.preventDefault()
          const selectedTask = this.selectionHandler.getSelectedTasks()[0]
          const titleElement = selectedTask.querySelector('.task-title')
          if (titleElement) {
            titleElement.focus()
          }
        }
        break
      case 'n':
        event.preventDefault()
        this.taskManager.showNewTaskInput()
        break
      case 's':
        if (this.selectionHandler.getSelectedTasks().length === 1) {
          event.preventDefault()
          this.openStatusMenuForSelectedTask()
        }
        break
      case 'x':
        if (this.selectionHandler.hasSelection()) {
          event.preventDefault()
          this.taskManager.deleteSelectedTasks()
        }
        break
    }
  }

  openStatusMenuForSelectedTask() {
    const selectedTask = this.selectionHandler.getSelectedTasks()[0]
    if (!selectedTask) return
    
    const statusButton = selectedTask.querySelector('.task-status-button')
    if (statusButton) {
      statusButton.click()
      this.statusMenuOpen = true
      
      // Focus on the menu for keyboard navigation
      setTimeout(() => {
        const menu = selectedTask.querySelector('.task-status-dropdown:not(.hidden)')
        if (menu) {
          const firstOption = menu.querySelector('.task-status-option')
          if (firstOption) {
            firstOption.focus()
          }
        }
      }, 100)
    }
  }

  closeStatusMenu() {
    const openMenus = this.controller.element.querySelectorAll('.task-status-dropdown:not(.hidden)')
    openMenus.forEach(menu => menu.classList.add('hidden'))
    this.statusMenuOpen = false
  }

  handleStatusMenuKeyboard(event) {
    if (!this.statusMenuOpen) return
    
    const menu = event.target.closest('.task-status-dropdown')
    if (!menu) return
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        this.navigateStatusMenu(menu, 'up')
        break
      case 'ArrowDown':
        event.preventDefault()
        this.navigateStatusMenu(menu, 'down')
        break
      case 'Enter':
        event.preventDefault()
        const focusedOption = document.activeElement
        if (focusedOption?.classList.contains('task-status-option')) {
          focusedOption.click()
        }
        break
      case 'Escape':
        event.preventDefault()
        this.closeStatusMenu()
        break
      default:
        // Quick select by first letter
        this.selectStatusByKey(menu, event.key)
        break
    }
  }

  navigateStatusMenu(menu, direction) {
    const options = Array.from(menu.querySelectorAll('.task-status-option'))
    const currentIndex = options.indexOf(document.activeElement)
    
    let newIndex
    if (direction === 'up') {
      newIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1
    }
    
    options[newIndex]?.focus()
  }

  selectStatusByKey(menu, key) {
    const statusMap = {
      'n': 'new_task',
      'i': 'in_progress',
      'p': 'paused',
      's': 'successfully_completed',
      'c': 'cancelled'
    }
    
    const status = statusMap[key.toLowerCase()]
    if (status) {
      const option = menu.querySelector(`.task-status-option[data-status="${status}"]`)
      if (option) {
        option.click()
      }
    }
  }
}