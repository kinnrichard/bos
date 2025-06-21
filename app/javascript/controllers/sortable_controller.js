import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["list"]
  
  connect() {
    this.dropIndicator = null
    this.currentDropMode = null
    this.currentDropTarget = null
    this.dropPosition = null
    this.isDragging = false
    this.draggedElement = null
    this.initializeCustomDragDrop()
  }
  
  initializeCustomDragDrop() {
    // Find the tasks list element
    const tasksList = this.element.querySelector('.tasks-list')
    if (!tasksList) {
      console.warn('No .tasks-list element found')
      return
    }
    
    // Setup drag and drop on all task items
    this.setupDraggableItems()
    this.createDropIndicator()
  }
  
  setupDraggableItems() {
    const taskWrappers = this.element.querySelectorAll('.task-wrapper:not(.new-task-wrapper)')
    
    taskWrappers.forEach(wrapper => {
      const taskItem = wrapper.querySelector('.task-item, .subtask-item')
      if (!taskItem) return
      
      // Make the task draggable (but not the text)
      taskItem.draggable = true
      taskItem.style.cursor = 'grab'
      
      // Disable dragging on text elements
      const textElements = taskItem.querySelectorAll('.task-title, .subtask-title')
      textElements.forEach(textEl => {
        textEl.draggable = false
        textEl.style.cursor = 'text'
        textEl.style.pointerEvents = 'auto'
        textEl.style.userSelect = 'text'
      })
      
      // Add drag event listeners
      taskItem.addEventListener('dragstart', this.handleDragStart.bind(this))
      taskItem.addEventListener('dragend', this.handleDragEnd.bind(this))
      
      // Add drop zone listeners
      taskItem.addEventListener('dragover', this.handleDragOver.bind(this))
      taskItem.addEventListener('dragenter', this.handleDragEnter.bind(this))
      taskItem.addEventListener('dragleave', this.handleDragLeave.bind(this))
      taskItem.addEventListener('drop', this.handleDrop.bind(this))
    })
  }
  
  handleDragStart(e) {
    this.isDragging = true
    this.draggedElement = e.target
    const wrapper = e.target.closest('.task-wrapper')
    
    // Add visual feedback
    wrapper.classList.add('dragging')
    window.getSelection().removeAllRanges()
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', wrapper.outerHTML)
    
    // Make the drag image semi-transparent
    setTimeout(() => {
      e.target.style.opacity = '0.5'
    }, 0)
  }
  
  handleDragEnd(e) {
    this.isDragging = false
    const wrapper = e.target.closest('.task-wrapper')
    
    // Remove visual feedback but don't interfere with reordering
    if (wrapper) {
      wrapper.classList.remove('dragging')
    }
    e.target.style.opacity = '1'
    
    // Clear highlights but don't reset state immediately (let drop handler finish)
    setTimeout(() => {
      this.clearHighlights()
      this.hideDropIndicator()
      
      // Reset state after any pending operations
      this.currentDropMode = null
      this.currentDropTarget = null
      this.dropPosition = null
      this.draggedElement = null
    }, 50)
  }
  
  handleDragOver(e) {
    e.preventDefault() // Allow drop
    
    // Don't process if this is the dragged element
    if (e.target === this.draggedElement || e.target.closest('.task-wrapper') === this.draggedElement.closest('.task-wrapper')) {
      return
    }
    
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem) return
    
    const rect = taskItem.getBoundingClientRect()
    const y = e.clientY
    const relativeY = y - rect.top
    const height = rect.height
    const threshold = 0.3 // 30% from top/bottom
    
    // Clear previous highlights
    this.clearHighlights()
    this.hideDropIndicator()
    
    if (relativeY > height * threshold && relativeY < height * (1 - threshold)) {
      // Middle zone - highlight for subtask creation
      taskItem.classList.add('drop-target')
      this.currentDropMode = 'subtask'
      this.currentDropTarget = taskItem
      this.dropPosition = null // Not applicable for subtask creation
    } else {
      // Edge zones - show line for reorder
      const wrapper = taskItem.closest('.task-wrapper')
      if (wrapper) {
        const insertBefore = relativeY < height * 0.5
        this.positionDropIndicator(wrapper, insertBefore)
        this.currentDropMode = 'reorder'
        this.currentDropTarget = taskItem
        this.dropPosition = insertBefore ? 'before' : 'after'
      }
    }
  }
  
  handleDragEnter(e) {
    e.preventDefault()
  }
  
  handleDragLeave(e) {
    // Only clear if we're actually leaving the element
    const relatedTarget = e.relatedTarget
    const currentTarget = e.currentTarget
    
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      const taskItem = currentTarget.closest('.task-item, .subtask-item')
      if (taskItem) {
        taskItem.classList.remove('drop-target')
      }
    }
  }
  
  handleDrop(e) {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    if (!this.draggedElement || !this.currentDropTarget) return
    
    const draggedWrapper = this.draggedElement.closest('.task-wrapper')
    const draggedTask = this.draggedElement
    const draggedId = draggedTask?.dataset.taskId
    
    if (this.currentDropMode === 'subtask' && draggedId) {
      // Create subtask
      const parentId = this.currentDropTarget.dataset.taskId
      if (parentId && parentId !== draggedId) {
        this.makeSubtask(draggedId, parentId, draggedWrapper)
      }
    } else if (this.currentDropMode === 'reorder') {
      // Handle reorder - defer to avoid conflicts with drag end
      setTimeout(() => {
        this.handleReorder(draggedWrapper, this.currentDropTarget)
      }, 10)
    }
    
    this.clearHighlights()
    this.hideDropIndicator()
  }
  
  createDropIndicator() {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement('div')
      this.dropIndicator.className = 'drop-indicator'
      this.dropIndicator.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background-color: var(--accent-blue);
        pointer-events: none;
        z-index: 1000;
        display: none;
        border-radius: 1px;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
      `
      document.body.appendChild(this.dropIndicator)
    }
  }
  
  positionDropIndicator(targetWrapper, before) {
    const rect = targetWrapper.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    
    this.dropIndicator.style.left = rect.left + 'px'
    this.dropIndicator.style.width = rect.width + 'px'
    this.dropIndicator.style.top = (before ? rect.top : rect.bottom) + scrollTop + 'px'
    this.dropIndicator.style.display = 'block'
  }
  
  hideDropIndicator() {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none'
    }
  }
  
  clearHighlights() {
    document.querySelectorAll('.drop-target').forEach(el => {
      el.classList.remove('drop-target')
    })
  }
  
  makeSubtask(taskId, parentId, taskWrapper) {
    if (!taskId || !parentId) return
    
    // Send request to update parent_id
    const jobController = this.element.closest('[data-controller*="job"]')
    const jobId = jobController?.dataset.jobId
    const clientId = jobController?.dataset.clientId
    
    if (!jobId || !clientId) return
    
    fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
      },
      body: JSON.stringify({ 
        task: { parent_id: parentId }
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        // Move the task element to the parent's subtask container
        this.moveToSubtaskContainer(taskWrapper, parentId)
        
        // Update subtask count
        this.updateSubtaskCount(parentId)
        
        // Reinitialize drag drop for the moved items
        this.refresh()
        
        // Dispatch event for job controller
        const event = new CustomEvent('task:parent-changed', {
          detail: { taskId, parentId },
          bubbles: true
        })
        this.element.dispatchEvent(event)
      }
    })
    .catch(error => {
      console.error('Error making subtask:', error)
    })
  }
  
  moveToSubtaskContainer(taskWrapper, parentId) {
    const parentWrapper = this.element.querySelector(`.task-item[data-task-id="${parentId}"], .subtask-item[data-task-id="${parentId}"]`)?.closest('.task-wrapper')
    if (!parentWrapper) return
    
    // Find or create subtasks container
    let subtasksContainer = parentWrapper.querySelector('.subtasks-container')
    if (!subtasksContainer) {
      subtasksContainer = document.createElement('div')
      subtasksContainer.className = 'subtasks subtasks-container'
      parentWrapper.appendChild(subtasksContainer)
    }
    
    // Update the task's classes from task-item to subtask-item
    const taskItem = taskWrapper.querySelector('.task-item')
    if (taskItem) {
      taskItem.classList.remove('task-item')
      taskItem.classList.add('subtask-item')
      
      // Update other classes
      taskWrapper.querySelectorAll('.task-title').forEach(el => {
        el.classList.remove('task-title')
        el.classList.add('subtask-title')
      })
      
      taskWrapper.querySelectorAll('.task-content').forEach(el => {
        el.classList.remove('task-content')
        el.classList.add('subtask-content')
      })
    }
    
    // Move to subtasks container
    subtasksContainer.appendChild(taskWrapper)
  }
  
  updateSubtaskCount(parentId) {
    const parentWrapper = this.element.querySelector(`.task-item[data-task-id="${parentId}"], .subtask-item[data-task-id="${parentId}"]`)?.closest('.task-wrapper')
    if (!parentWrapper) return
    
    const subtaskCount = parentWrapper.querySelectorAll('.subtask-item').length
    const taskContent = parentWrapper.querySelector('.task-content, .subtask-content')
    
    // Remove existing count
    const existingCount = taskContent?.querySelector('.subtask-count')
    if (existingCount) existingCount.remove()
    
    // Add new count if there are subtasks
    if (subtaskCount > 0 && taskContent) {
      const countSpan = document.createElement('span')
      countSpan.className = 'subtask-count'
      countSpan.style.cssText = 'font-size: 13px; color: #8E8E93; margin-left: 8px;'
      countSpan.textContent = `(${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'})`
      taskContent.appendChild(countSpan)
    }
  }
  
  handleReorder(draggedWrapper, targetTaskItem) {
    if (!draggedWrapper || !targetTaskItem || !this.dropPosition) return
    
    const targetWrapper = targetTaskItem.closest('.task-wrapper')
    if (!targetWrapper || targetWrapper === draggedWrapper) return
    
    const container = targetWrapper.parentElement
    
    // Store current state for validation
    const originalParent = draggedWrapper.parentElement
    const originalNext = draggedWrapper.nextElementSibling
    
    // Use the precise position determined during dragover
    let insertBefore = null
    if (this.dropPosition === 'before') {
      insertBefore = targetWrapper
    } else {
      insertBefore = targetWrapper.nextElementSibling
    }
    
    // Only move if it's actually a different position
    const isAlreadyInPosition = (
      originalParent === container &&
      ((insertBefore === null && originalNext === null) ||
       (insertBefore === originalNext))
    )
    
    if (!isAlreadyInPosition) {
      // Remove from original position
      if (draggedWrapper.parentElement) {
        draggedWrapper.parentElement.removeChild(draggedWrapper)
      }
      
      // Insert in new position
      if (insertBefore && insertBefore.parentElement === container) {
        container.insertBefore(draggedWrapper, insertBefore)
      } else {
        container.appendChild(draggedWrapper)
      }
      
      // Ensure the element is properly attached
      if (!draggedWrapper.parentElement) {
        console.error('Failed to attach element to new position')
        return
      }
    }
    
    // Calculate new positions after DOM move
    const items = Array.from(container.children).filter(el => 
      el.classList.contains('task-wrapper') && !el.classList.contains('new-task-wrapper')
    )
    
    const positions = items.map((item, index) => ({
      id: item.querySelector('.task-item, .subtask-item')?.dataset.taskId,
      position: index + 1
    })).filter(p => p.id)
    
    // Dispatch reorder event to update server
    const reorderEvent = new CustomEvent('tasks:reorder', {
      detail: { positions },
      bubbles: true
    })
    this.element.dispatchEvent(reorderEvent)
  }
  
  refresh() {
    // Reinitialize all draggable items
    this.setupDraggableItems()
  }
  
  disconnect() {
    if (this.dropIndicator && this.dropIndicator.parentNode) {
      this.dropIndicator.parentNode.removeChild(this.dropIndicator)
    }
  }
}