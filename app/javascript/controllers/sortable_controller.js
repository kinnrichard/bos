import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = ["list"]
  
  connect() {
    this.initializeSortable()
  }
  
  initializeSortable() {
    // Find the tasks list element
    const tasksList = this.element.querySelector('.tasks-list');
    if (!tasksList) {
      console.warn('No .tasks-list element found');
      return;
    }
    
    // Initialize Sortable on the tasks list
    this.sortable = Sortable.create(tasksList, {
      // Animation
      animation: 150,
      
      // Handle configuration
      draggable: '.task-wrapper',
      handle: '.task-item', // Use task-item as the drag handle
      filter: '.task-title', // Prevent dragging from task title
      preventOnFilter: false, // Allow clicks on filtered elements
      
      // Events
      onStart: (evt) => {
        // Clear text selection when starting drag
        window.getSelection().removeAllRanges()
        
        // Add dragging class
        evt.item.classList.add('dragging')
      },
      
      onEnd: (evt) => {
        // Remove dragging class
        evt.item.classList.remove('dragging')
        
        // Handle reordering
        const taskItem = evt.item.querySelector('.task-item')
        const taskId = taskItem ? taskItem.dataset.taskId : evt.item.dataset.taskId
        const oldIndex = evt.oldIndex
        const newIndex = evt.newIndex
        
        if (oldIndex !== newIndex) {
          // Dispatch custom event for reordering
          const reorderEvent = new CustomEvent('task:reorder', {
            detail: {
              taskId: taskId,
              oldIndex: oldIndex,
              newIndex: newIndex
            },
            bubbles: true
          })
          this.element.dispatchEvent(reorderEvent)
        }
      }
    })
    
    // Initialize sortable for subtasks if they exist
    this.initializeSubtaskSortables()
  }
  
  initializeSubtaskSortables() {
    // Find all subtask containers
    const subtaskContainers = this.element.querySelectorAll('.subtasks-container')
    
    subtaskContainers.forEach(container => {
      Sortable.create(container, {
        group: 'subtasks',
        animation: 150,
        draggable: '.subtask-item',
        filter: '.task-title', // Prevent dragging from text content
        preventOnFilter: false,
        
        onEnd: (evt) => {
          const subtaskId = evt.item.dataset.taskId
          const parentTaskId = container.closest('.task-item').dataset.taskId
          const oldIndex = evt.oldIndex
          const newIndex = evt.newIndex
          
          if (oldIndex !== newIndex) {
            // Dispatch custom event for subtask reordering
            const reorderEvent = new CustomEvent('subtask:reorder', {
              detail: {
                subtaskId: subtaskId,
                parentTaskId: parentTaskId,
                oldIndex: oldIndex,
                newIndex: newIndex
              },
              bubbles: true
            })
            this.element.dispatchEvent(reorderEvent)
          }
        }
      })
    })
  }
  
  // Method to refresh sortables after DOM changes
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
  }
}