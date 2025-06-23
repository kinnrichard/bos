import { Controller } from "@hotwired/stimulus"
import { Turbo } from "@hotwired/turbo-rails"

export default class extends Controller {
  static targets = ["list"]
  
  connect() {
    this.dropIndicator = null
    this.currentDropMode = null
    this.currentDropTarget = null
    this.dropPosition = null
    this.isDragging = false
    this.draggedElement = null
    this.requestQueue = []
    this.processingRequest = false
    this.boundHandlers = new WeakMap() // Track bound handlers for cleanup
    this.initializeCustomDragDrop()
    
    // Listen for Turbo Stream updates to reinitialize draggable items
    this.turboStreamHandler = (event) => {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        this.refresh()
      })
    }
    document.addEventListener('turbo:before-stream-render', this.turboStreamHandler)
  }
  
  initializeCustomDragDrop() {
    // Find the tasks list element
    const tasksList = this.element.querySelector('.tasks-list')
    if (!tasksList) {
      console.warn('No .tasks-list element found')
      return
    }
    
    // Setup event delegation for drag and drop
    this.setupEventDelegation()
    this.setupDraggableItems()
    this.createDropIndicator()
  }
  
  setupEventDelegation() {
    // Use event delegation on the container to avoid duplicate listeners
    // Only set up if not already done
    if (this.dragStartHandler) return
    
    // Store bound handlers for cleanup
    this.dragStartHandler = this.handleDelegatedDragStart.bind(this)
    this.dragEndHandler = this.handleDelegatedDragEnd.bind(this)
    this.dragOverHandler = this.handleDelegatedDragOver.bind(this)
    this.dragEnterHandler = this.handleDelegatedDragEnter.bind(this)
    this.dragLeaveHandler = this.handleDelegatedDragLeave.bind(this)
    this.dropHandler = this.handleDelegatedDrop.bind(this)
    
    this.element.addEventListener('dragstart', this.dragStartHandler)
    this.element.addEventListener('dragend', this.dragEndHandler)
    this.element.addEventListener('dragover', this.dragOverHandler)
    this.element.addEventListener('dragenter', this.dragEnterHandler)
    this.element.addEventListener('dragleave', this.dragLeaveHandler)
    this.element.addEventListener('drop', this.dropHandler)
  }
  
  handleDelegatedDragStart(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem || taskItem.closest('.new-task-wrapper')) return
    this.handleDragStart(e)
  }
  
  handleDelegatedDragEnd(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem) return
    this.handleDragEnd(e)
  }
  
  handleDelegatedDragOver(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem || taskItem.closest('.new-task-wrapper')) return
    this.handleDragOver(e)
  }
  
  handleDelegatedDragEnter(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem || taskItem.closest('.new-task-wrapper')) return
    this.handleDragEnter(e)
  }
  
  handleDelegatedDragLeave(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem) return
    this.handleDragLeave(e)
  }
  
  handleDelegatedDrop(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem || taskItem.closest('.new-task-wrapper')) return
    this.handleDrop(e)
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
      
      // No need to add event listeners here - using event delegation
    })
  }
  
  handleDragStart(e) {
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem) return
    
    this.isDragging = true
    this.draggedElement = taskItem
    const wrapper = taskItem.closest('.task-wrapper')
    
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
    const taskItem = e.target.closest('.task-item, .subtask-item')
    if (!taskItem) return
    const wrapper = taskItem.closest('.task-wrapper')
    
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
    
    // Capture positions before any changes for FLIP animation
    this.captureFlipPositions()
    
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
    
    // Calculate target position before moving (last position in subtasks)
    const parentWrapper = this.element.querySelector(`.task-item[data-task-id="${parentId}"], .subtask-item[data-task-id="${parentId}"]`)?.closest('.task-wrapper')
    let targetPosition = 1
    if (parentWrapper) {
      const existingSubtasks = parentWrapper.querySelectorAll('.subtask-item')
      targetPosition = existingSubtasks.length + 1
    }
    
    // Queue the request
    this.queueRequest(() => {
      const jobController = this.element.closest('[data-controller*="job"]')
      const jobId = jobController?.dataset.jobId
      const clientId = jobController?.dataset.clientId
      
      if (!jobId || !clientId) return Promise.reject('Missing IDs')
      
      // No visual feedback - keep it fully optimistic
      
      // Send request with Turbo Stream format
      return fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'text/vnd.turbo-stream.html, application/json'
        },
        body: JSON.stringify({ 
          task: { 
            parent_id: parentId,
            position: targetPosition
          }
        })
      })
      .then(response => {
        if (response.headers.get('content-type').includes('turbo-stream')) {
          // Turbo Stream will replace the DOM, so don't do optimistic updates
          return response.text().then(html => {
            Turbo.renderStreamMessage(html)
          })
        } else {
          // Only do optimistic update for JSON response
          return response.json().then(data => {
            if (data.status === 'success') {
              // Fallback for JSON response
              this.moveToSubtaskContainer(taskWrapper, parentId)
              this.updateSubtaskCount(parentId)
              this.refresh()
            }
          })
        }
      })
      .catch(error => {
        console.error('Error updating task:', error)
      })
    })
    
    // Optimistic update
    this.moveToSubtaskContainer(taskWrapper, parentId)
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
    
    // Update the task's classes to subtask classes
    const taskItem = taskWrapper.querySelector('.task-item, .subtask-item')
    if (taskItem) {
      // Always ensure it has subtask-item class
      taskItem.classList.remove('task-item')
      taskItem.classList.add('subtask-item')
      
      // Update parent_id data attribute
      taskItem.dataset.parentId = parentId
      
      // Update title classes
      const titleEl = taskWrapper.querySelector('.task-title, .subtask-title')
      if (titleEl) {
        titleEl.classList.remove('task-title')
        titleEl.classList.add('subtask-title')
      }
      
      // Update content classes
      const contentEl = taskWrapper.querySelector('.task-content, .subtask-content')
      if (contentEl) {
        contentEl.classList.remove('task-content')
        contentEl.classList.add('subtask-content')
      }
    }
    
    // Move to subtasks container (always append for middle drop)
    subtasksContainer.appendChild(taskWrapper)
    
    // Return the position (last position when dropping in middle)
    return this.calculatePositionInContainer(taskWrapper, subtasksContainer)
  }
  
  
  handleReorder(draggedWrapper, targetTaskItem) {
    if (!draggedWrapper || !targetTaskItem || !this.dropPosition) return
    
    const targetWrapper = targetTaskItem.closest('.task-wrapper')
    if (!targetWrapper || targetWrapper === draggedWrapper) return
    
    const container = targetWrapper.parentElement
    const draggedTask = draggedWrapper.querySelector('.task-item, .subtask-item')
    const targetTask = targetWrapper.querySelector('.task-item, .subtask-item')
    
    // Check if we're dropping into a subtask container
    const isTargetInSubtaskContainer = container.classList.contains('subtasks-container')
    const isDraggedFromSubtaskContainer = draggedWrapper.parentElement.classList.contains('subtasks-container')
    
    // Determine the parent ID based on the container
    let newParentId = null
    if (isTargetInSubtaskContainer) {
      // Find the parent task of this subtask container
      const parentTaskWrapper = container.closest('.task-wrapper')
      if (parentTaskWrapper) {
        const parentTask = parentTaskWrapper.querySelector('.task-item, .subtask-item')
        newParentId = parentTask?.dataset.taskId
      }
    }
    
    // Store current state for validation
    const originalParent = draggedWrapper.parentElement
    const originalNext = draggedWrapper.nextElementSibling
    const draggedId = draggedTask?.dataset.taskId
    
    // If we're moving to a different parent level, update the server first
    if (draggedId && ((isTargetInSubtaskContainer && !isDraggedFromSubtaskContainer) || 
                      (!isTargetInSubtaskContainer && isDraggedFromSubtaskContainer) ||
                      (isTargetInSubtaskContainer && isDraggedFromSubtaskContainer && newParentId !== draggedTask.dataset.parentId))) {
      
      // Calculate target position in the new container
      const allWrappers = Array.from(container.querySelectorAll('.task-wrapper:not(.new-task-wrapper)'))
      let targetPosition = 1
      
      if (this.dropPosition === 'before') {
        const targetIndex = allWrappers.indexOf(targetWrapper)
        targetPosition = targetIndex + 1
      } else {
        const targetIndex = allWrappers.indexOf(targetWrapper)
        targetPosition = targetIndex + 2
      }
      
      // Update parent and position together
      this.updateTaskParentAndPosition(draggedId, newParentId, targetPosition, () => {
        // Move DOM element to new container
        this.moveToNewParent(draggedWrapper, targetWrapper, container, newParentId)
      })
    } else {
      // Same parent level, just reorder
      this.performReorderMove(draggedWrapper, targetWrapper, container)
    }
  }
  
  performReorderMove(draggedWrapper, targetWrapper, container) {
    // Check if we need to update task classes
    const isMovingToRootLevel = container.classList.contains('tasks-list')
    const isMovingToSubtaskLevel = container.classList.contains('subtasks-container')
    
    // Update task classes if moving between levels
    if (isMovingToRootLevel) {
      this.convertToRootTask(draggedWrapper)
    } else if (isMovingToSubtaskLevel) {
      // Convert to subtask classes when moving into a subtask container
      const draggedTask = draggedWrapper.querySelector('.task-item, .subtask-item')
      if (draggedTask) {
        // Find the parent task ID from the container
        const parentTaskWrapper = container.closest('.task-wrapper')
        const parentTask = parentTaskWrapper?.querySelector('.task-item, .subtask-item')
        const parentId = parentTask?.dataset.taskId
        
        if (parentId) {
          // Convert to subtask classes
          draggedTask.classList.remove('task-item')
          draggedTask.classList.add('subtask-item')
          draggedTask.dataset.parentId = parentId
          
          // Update title classes
          const titleEl = draggedWrapper.querySelector('.task-title, .subtask-title')
          if (titleEl) {
            titleEl.classList.remove('task-title')
            titleEl.classList.add('subtask-title')
          }
          
          // Update content classes
          const contentEl = draggedWrapper.querySelector('.task-content, .subtask-content')
          if (contentEl) {
            contentEl.classList.remove('task-content')
            contentEl.classList.add('subtask-content')
          }
        }
      }
    }
    
    // Use the precise position determined during dragover
    let insertBefore = null
    if (this.dropPosition === 'before') {
      insertBefore = targetWrapper
    } else {
      insertBefore = targetWrapper.nextElementSibling
    }
    
    // Optimistically move DOM element
    if (draggedWrapper.parentElement) {
      draggedWrapper.parentElement.removeChild(draggedWrapper)
    }
    
    if (insertBefore && insertBefore.parentElement === container) {
      container.insertBefore(draggedWrapper, insertBefore)
    } else {
      container.appendChild(draggedWrapper)
    }
    
    // Update positions for all items in the container
    const items = Array.from(container.children).filter(el => 
      el.classList.contains('task-wrapper') && !el.classList.contains('new-task-wrapper')
    )
    
    const positions = items.map((item, index) => ({
      id: item.querySelector('.task-item, .subtask-item')?.dataset.taskId,
      position: index + 1
    })).filter(p => p.id)
    
    // No visual feedback - keep it fully optimistic
    
    // Queue the reorder request
    this.queueRequest(() => {
      const jobController = this.element.closest('[data-controller*="job"]')
      const jobId = jobController?.dataset.jobId
      const clientId = jobController?.dataset.clientId
      
      if (!jobId || !clientId) return Promise.reject('Missing IDs')
      
      return fetch(`/clients/${clientId}/jobs/${jobId}/tasks/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'text/vnd.turbo-stream.html, application/json'
        },
        body: JSON.stringify({ positions })
      })
      .then(response => {
        if (response.headers.get('content-type').includes('turbo-stream')) {
          // Let Turbo Stream handle the DOM update with FLIP animations
          return response.text().then(html => {
            Turbo.renderStreamMessage(html)
          })
        } else {
          // Only update DOM for non-Turbo Stream responses
          // Refresh drag handlers
          this.refresh()
        }
      })
      .catch(error => {
        console.error('Reorder failed:', error)
      })
    })
  }
  
  convertToRootTask(taskWrapper) {
    const taskItem = taskWrapper.querySelector('.task-item, .subtask-item')
    if (taskItem) {
      // Convert to root task classes
      taskItem.classList.remove('subtask-item')
      taskItem.classList.add('task-item')
      
      // Clear parent_id data attribute
      delete taskItem.dataset.parentId
      
      // Update title classes
      const titleEl = taskWrapper.querySelector('.task-title, .subtask-title')
      if (titleEl) {
        titleEl.classList.remove('subtask-title')
        titleEl.classList.add('task-title')
      }
      
      // Update content classes
      const contentEl = taskWrapper.querySelector('.task-content, .subtask-content')
      if (contentEl) {
        contentEl.classList.remove('subtask-content')
        contentEl.classList.add('task-content')
      }
    }
  }
  
  updateTaskParent(taskId, newParentId, callback) {
    const jobController = this.element.closest('[data-controller*="job"]')
    const jobId = jobController?.dataset.jobId
    const clientId = jobController?.dataset.clientId
    
    if (!jobId || !clientId) return
    
    fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body: JSON.stringify({ 
        task: { parent_id: newParentId }
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        if (callback) callback()
      }
    })
    .catch(error => {
      console.error('Error updating task parent:', error)
    })
  }
  
  updateTaskParentAndPosition(taskId, newParentId, position, callback) {
    this.queueRequest(() => {
      const jobController = this.element.closest('[data-controller*="job"]')
      const jobId = jobController?.dataset.jobId
      const clientId = jobController?.dataset.clientId
      
      if (!jobId || !clientId) return Promise.reject('Missing IDs')
      
      return fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || '',
          'Accept': 'text/vnd.turbo-stream.html, application/json'
        },
        body: JSON.stringify({ 
          task: { 
            parent_id: newParentId,
            position: position
          }
        })
      })
      .then(response => {
        if (response.headers.get('content-type').includes('turbo-stream')) {
          return response.text().then(html => {
            Turbo.renderStreamMessage(html)
            if (callback) callback()
          })
        } else {
          return response.json().then(data => {
            if (data.status === 'success' && callback) {
              callback()
            }
          })
        }
      })
    })
    
    // Optimistic update
    if (callback) callback()
  }
  
  
  moveToNewParent(draggedWrapper, targetWrapper, container, newParentId) {
    const draggedTask = draggedWrapper.querySelector('.task-item, .subtask-item')
    const draggedTaskId = draggedTask?.dataset.taskId
    
    // Update task classes based on new parent
    if (newParentId) {
      // Moving to subtask container
      if (draggedTask) {
        draggedTask.classList.remove('task-item')
        draggedTask.classList.add('subtask-item')
        draggedTask.dataset.parentId = newParentId
        
        // Update title classes
        const titleEl = draggedWrapper.querySelector('.task-title, .subtask-title')
        if (titleEl) {
          titleEl.classList.remove('task-title')
          titleEl.classList.add('subtask-title')
        }
        
        // Update content classes
        const contentEl = draggedWrapper.querySelector('.task-content, .subtask-content')
        if (contentEl) {
          contentEl.classList.remove('task-content')
          contentEl.classList.add('subtask-content')
        }
      }
    } else {
      // Moving to root level
      this.convertToRootTask(draggedWrapper)
    }
    
    // Move DOM element based on drop position
    let insertBefore = null
    if (this.dropPosition === 'before') {
      insertBefore = targetWrapper
    } else {
      insertBefore = targetWrapper.nextElementSibling
    }
    
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
    
    // Refresh drag handlers
    this.refresh()
    
    // No need to dispatch events - position was already handled in updateTaskParentAndPosition
  }
  
  calculatePositionInContainer(taskWrapper, container) {
    const allWrappers = Array.from(container.querySelectorAll('.task-wrapper:not(.new-task-wrapper)'))
    const index = allWrappers.indexOf(taskWrapper)
    return index + 1  // Position is 1-based
  }
  
  refresh() {
    // Reinitialize all draggable items
    this.setupDraggableItems()
  }
  
  queueRequest(requestFn) {
    this.requestQueue.push(requestFn)
    this.processQueue()
  }
  
  async processQueue() {
    if (this.processingRequest || this.requestQueue.length === 0) return
    
    this.processingRequest = true
    const request = this.requestQueue.shift()
    
    try {
      await request()
    } catch (error) {
      console.error('Request failed:', error)
    } finally {
      this.processingRequest = false
      // Process next request in queue
      if (this.requestQueue.length > 0) {
        this.processQueue()
      }
    }
  }
  
  disconnect() {
    // Remove delegated event listeners using stored handlers
    if (this.dragStartHandler) {
      this.element.removeEventListener('dragstart', this.dragStartHandler)
      this.element.removeEventListener('dragend', this.dragEndHandler)
      this.element.removeEventListener('dragover', this.dragOverHandler)
      this.element.removeEventListener('dragenter', this.dragEnterHandler)
      this.element.removeEventListener('dragleave', this.dragLeaveHandler)
      this.element.removeEventListener('drop', this.dropHandler)
    }
    
    // Remove Turbo Stream listener
    if (this.turboStreamHandler) {
      document.removeEventListener('turbo:before-stream-render', this.turboStreamHandler)
    }
    
    if (this.dropIndicator && this.dropIndicator.parentNode) {
      this.dropIndicator.parentNode.removeChild(this.dropIndicator)
    }
  }
  
  captureFlipPositions() {
    // Trigger the flip controller to capture positions
    const flipController = this.element.closest('[data-controller*="flip"]')
    if (flipController) {
      const event = new CustomEvent('turbo:before-stream-render', { bubbles: true })
      flipController.dispatchEvent(event)
    }
  }
}