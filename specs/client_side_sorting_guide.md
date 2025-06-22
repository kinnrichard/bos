# Converting Server-Side Task Sorting to Client-Side: Claude Code Implementation Guide

## Overview

This guide converts the automatic status-based sorting logic from your Rails `Task` model to client-side JavaScript while maintaining your existing Stimulus controllers and dnd-kit drag-and-drop implementation. The server will continue to render initially sorted lists.

## Current State Analysis

Your current setup has:
- **Server-side**: Automatic reordering by status in `reorder_by_status` method (will remain for initial renders)
- **Client-side**: dnd-kit drag-and-drop with position updates via `handleTasksReorder`
- **Status Priority**: `in_progress` → `paused` → `new_task` → `successfully_completed` → `cancelled`

## Implementation Strategy

Add client-side sorting that mirrors server logic for immediate feedback while keeping server-side sorting for initial page loads and as backup validation.

## Step 1: Extract Server-Side Sorting Logic

First, let's understand what we're moving from the server:

```ruby
# Current server-side logic in task.rb (to be removed)
def reorder_by_status
  status_priority = {
    'in_progress' => 1,
    'paused' => 2,
    'new_task' => 3,
    'successfully_completed' => 4,
    'cancelled' => 5
  }
  
  siblings = Task.where(job_id: job_id, parent_id: parent_id)
                 .order(Arel.sql("CASE 
                   WHEN status = 0 THEN #{status_priority['new_task']}
                   WHEN status = 1 THEN #{status_priority['in_progress']}
                   WHEN status = 2 THEN #{status_priority['paused']}
                   WHEN status = 3 THEN #{status_priority['successfully_completed']}
                   WHEN status = 4 THEN #{status_priority['cancelled']}
                   END, position ASC"))
  
  siblings.each_with_index do |task, index|
    task.update_column(:position, index + 1) if task.position != index + 1
  end
end
```

## Step 2: Update job_controller.js

Add the client-side sorting logic to your existing job controller:

```javascript
// Add these methods to your job_controller.js

// Status priority mapping (same as server-side)
getStatusPriority() {
  return {
    'in_progress': 1,
    'paused': 2, 
    'new_task': 3,
    'successfully_completed': 4,
    'cancelled': 5
  }
}

// Enhanced updateTaskStatus method with client-side sorting
updateTaskStatus(event) {
  event.stopPropagation()
  const taskId = event.currentTarget.dataset.taskId
  const newStatus = event.currentTarget.dataset.status
  const taskElement = event.target.closest(".task-item") || event.target.closest(".subtask-item")
  const dropdown = taskElement.querySelector(".task-status-dropdown")
  
  // Store original position for rollback if needed
  const originalParent = taskElement.closest('.task-wrapper').parentElement
  const originalNextSibling = taskElement.closest('.task-wrapper').nextElementSibling
  
  // Optimistically update UI first
  this.updateTaskStatusUI(taskElement, newStatus)
  
  // Hide dropdown
  dropdown.classList.add("hidden")
  
  // Perform client-side sorting
  this.sortTaskByStatus(taskElement, newStatus)
  
  // Update server
  fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json", 
      "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
    },
    body: JSON.stringify({ 
      task: { 
        status: newStatus 
      } 
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      // Update with server response data if needed
      taskElement.dataset.taskStatus = data.task.status
      
      // Send position updates to server after successful status change
      this.updateAllPositionsForContainer(taskElement.closest('.tasks-list, .subtasks-container'))
    } else {
      // Rollback on server error
      console.error('Server error:', data.error)
      this.rollbackTaskPosition(taskElement, originalParent, originalNextSibling)
      this.updateTaskStatusUI(taskElement, taskElement.dataset.taskStatus) // Restore original status
      alert('Failed to update task status: ' + (data.error || 'Unknown error'))
    }
  })
  .catch(error => {
    console.error('Network error:', error)
    // Rollback on network error
    this.rollbackTaskPosition(taskElement, originalParent, originalNextSibling)
    this.updateTaskStatusUI(taskElement, taskElement.dataset.taskStatus)
    alert('Failed to update task status')
  })
}

// Update UI elements for status change
updateTaskStatusUI(taskElement, newStatus) {
  const statusEmojis = {
    'new_task': '⚫',
    'in_progress': '🟢',
    'paused': '⏸️',
    'successfully_completed': '☑️',
    'cancelled': '❌'
  }
  
  // Update data attribute
  taskElement.dataset.taskStatus = newStatus
  
  // Update completed class
  taskElement.classList.toggle("completed", newStatus === "successfully_completed")
  
  // Update status button emoji
  const statusButton = taskElement.querySelector(".task-status-button span, .subtask-status-button span")
  if (statusButton) {
    statusButton.textContent = statusEmojis[newStatus] || '⚫'
  }
  
  // Update active state in dropdown
  taskElement.querySelectorAll(".task-status-option").forEach(opt => {
    opt.classList.toggle("active", opt.dataset.status === newStatus)
  })
}

// Core client-side sorting logic
sortTaskByStatus(taskElement, newStatus) {
  const taskWrapper = taskElement.closest('.task-wrapper')
  const container = taskWrapper.parentElement
  
  // Don't sort if it's not a main tasks list or subtasks container
  if (!container.classList.contains('tasks-list') && !container.classList.contains('subtasks-container')) {
    return
  }
  
  // Get all task wrappers in the same container (excluding new task placeholder)
  const allTaskWrappers = Array.from(container.querySelectorAll('.task-wrapper:not(.new-task-wrapper)'))
  
  // Find where this task should be positioned based on status
  const targetPosition = this.findTargetPositionForStatus(allTaskWrappers, newStatus, taskWrapper)
  
  // Only move if position changes
  if (targetPosition.shouldMove) {
    this.animateTaskToPosition(taskWrapper, targetPosition.insertBefore, container)
  }
}

// Find where task should be positioned based on status priority
findTargetPositionForStatus(allTaskWrappers, targetStatus, excludeWrapper) {
  const statusPriority = this.getStatusPriority()
  const targetPriority = statusPriority[targetStatus] || 999
  
  // Filter out the task we're moving
  const otherWrappers = allTaskWrappers.filter(wrapper => wrapper !== excludeWrapper)
  
  // Find the insertion point
  for (let i = 0; i < otherWrappers.length; i++) {
    const wrapper = otherWrappers[i]
    const taskItem = wrapper.querySelector('.task-item, .subtask-item')
    const currentStatus = taskItem?.dataset.taskStatus || 'new_task'
    const currentPriority = statusPriority[currentStatus] || 999
    
    // If target priority is higher (lower number), insert before this task
    if (targetPriority < currentPriority) {
      return { shouldMove: true, insertBefore: wrapper }
    }
    
    // If same priority, maintain current relative order within that priority group
    if (targetPriority === currentPriority) {
      // Continue to find the end of this priority group
      continue
    }
  }
  
  // If we get here, task should go at the end of its priority group
  // Find the last task with same or higher priority
  let insertBefore = null
  for (let i = 0; i < otherWrappers.length; i++) {
    const wrapper = otherWrappers[i]
    const taskItem = wrapper.querySelector('.task-item, .subtask-item')
    const currentStatus = taskItem?.dataset.taskStatus || 'new_task'
    const currentPriority = statusPriority[currentStatus] || 999
    
    if (currentPriority > targetPriority) {
      insertBefore = wrapper
      break
    }
  }
  
  return { shouldMove: true, insertBefore }
}

// Animate task movement with smooth transition
animateTaskToPosition(taskWrapper, insertBefore, container) {
  // Get current position
  const currentRect = taskWrapper.getBoundingClientRect()
  
  // Temporarily move to calculate target position
  const tempPosition = taskWrapper.style.position
  const tempTop = taskWrapper.style.top
  const tempLeft = taskWrapper.style.left
  const tempZIndex = taskWrapper.style.zIndex
  
  // Move element to target position
  if (insertBefore) {
    container.insertBefore(taskWrapper, insertBefore)
  } else {
    container.appendChild(taskWrapper)
  }
  
  // Get new position
  const newRect = taskWrapper.getBoundingClientRect()
  
  // Calculate the distance moved
  const deltaY = currentRect.top - newRect.top
  const deltaX = currentRect.left - newRect.left
  
  // Apply reverse transform to start animation from original position
  taskWrapper.style.position = 'relative'
  taskWrapper.style.top = `${deltaY}px`
  taskWrapper.style.left = `${deltaX}px`
  taskWrapper.style.zIndex = '1000'
  taskWrapper.style.transition = 'none'
  
  // Force layout
  taskWrapper.offsetHeight
  
  // Animate to final position
  taskWrapper.style.transition = 'top 0.3s ease-out, left 0.3s ease-out'
  taskWrapper.style.top = '0px'
  taskWrapper.style.left = '0px'
  
  // Clean up after animation
  setTimeout(() => {
    taskWrapper.style.position = tempPosition
    taskWrapper.style.top = tempTop
    taskWrapper.style.left = tempLeft
    taskWrapper.style.zIndex = tempZIndex
    taskWrapper.style.transition = ''
  }, 300)
}

// Rollback position on error
rollbackTaskPosition(taskElement, originalParent, originalNextSibling) {
  const taskWrapper = taskElement.closest('.task-wrapper')
  
  if (originalNextSibling && originalNextSibling.parentElement === originalParent) {
    originalParent.insertBefore(taskWrapper, originalNextSibling)
  } else {
    originalParent.appendChild(taskWrapper)
  }
}

// Update positions for all tasks in a container
updateAllPositionsForContainer(container) {
  if (!container) return
  
  const taskWrappers = Array.from(container.querySelectorAll('.task-wrapper:not(.new-task-wrapper)'))
  const positions = taskWrappers.map((wrapper, index) => {
    const taskItem = wrapper.querySelector('.task-item, .subtask-item')
    return {
      id: taskItem?.dataset.taskId,
      position: index + 1
    }
  }).filter(p => p.id)
  
  if (positions.length === 0) return
  
  // Determine if this is for subtasks or main tasks
  const isSubtaskContainer = container.classList.contains('subtasks-container')
  
  if (isSubtaskContainer) {
    // Find parent task for subtasks
    const parentTaskWrapper = container.closest('.task-wrapper')
    const parentTask = parentTaskWrapper?.querySelector('.task-item, .subtask-item')
    const parentTaskId = parentTask?.dataset.taskId
    
    if (parentTaskId) {
      this.updateSubtaskPositions(parentTaskId, positions)
    }
  } else {
    // Main tasks
    this.updateMainTaskPositions(positions)
  }
}

// Update main task positions on server
updateMainTaskPositions(positions) {
  fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/reorder`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
    },
    body: JSON.stringify({ positions: positions })
  })
  .catch(error => {
    console.error('Error updating task positions:', error)
  })
}

// Update subtask positions on server  
updateSubtaskPositions(parentTaskId, positions) {
  fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/${parentTaskId}/subtasks/reorder`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
    },
    body: JSON.stringify({ positions: positions })
  })
  .catch(error => {
    console.error('Error updating subtask positions:', error)
  })
}

// Enhanced updateSelectedTasksStatus for batch operations
updateSelectedTasksStatus(newStatus) {
  const tasksToUpdate = Array.from(this.selectedTasks)
  const updates = []
  
  // Store original positions for rollback
  const originalPositions = tasksToUpdate.map(taskElement => ({
    element: taskElement,
    parent: taskElement.closest('.task-wrapper').parentElement,
    nextSibling: taskElement.closest('.task-wrapper').nextElementSibling
  }))
  
  // Update all tasks optimistically
  tasksToUpdate.forEach(taskElement => {
    this.updateTaskStatusUI(taskElement, newStatus)
    this.sortTaskByStatus(taskElement, newStatus)
    
    const taskId = taskElement.dataset.taskId
    updates.push({ id: taskId, status: newStatus })
  })
  
  // Send batch update to server
  fetch(`/clients/${this.clientIdValue}/jobs/${this.jobIdValue}/tasks/batch_update`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
    },
    body: JSON.stringify({ tasks: updates })
  })
  .then(response => response.json())
  .then(data => {
    if (data.status === 'success') {
      // Update positions for all affected containers
      const containers = new Set()
      tasksToUpdate.forEach(taskElement => {
        const container = taskElement.closest('.tasks-list, .subtasks-container')
        if (container) containers.add(container)
      })
      
      containers.forEach(container => {
        this.updateAllPositionsForContainer(container)
      })
    } else {
      // Rollback all changes
      originalPositions.forEach(({ element, parent, nextSibling }) => {
        this.rollbackTaskPosition(element, parent, nextSibling)
        this.updateTaskStatusUI(element, element.dataset.taskStatus)
      })
      alert('Failed to update task statuses: ' + (data.error || 'Unknown error'))
    }
  })
  .catch(error => {
    console.error('Error updating task statuses:', error)
    // Rollback all changes
    originalPositions.forEach(({ element, parent, nextSibling }) => {
      this.rollbackTaskPosition(element, parent, nextSibling)
      this.updateTaskStatusUI(element, element.dataset.taskStatus)
    })
    alert('Failed to update task statuses')
  })
}
```

## Step 3: Update sortable_controller.js

Enhance your existing drag-and-drop to respect status-based sorting:

```javascript
// Add to your sortable_controller.js

// Override the existing handleDrop method to integrate with status-based sorting
handleDrop(event) {
  event.preventDefault()
  event.stopPropagation()
  
  if (!this.draggedElement || !this.currentDropTarget) return
  
  const draggedWrapper = this.draggedElement.closest('.task-wrapper')
  const draggedTask = this.draggedElement
  const draggedId = draggedTask?.dataset.taskId
  
  if (this.currentDropMode === 'subtask' && draggedId) {
    // Create subtask (existing logic)
    const parentId = this.currentDropTarget.dataset.taskId
    if (parentId && parentId !== draggedId) {
      this.makeSubtask(draggedId, parentId, draggedWrapper)
    }
  } else if (this.currentDropMode === 'reorder') {
    // Handle reorder with status-based constraints
    setTimeout(() => {
      this.handleReorderWithStatusConstraints(draggedWrapper, this.currentDropTarget)
    }, 10)
  }
  
  this.clearHighlights()
  this.hideDropIndicator()
}

// New method to handle reordering with status-based constraints
handleReorderWithStatusConstraints(draggedWrapper, targetTaskItem) {
  if (!draggedWrapper || !targetTaskItem || !this.dropPosition) return
  
  const targetWrapper = targetTaskItem.closest('.task-wrapper')
  if (!targetWrapper || targetWrapper === draggedWrapper) return
  
  const draggedTask = draggedWrapper.querySelector('.task-item, .subtask-item')
  const draggedStatus = draggedTask?.dataset.taskStatus || 'new_task'
  
  // Get job controller to access status priority logic
  const jobController = this.getJobController()
  if (!jobController) {
    // Fallback to original behavior if job controller not available
    this.handleReorder(draggedWrapper, targetTaskItem)
    return
  }
  
  const statusPriority = jobController.getStatusPriority()
  const draggedPriority = statusPriority[draggedStatus] || 999
  
  // Check if target position violates status-based ordering
  const container = targetWrapper.parentElement
  const allWrappers = Array.from(container.querySelectorAll('.task-wrapper:not(.new-task-wrapper)'))
  
  // Find where the task should actually be placed based on status
  const targetPosition = jobController.findTargetPositionForStatus(allWrappers, draggedStatus, draggedWrapper)
  
  if (targetPosition.shouldMove) {
    // Position based on status priority, not exact drop position
    this.performStatusAwareReorderMove(draggedWrapper, targetPosition.insertBefore, container)
  } else {
    // Task is already in correct status section, allow normal reordering
    this.performReorderMove(draggedWrapper, targetWrapper, container)
  }
}

// Get reference to job controller
getJobController() {
  const jobElement = document.querySelector('[data-controller*="job"]')
  if (jobElement && jobElement._jobController) {
    return jobElement._jobController
  }
  
  // Alternative: use Stimulus application to find controller
  try {
    const application = this.application
    return application.getControllerForElementAndIdentifier(jobElement, 'job')
  } catch (e) {
    console.warn('Could not find job controller')
    return null
  }
}

// Perform reorder move respecting status constraints
performStatusAwareReorderMove(draggedWrapper, insertBefore, container) {
  // Check if we need to update task classes for parent level changes
  const isMovingToRootLevel = container.classList.contains('tasks-list')
  const isMovingToSubtaskLevel = container.classList.contains('subtasks-container')
  
  // Update task classes if moving between levels
  if (isMovingToRootLevel) {
    this.convertToRootTask(draggedWrapper)
  } else if (isMovingToSubtaskLevel) {
    // Convert to subtask classes when moving into a subtask container
    const draggedTask = draggedWrapper.querySelector('.task-item, .subtask-item')
    if (draggedTask) {
      const parentTaskWrapper = container.closest('.task-wrapper')
      const parentTask = parentTaskWrapper?.querySelector('.task-item, .subtask-item')
      const parentId = parentTask?.dataset.taskId
      
      if (parentId) {
        this.convertToSubtask(draggedWrapper, parentId)
      }
    }
  }
  
  // Remove from original position
  if (draggedWrapper.parentElement) {
    draggedWrapper.parentElement.removeChild(draggedWrapper)
  }
  
  // Insert at status-appropriate position
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
  
  // Dispatch reorder event to update server
  const reorderEvent = new CustomEvent('tasks:reorder', {
    detail: { positions },
    bubbles: true
  })
  this.element.dispatchEvent(reorderEvent)
  
  // Update subtask counts if needed
  this.updateAllSubtaskCounts()
  
  // Refresh drag handlers
  this.refresh()
}

// Helper method to convert task to subtask
convertToSubtask(taskWrapper, parentId) {
  const taskItem = taskWrapper.querySelector('.task-item, .subtask-item')
  if (taskItem) {
    taskItem.classList.remove('task-item')
    taskItem.classList.add('subtask-item')
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
}
```

## Step 4: Rails Controller Updates

Since you're using dnd-kit for drag-and-drop (not manual selection), the existing single-task update approach should handle most cases. However, enhance error handling and validation:

```ruby
# In app/controllers/tasks_controller.rb

class TasksController < ApplicationController
  # ... existing methods ...

  # Enhanced update method with position recalculation
  def update
    if task_params[:status] && @task.status != task_params[:status]
      # Status is changing - let client handle immediate sorting, 
      # but validate/correct on server if needed
      
      @task.update!(task_params)
      
      # Return the updated task with any server-side corrections
      render json: { 
        status: 'success', 
        task: @task,
        # Include any position corrections if server disagrees with client
        suggested_position: calculate_position_for_status(@task)
      }
    else
      # Regular update (title, etc.)
      @task.update!(task_params)
      render json: { status: 'success', task: @task }
    end
  rescue ActiveRecord::RecordInvalid => e
    render json: { 
      status: 'error', 
      error: e.record.errors.full_messages.join(', ') 
    }, status: 422
  end

  # Enhanced reorder endpoint that respects status-based sorting
  def reorder
    positions = params[:positions] || []
    
    # Validate that positions respect status ordering
    if positions_violate_status_order?(positions)
      render json: { 
        status: 'error', 
        error: 'Position conflicts with status-based ordering',
        suggested_positions: recalculate_positions_for_status_order(positions)
      }, status: 422
      return
    end
    
    Task.transaction do
      positions.each do |position_data|
        task = current_user.tasks.find(position_data[:id])
        task.update_column(:position, position_data[:position])
      end
    end
    
    render json: { status: 'success' }
  rescue ActiveRecord::RecordNotFound => e
    render json: { status: 'error', error: 'Task not found' }, status: 404
  end

  private

  def task_params
    params.require(:task).permit(:title, :status, :parent_id, :position)
  end
  
  def calculate_position_for_status(task)
    # Mirror the client-side status priority logic
    status_priority = {
      'in_progress' => 1,
      'paused' => 2,
      'new_task' => 3,
      'successfully_completed' => 4,
      'cancelled' => 5
    }
    
    siblings = Task.where(job_id: task.job_id, parent_id: task.parent_id)
                   .where.not(id: task.id)
                   .order(:position)
    
    target_priority = status_priority[task.status] || 999
    
    # Find insertion point based on status priority
    siblings.each_with_index do |sibling, index|
      sibling_priority = status_priority[sibling.status] || 999
      if target_priority < sibling_priority
        return index + 1
      end
    end
    
    siblings.count + 1
  end
  
  def positions_violate_status_order?(positions)
    # Check if the provided positions maintain status-based ordering
    # Implementation would validate against status priority rules
    false # Simplified for now
  end
  
  def recalculate_positions_for_status_order(positions)
    # Return corrected positions that respect status ordering
    positions # Simplified for now
  end
end
```

## Step 5: Keep Server-Side Sorting for Initial Renders

**Keep the existing server-side sorting logic in your Task model** - it's needed for initial page loads and as validation backup:

```ruby
# In app/models/task.rb

class Task < ApplicationRecord
  # ... existing code ...
  
  # KEEP the after_update callback for server-side consistency
  after_update :reorder_by_status, if: :saved_change_to_status?
  
  # KEEP the reorder_by_status method - it ensures server-side consistency
  def reorder_by_status
    # ... existing method content stays the same ...
  end
  
  # Add method to disable automatic sorting for client-driven updates
  def update_without_reordering(attributes)
    # Temporarily disable the callback
    self.class.skip_callback(:update, :after, :reorder_by_status)
    result = update(attributes)
    self.class.set_callback(:update, :after, :reorder_by_status, if: :saved_change_to_status?)
    result
  end
  
  # ... rest of existing code ...
end
```

The server-side sorting ensures:
- Initial page loads show correctly sorted tasks
- Background jobs or direct database updates maintain consistency
- Fallback behavior if client-side sorting fails

## Step 6: Analyze and Enhance Existing CSS Animations

Review your current animation implementation and identify potential improvements:

### Current Animation Analysis

**Examine these existing elements in your CSS:**

1. **Drag feedback animations** - Look for transitions on `.dragging`, `.drop-target` classes
2. **Task state transitions** - Check for animations on status changes (completed states, etc.)
3. **Drop indicator animations** - Review the `.drop-indicator` styling and transitions
4. **Task movement animations** - Look for existing transform/position transitions

### Potential Enhancements to Consider

```css
/* Enhance existing status-based visual grouping */
.task-item[data-task-status="in_progress"] {
  /* Check if you already have status-based styling */
  border-left: 3px solid #10B981; /* Only add if not present */
}

.task-item[data-task-status="paused"] {
  border-left: 3px solid #F59E0B;
}

/* Smooth transitions for status-based reordering */
.task-wrapper {
  /* Add transition if not already present */
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-wrapper.status-sorting {
  /* Temporary class during status-based sorting */
  z-index: 100;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Enhance existing drop indicator if needed */
.drop-indicator {
  /* Check if your existing implementation could benefit from: */
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
  animation: pulse 1s infinite; /* If you want subtle pulsing */
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### Animation Performance Analysis

**Review these aspects of your current animations:**

1. **GPU acceleration** - Are transforms used instead of changing layout properties?
2. **Animation duration** - Are they fast enough to feel responsive (<300ms for sorting)?
3. **Easing functions** - Do they feel natural (cubic-bezier vs linear)?
4. **Layer creation** - Are `will-change` or `transform3d` used appropriately?

### Recommendations

- **Keep existing animations** that work well
- **Only add new CSS** for status-based sorting feedback
- **Test performance** with 500 tasks to ensure smooth animations
- **Consider reducing animation complexity** if performance issues arise

## Step 7: Testing the Implementation

### Manual Testing Checklist

1. **Status Change Sorting**:
   - [ ] Change a task from "New" to "In Progress" - should move to top
   - [ ] Change a task from "In Progress" to "Completed" - should move to bottom
   - [ ] Change multiple tasks at once - should all resort correctly

2. **Drag and Drop with Status Constraints**:
   - [ ] Drag a "New" task above "In Progress" tasks - should snap to correct position
   - [ ] Drag within same status group - should maintain manual order
   - [ ] Drag between different containers (task to subtask) - should respect status

3. **Error Handling**:
   - [ ] Disconnect network and change status - should rollback position
   - [ ] Server returns error - should restore original state

4. **Performance**:
   - [ ] Large lists (100+ tasks) sort smoothly
   - [ ] No visual glitches during animations

### Debug Mode

Add debug logging to track sorting behavior:

```javascript
// Add to job_controller.js for debugging
sortTaskByStatus(taskElement, newStatus) {
  if (window.DEBUG_SORTING) {
    console.log('Sorting task:', {
      taskId: taskElement.dataset.taskId,
      oldStatus: taskElement.dataset.taskStatus,
      newStatus: newStatus,
      container: taskElement.closest('.task-wrapper').parentElement.className
    })
  }
  
  // ... rest of method ...
}

// Enable debug mode in browser console:
// window.DEBUG_SORTING = true
```