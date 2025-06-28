// Module for managing task timers
export class JobTimerManager {
  constructor(controller) {
    this.controller = controller
    this.timerInterval = null
    this.taskTimers = new Map()
  }

  startTimers() {
    if (this.timerInterval) return
    
    // Update timers every second
    this.timerInterval = setInterval(() => {
      this.updateAllTimers()
    }, 1000)
    
    // Initial update
    this.updateAllTimers()
  }

  stopTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    this.taskTimers.clear()
  }

  updateAllTimers() {
    const timerElements = this.controller.element.querySelectorAll('[data-job-target="taskTimer"]')
    
    timerElements.forEach(timerElement => {
      const taskItem = timerElement.closest('.task-item')
      if (!taskItem) return
      
      const taskId = taskItem.dataset.taskId
      const status = taskItem.dataset.taskStatus
      
      // Only update timer if task is in progress
      if (status === 'in_progress') {
        const currentTime = this.getOrCreateTimer(taskId)
        timerElement.textContent = this.formatTime(currentTime)
      }
    })
  }

  getOrCreateTimer(taskId) {
    if (!this.taskTimers.has(taskId)) {
      // Initialize timer - in a real app, this would fetch from server
      this.taskTimers.set(taskId, 0)
    }
    
    const currentTime = this.taskTimers.get(taskId)
    this.taskTimers.set(taskId, currentTime + 1)
    
    return currentTime
  }

  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    const parts = []
    
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`)
    }
    
    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}s`)
    }
    
    return parts.join(' ')
  }

  resetTimer(taskId) {
    this.taskTimers.delete(taskId)
  }

  pauseTimer(taskId) {
    // In a real app, this would save the current time to the server
    const currentTime = this.taskTimers.get(taskId)
    if (currentTime) {
      console.log(`Pausing timer for task ${taskId} at ${this.formatTime(currentTime)}`)
    }
  }

  resumeTimer(taskId, previousTime = 0) {
    this.taskTimers.set(taskId, previousTime)
  }
}