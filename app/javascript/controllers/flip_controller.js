import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "item"]
  
  connect() {
    // Store positions before any Turbo Stream updates
    this.capturePositions()
    
    // Listen for Turbo Stream updates
    this.beforeStreamRenderHandler = this.beforeStreamRender.bind(this)
    this.animateChangesHandler = this.animateChanges.bind(this)
    
    document.addEventListener('turbo:before-stream-render', this.beforeStreamRenderHandler)
    document.addEventListener('turbo:render', this.animateChangesHandler)
    // Also listen for after stream render
    document.addEventListener('turbo:after-stream-render', this.animateChangesHandler)
  }
  
  disconnect() {
    document.removeEventListener('turbo:before-stream-render', this.beforeStreamRenderHandler)
    document.removeEventListener('turbo:render', this.animateChangesHandler)
    document.removeEventListener('turbo:after-stream-render', this.animateChangesHandler)
  }
  
  beforeStreamRender(event) {
    // Capture current positions right before the DOM update
    this.capturePositions()
  }
  
  capturePositions() {
    this.positions = new Map()
    
    const items = this.element.querySelectorAll('[data-flip-item]')
    items.forEach(item => {
      const taskId = item.dataset.taskId
      if (taskId) {
        const rect = item.getBoundingClientRect()
        this.positions.set(taskId, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        })
      }
    })
  }
  
  animateChanges() {
    if (!this.positions || this.positions.size === 0) return
    
    // Small delay to ensure DOM is fully updated
    requestAnimationFrame(() => {
      const items = this.element.querySelectorAll('[data-flip-item]')
      const animations = []
    
    items.forEach(item => {
      const taskId = item.dataset.taskId
      if (!taskId) return
      
      const oldPos = this.positions.get(taskId)
      if (!oldPos) return // New item, no animation needed
      
      const newRect = item.getBoundingClientRect()
      const deltaX = oldPos.left - newRect.left
      const deltaY = oldPos.top - newRect.top
      
      // Skip if no movement
      if (deltaX === 0 && deltaY === 0) return
      
      // Apply inverse transform to start from old position
      item.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      item.style.transition = 'none'
      
      // Force reflow
      item.offsetHeight
      
      // Animate to new position
      item.style.transition = 'transform 300ms ease-out'
      item.style.transform = 'translate(0, 0)'
      
      // Store animation promise
      animations.push(
        new Promise(resolve => {
          const handleTransitionEnd = () => {
            item.style.transition = ''
            item.style.transform = ''
            item.removeEventListener('transitionend', handleTransitionEnd)
            resolve()
          }
          item.addEventListener('transitionend', handleTransitionEnd)
          
          // Fallback in case transition doesn't fire
          setTimeout(handleTransitionEnd, 350)
        })
      )
    })
    
      // Clear positions after all animations complete
      Promise.all(animations).then(() => {
        this.positions.clear()
      })
    })
  }
}