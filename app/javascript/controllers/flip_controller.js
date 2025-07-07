import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "item"]
  static values = {
    duration: { type: Number, default: 300 },
    stagger: { type: Number, default: 30 },
    easing: { type: String, default: "cubic-bezier(0.4, 0, 0.2, 1)" }
  }
  
  // Track positions for FLIP animation
  positions = new Map()
  animationFrame = null
  pendingAnimations = []
  
  connect() {
    this.captureInitialPositions()
    
    // Listen for custom events from native drag controller
    this.element.addEventListener('flip:capture', this.handleFlipCapture.bind(this))
    this.element.addEventListener('flip:animate', this.handleFlipAnimate.bind(this))
    
    // Listen for Turbo Stream updates
    document.addEventListener('turbo:before-stream-render', this.handleTurboBeforeRender.bind(this))
    document.addEventListener('turbo:after-stream-render', this.handleTurboAfterRender.bind(this))
    
    // Observe DOM changes for non-Turbo updates
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations)
    })
    
    this.observer.observe(this.containerTarget, {
      childList: true,
      subtree: true,
      attributes: false // Don't observe attributes to reduce overhead
    })
  }
  
  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    
    document.removeEventListener('turbo:before-stream-render', this.handleTurboBeforeRender.bind(this))
    document.removeEventListener('turbo:after-stream-render', this.handleTurboAfterRender.bind(this))
  }
  
  captureInitialPositions() {
    this.itemTargets.forEach(item => {
      const rect = item.getBoundingClientRect()
      this.positions.set(this.getItemId(item), {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      })
    })
  }
  
  handleMutations(mutations) {
    // Debounce mutations to avoid multiple animations
    if (this.mutationTimeout) {
      clearTimeout(this.mutationTimeout)
    }
    
    this.mutationTimeout = setTimeout(() => {
      // Check if this is a new task addition (not a reorder)
      const hasNewTask = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          // Check if any added nodes are new tasks
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for the new task flag or if it's a task wrapper with a new task
              const isNewTask = node.querySelector?.('[data-new-task="true"]') || 
                               node.dataset?.newTask === 'true'
              
              // Also check if it's a task not in our position map
              const taskItem = node.querySelector?.('.task-item') || 
                              (node.classList?.contains('task-item') ? node : null)
              if (taskItem) {
                const id = this.getItemId(taskItem)
                // If this ID isn't in our positions map, it's a new task
                return isNewTask || !this.positions.has(id)
              }
              
              return isNewTask
            }
            return false
          })
        }
        return false
      })
      
      // Only animate if it's a reorder (not a new task addition)
      if (!hasNewTask && !this.isAnimating) {
        const isReorder = mutations.some(mutation => 
          mutation.type === 'childList' && 
          (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
        )
        
        if (isReorder) {
          this.animateReorder()
        }
      } else if (hasNewTask) {
        // For new tasks, just capture positions without animating
        setTimeout(() => {
          this.captureInitialPositions()
        }, 100)
      }
    }, 50)
  }
  
  animateReorder() {
    if (this.isAnimating) return
    this.isAnimating = true
    
    // First: capture current positions
    const first = new Map()
    this.itemTargets.forEach(item => {
      const rect = item.getBoundingClientRect()
      first.set(this.getItemId(item), {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        element: item
      })
    })
    
    // Last: get previous positions
    const last = this.positions
    
    // Invert: calculate the delta
    const animations = []
    first.forEach((firstPos, id) => {
      const lastPos = last.get(id)
      if (lastPos) {
        const deltaX = lastPos.x - firstPos.x
        const deltaY = lastPos.y - firstPos.y
        
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          animations.push({
            element: firstPos.element,
            deltaX,
            deltaY
          })
        }
      }
    })
    
    // Play: animate to final positions
    this.playAnimations(animations)
    
    // Update stored positions for next animation
    setTimeout(() => {
      this.captureInitialPositions()
      this.isAnimating = false
    }, this.durationValue + 100)
  }
  
  playAnimations(animations) {
    if (animations.length === 0) {
      this.isAnimating = false
      return
    }
    
    // Mark container as animating
    this.containerTarget.dataset.flipActive = 'true'
    
    animations.forEach((animation, index) => {
      const { element, deltaX, deltaY } = animation
      
      // Add animating flag
      element.dataset.flipAnimating = 'true'
      
      // Set initial transform
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      element.style.transition = 'none'
      
      // Force reflow
      void element.offsetHeight
      
      // Animate with stagger
      this.animationFrame = requestAnimationFrame(() => {
        setTimeout(() => {
          element.style.transform = ''
          element.style.transition = `transform ${this.durationValue}ms ${this.easingValue}`
          
          // Clean up after animation
          setTimeout(() => {
            element.style.transition = ''
            element.dataset.flipAnimating = 'false'
            
            // Clean up container flag after last animation
            if (index === animations.length - 1) {
              this.containerTarget.dataset.flipActive = 'false'
            }
          }, this.durationValue)
        }, index * this.staggerValue)
      })
    })
  }
  
  // Manual trigger for programmatic reorders
  animate() {
    this.animateReorder()
  }
  
  getItemId(element) {
    return element.dataset.taskId || element.dataset.flipItem || element.id
  }
  
  // Event handlers for custom events
  handleFlipCapture(event) {
    this.captureInitialPositions()
  }
  
  handleFlipAnimate(event) {
    this.animateReorder()
  }
  
  // Turbo Stream handlers
  handleTurboBeforeRender(event) {
    // Capture positions before Turbo updates the DOM
    this.captureInitialPositions()
  }
  
  handleTurboAfterRender(event) {
    // Animate after Turbo updates the DOM
    requestAnimationFrame(() => {
      this.animateReorder()
    })
  }
  
  // Batch animation for multiple items
  animateBatch(items) {
    const animations = []
    const first = new Map()
    
    // Capture current positions
    items.forEach(item => {
      const rect = item.getBoundingClientRect()
      const id = this.getItemId(item)
      first.set(id, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        element: item
      })
    })
    
    // Calculate deltas
    first.forEach((firstPos, id) => {
      const lastPos = this.positions.get(id)
      if (lastPos) {
        const deltaX = lastPos.x - firstPos.x
        const deltaY = lastPos.y - firstPos.y
        
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          animations.push({
            element: firstPos.element,
            deltaX,
            deltaY
          })
        }
      }
    })
    
    // Play animations
    this.playAnimations(animations)
  }
}