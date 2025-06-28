// Module for handling task management operations (create, update, delete)
export class JobTaskManager {
  constructor(controller) {
    this.controller = controller
  }

  // Task creation methods
  showNewTaskInput() {
    const selectedTask = this.controller.element.querySelector('.task-item.selected')
    const parentTasksList = selectedTask ? selectedTask.closest('.tasks-list, .subtasks') : this.controller.tasksListTarget
    
    // Check if there's already a new task input
    if (parentTasksList.querySelector('.new-task-input')) {
      return
    }
    
    const SafeDOM = window.Bos?.SafeDOM
    if (!SafeDOM) {
      console.error('SafeDOM module not available')
      return
    }
    
    const taskStatusEmoji = window.Bos?.Icons?.taskStatusEmoji || (() => '📝')
    
    // Create new task wrapper
    const newTaskWrapper = SafeDOM.element('div', { className: 'task-wrapper new-task-wrapper' }, [
      SafeDOM.element('div', { className: 'task-item new-task' }, [
        SafeDOM.element('div', { className: 'task-status-container' }, [
          SafeDOM.element('button', { className: 'task-status-button', disabled: true }, [
            SafeDOM.element('span', {}, [taskStatusEmoji('new_task')])
          ])
        ]),
        SafeDOM.element('div', { className: 'task-content' }, [
          SafeDOM.element('input', {
            type: 'text',
            className: 'new-task-input task-title',
            placeholder: 'Enter task title...',
            'data-action': 'keydown->job#handleNewTaskKeydown blur->job#handleNewTaskBlur',
            'data-job-target': 'newTaskInput',
            autofocus: true
          })
        ])
      ]),
      SafeDOM.element('div', { className: 'subtasks subtasks-container hidden' })
    ])
    
    // Insert the new task wrapper
    if (selectedTask) {
      // Insert after the selected task's wrapper
      const selectedWrapper = selectedTask.closest('.task-wrapper')
      if (selectedWrapper && !selectedWrapper.classList.contains('new-task-wrapper')) {
        SafeDOM.insertAfter(selectedWrapper, newTaskWrapper)
      }
    } else {
      // Insert at the beginning of the list
      parentTasksList.insertBefore(newTaskWrapper, parentTasksList.firstChild)
    }
    
    // Focus the input
    requestAnimationFrame(() => {
      const input = newTaskWrapper.querySelector('.new-task-input')
      if (input) {
        input.focus()
      }
    })
  }

  async createNewTask(title, parentTaskId = null) {
    const taskCreationQueue = window.Bos?.taskCreationQueue
    if (!taskCreationQueue) {
      console.error('TaskCreationQueue not available')
      return null
    }

    const jobId = this.controller.jobIdValue
    const clientId = this.controller.clientIdValue
    
    const taskData = {
      title: title.trim(),
      status: 'new_task',
      parent_id: parentTaskId
    }
    
    const result = await taskCreationQueue.add(clientId, jobId, taskData)
    
    if (result.status === 'duplicate') {
      console.log('Task creation was duplicate, ignored')
      return result
    }
    
    if (result.status === 'success') {
      console.log('Task created successfully:', result.data)
      
      // Ensure the parent is expanded if this is a subtask
      if (parentTaskId) {
        const parentTask = this.controller.element.querySelector(`.task-item[data-task-id="${parentTaskId}"]`)
        if (parentTask && parentTask.classList.contains('has-subtasks')) {
          parentTask.classList.remove('collapsed')
          const subtasksContainer = parentTask.nextElementSibling
          if (subtasksContainer?.classList.contains('subtasks')) {
            subtasksContainer.classList.remove('hidden')
          }
        }
      }
      
      // Remove the new task placeholder
      const newTaskPlaceholder = this.controller.tasksListTarget.querySelector('.new-task-wrapper')
      if (newTaskPlaceholder) {
        newTaskPlaceholder.remove()
      }
    }
    
    return result
  }

  async updateTaskTitle(taskElement, taskId, newTitle) {
    const ApiClient = window.Bos?.ApiClient
    if (!ApiClient) {
      console.error('ApiClient not available')
      return
    }

    const clientId = this.controller.clientIdValue
    const jobId = this.controller.jobIdValue
    
    try {
      const response = await fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: ApiClient.headers(),
        body: JSON.stringify({
          task: { title: newTitle }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating task title:', error)
      throw error
    }
  }

  async deleteTask(taskId) {
    const ApiClient = window.Bos?.ApiClient
    if (!ApiClient) {
      console.error('ApiClient not available')
      return
    }

    const clientId = this.controller.clientIdValue
    const jobId = this.controller.jobIdValue
    
    try {
      const response = await fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: ApiClient.headers()
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`)
      }
      
      return true
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  async deleteSelectedTasks() {
    const selectedTasks = this.controller.element.querySelectorAll('.task-item.selected')
    if (selectedTasks.length === 0) return
    
    const taskIds = Array.from(selectedTasks).map(task => task.dataset.taskId)
    
    // Show confirmation dialog
    const taskWord = taskIds.length === 1 ? 'task' : 'tasks'
    if (!confirm(`Are you sure you want to delete ${taskIds.length} ${taskWord}?`)) {
      return
    }
    
    // Delete tasks in parallel
    const deletePromises = taskIds.map(taskId => this.deleteTask(taskId))
    
    try {
      await Promise.all(deletePromises)
      // Clear selection after successful deletion
      this.controller.clearSelection()
    } catch (error) {
      console.error('Error deleting tasks:', error)
      alert('Failed to delete some tasks. Please try again.')
    }
  }

  async updateTaskStatus(taskId, newStatus, taskElement) {
    const ApiClient = window.Bos?.ApiClient
    const optimisticUI = window.Bos?.optimisticUI
    
    if (!ApiClient) {
      console.error('ApiClient not available')
      return
    }

    const clientId = this.controller.clientIdValue
    const jobId = this.controller.jobIdValue
    
    // If we have optimistic UI and a task element, use it
    if (optimisticUI && taskElement) {
      return await optimisticUI.updateWithRollback(
        taskElement,
        {
          'data-task-status': newStatus,
          className: taskElement.className.replace(/status-\w+/, `status-${newStatus}`)
        },
        async () => {
          const response = await fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: ApiClient.headers(),
            body: JSON.stringify({
              task: { status: newStatus }
            })
          })
          
          if (!response.ok) {
            throw new Error(`Failed to update task status: ${response.statusText}`)
          }
          
          return await response.json()
        }
      )
    }
    
    // Fallback to regular update without optimistic UI
    try {
      const response = await fetch(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: ApiClient.headers(),
        body: JSON.stringify({
          task: { status: newStatus }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update task status: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error updating task status:', error)
      throw error
    }
  }
}