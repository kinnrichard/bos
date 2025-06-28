// Module for handling drag and drop operations for task reordering
export class JobDragHandler {
  constructor(controller) {
    this.controller = controller
    this.draggedElement = null
    this.draggedData = null
    this.dropTarget = null
  }

  handleDragStart(event) {
    const taskItem = event.target.closest('.task-item')
    if (!taskItem) return

    this.draggedElement = taskItem
    this.draggedData = {
      taskId: taskItem.dataset.taskId,
      parentId: taskItem.dataset.parentId,
      originalIndex: Array.from(taskItem.parentElement.children).indexOf(taskItem)
    }

    // Add dragging class
    taskItem.classList.add('dragging')
    
    // Set drag effect
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', taskItem.dataset.taskId)
  }

  handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    const taskItem = event.target.closest('.task-item')
    if (!taskItem || taskItem === this.draggedElement) return

    const rect = taskItem.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    
    // Remove previous drop indicators
    this.clearDropIndicators()
    
    // Add drop indicator
    if (event.clientY < midpoint) {
      taskItem.classList.add('drop-above')
    } else {
      taskItem.classList.add('drop-below')
    }
    
    this.dropTarget = taskItem
  }

  handleDrop(event) {
    event.preventDefault()
    
    if (!this.draggedElement || !this.dropTarget) return
    
    const dropTaskId = this.dropTarget.dataset.taskId
    const draggedTaskId = this.draggedElement.dataset.taskId
    
    if (dropTaskId === draggedTaskId) return
    
    // Determine drop position
    const rect = this.dropTarget.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    const dropBefore = event.clientY < midpoint
    
    // Get the new position
    const dropIndex = Array.from(this.dropTarget.parentElement.children).indexOf(this.dropTarget)
    const newPosition = dropBefore ? dropIndex : dropIndex + 1
    
    // Perform the reorder
    this.reorderTask(draggedTaskId, newPosition, this.dropTarget.dataset.parentId)
  }

  handleDragEnd(event) {
    // Clean up
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging')
    }
    
    this.clearDropIndicators()
    this.draggedElement = null
    this.draggedData = null
    this.dropTarget = null
  }

  clearDropIndicators() {
    const indicators = this.controller.element.querySelectorAll('.drop-above, .drop-below')
    indicators.forEach(el => {
      el.classList.remove('drop-above', 'drop-below')
    })
  }

  async reorderTask(taskId, newPosition, newParentId = null) {
    const ApiClient = window.Bos?.ApiClient
    if (!ApiClient) {
      console.error('ApiClient not available')
      return
    }

    const clientId = this.controller.clientIdValue
    const jobId = this.controller.jobIdValue
    
    try {
      const response = await fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}/reorder`, {
        method: 'PATCH',
        headers: ApiClient.headers(),
        body: JSON.stringify({
          position: newPosition,
          parent_id: newParentId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to reorder task: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      // Handle any conflicts
      if (result.conflict) {
        this.handleReorderConflict(result.conflict)
      }
      
      return result
    } catch (error) {
      console.error('Error reordering task:', error)
      throw error
    }
  }

  handleReorderConflict(conflictData) {
    console.warn('Reorder conflict detected:', conflictData)
    
    // Show a non-blocking notification
    const message = 'Another user modified this task. The page will refresh to show the latest changes.'
    
    // Use a custom notification if available, otherwise use alert
    if (window.Bos?.NotificationManager) {
      window.Bos.NotificationManager.show(message, 'warning')
    } else {
      alert(message)
    }
    
    // Reload the page to get fresh data
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }
}