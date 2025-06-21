import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = ["list"]
  
  connect() {
    this.dropIndicator = null
    this.initializeSortable()
  }
  
  initializeSortable() {
    // Find the tasks list element
    const tasksList = this.element.querySelector('.tasks-list');
    if (!tasksList) {
      console.warn('No .tasks-list element found');
      return;
    }
    
    // Initialize Sortable with nested support
    this.sortable = Sortable.create(tasksList, {
      group: {
        name: 'tasks',
        pull: true,
        put: true
      },
      animation: 150,
      fallbackOnBody: true,
      swapThreshold: 0.65,
      draggable: '.task-wrapper',
      handle: '.task-item',
      filter: '.task-title, .new-task-wrapper',
      preventOnFilter: false,
      
      // Touch support
      delay: 300, // 300ms delay for touch devices
      delayOnTouchOnly: true,
      touchStartThreshold: 5, // Prevent accidental drags
      
      // Called when drag starts
      onStart: (evt) => {
        window.getSelection().removeAllRanges()
        evt.item.classList.add('dragging')
        this.createDropIndicator()
      },
      
      // Called when dragging over a potential drop zone
      onMove: (evt) => {
        const draggedEl = evt.dragged
        const targetEl = evt.related
        const targetWrapper = targetEl.closest('.task-wrapper')
        
        // Clear any existing highlights
        this.clearHighlights()
        
        if (!targetWrapper || targetWrapper === draggedEl) {
          return
        }
        
        // Check if we're over the middle 50% of the target (drop as subtask)
        const rect = targetWrapper.getBoundingClientRect()
        const y = evt.originalEvent.clientY
        const height = rect.height
        const relativeY = y - rect.top
        const threshold = 0.25 // 25% from top/bottom
        
        if (relativeY > height * threshold && relativeY < height * (1 - threshold)) {
          // Dropping ON the task - highlight for subtask
          const targetTask = targetWrapper.querySelector('.task-item')
          if (targetTask && !this.wouldCreateCircularReference(draggedEl, targetWrapper)) {
            targetTask.classList.add('drop-target')
            this.hideDropIndicator()
            return false // Allow drop
          }
        } else {
          // Dropping BETWEEN tasks - show blue line
          this.positionDropIndicator(targetWrapper, relativeY < height * 0.5)
        }
      },
      
      // Called when drop happens
      onEnd: (evt) => {
        evt.item.classList.remove('dragging')
        this.clearHighlights()
        this.hideDropIndicator()
        
        const draggedWrapper = evt.item
        const draggedTask = draggedWrapper.querySelector('.task-item')
        const draggedId = draggedTask?.dataset.taskId
        
        // Check if we dropped on a task (making it a subtask)
        const dropTarget = document.querySelector('.task-item.drop-target')
        
        if (dropTarget) {
          // Make it a subtask
          const parentId = dropTarget.dataset.taskId
          this.makeSubtask(draggedId, parentId, draggedWrapper)
        } else {
          // Regular reorder
          this.handleReorder(evt)
        }
      }
    })
    
    // Initialize sortable for existing subtask containers
    this.initializeSubtaskSortables()
  }
  
  initializeSubtaskSortables() {
    const subtaskContainers = this.element.querySelectorAll('.subtasks-container')
    
    subtaskContainers.forEach(container => {
      // Skip if already initialized
      if (container._sortable) return
      
      Sortable.create(container, {
        group: {
          name: 'tasks',
          pull: true,
          put: true
        },
        animation: 150,
        draggable: '.task-wrapper',
        handle: '.subtask-item',
        filter: '.subtask-title',
        preventOnFilter: false,
        delay: 300,
        delayOnTouchOnly: true,
        
        onMove: (evt) => {
          return this.onMove ? this.onMove(evt) : true
        },
        
        onEnd: (evt) => {
          this.handleReorder(evt)
        }
      })
    })
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
  
  wouldCreateCircularReference(draggedEl, targetWrapper) {
    const draggedId = draggedEl.querySelector('.task-item')?.dataset.taskId
    const targetId = targetWrapper.querySelector('.task-item')?.dataset.taskId
    
    if (!draggedId || !targetId) return false
    
    // Check if target is a descendant of dragged
    let parent = targetWrapper.parentElement
    while (parent) {
      if (parent === draggedEl) return true
      parent = parent.parentElement
    }
    
    return false
  }
  
  makeSubtask(taskId, parentId, taskWrapper) {
    if (!taskId || !parentId) return
    
    // Send request to update parent_id
    const jobController = this.element.closest('[data-controller*="job"]')
    const jobId = jobController?.dataset.jobIdValue
    const clientId = jobController?.dataset.clientIdValue
    
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
        
        // Dispatch event for job controller
        const event = new CustomEvent('task:parent-changed', {
          detail: { taskId, parentId },
          bubbles: true
        })
        this.element.dispatchEvent(event)
      }
    })
  }
  
  moveToSubtaskContainer(taskWrapper, parentId) {
    const parentWrapper = this.element.querySelector(`.task-item[data-task-id="${parentId}"]`).closest('.task-wrapper')
    if (!parentWrapper) return
    
    // Find or create subtasks container
    let subtasksContainer = parentWrapper.querySelector('.subtasks-container')
    if (!subtasksContainer) {
      subtasksContainer = document.createElement('div')
      subtasksContainer.className = 'subtasks subtasks-container'
      parentWrapper.appendChild(subtasksContainer)
      
      // Initialize sortable on new container
      this.initializeSubtaskSortables()
    }
    
    // Update the task's classes from task-item to subtask-item
    const taskItem = taskWrapper.querySelector('.task-item')
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
    
    // Move to subtasks container
    subtasksContainer.appendChild(taskWrapper)
  }
  
  updateSubtaskCount(parentId) {
    const parentWrapper = this.element.querySelector(`.task-item[data-task-id="${parentId}"]`).closest('.task-wrapper')
    if (!parentWrapper) return
    
    const subtaskCount = parentWrapper.querySelectorAll('.subtask-item').length
    const taskContent = parentWrapper.querySelector('.task-content')
    
    // Remove existing count
    const existingCount = taskContent.querySelector('.subtask-count')
    if (existingCount) existingCount.remove()
    
    // Add new count if there are subtasks
    if (subtaskCount > 0) {
      const countSpan = document.createElement('span')
      countSpan.className = 'subtask-count'
      countSpan.style.cssText = 'font-size: 13px; color: #8E8E93; margin-left: 8px;'
      countSpan.textContent = `(${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'})`
      taskContent.appendChild(countSpan)
    }
  }
  
  handleReorder(evt) {
    const taskItem = evt.item.querySelector('.task-item, .subtask-item')
    const taskId = taskItem?.dataset.taskId
    
    if (!taskId) return
    
    // Get all siblings in the new container
    const container = evt.to
    const items = Array.from(container.children).filter(el => 
      el.classList.contains('task-wrapper') && !el.classList.contains('new-task-wrapper')
    )
    
    // Calculate new positions
    const positions = items.map((item, index) => ({
      id: item.querySelector('.task-item, .subtask-item')?.dataset.taskId,
      position: index + 1
    })).filter(p => p.id)
    
    // Dispatch reorder event
    const reorderEvent = new CustomEvent('tasks:reorder', {
      detail: { positions },
      bubbles: true
    })
    this.element.dispatchEvent(reorderEvent)
  }
  
  refresh() {
    if (this.sortable) {
      this.sortable.destroy()
    }
    this.initializeSortable()
  }
  
  disconnect() {
    if (this.sortable) {
      this.sortable.destroy()
    }
    if (this.dropIndicator && this.dropIndicator.parentNode) {
      this.dropIndicator.parentNode.removeChild(this.dropIndicator)
    }
  }
}