import BasePopoverController from "controllers/base_popover_controller"

// Connects to data-controller="user-menu-popover"
export default class extends BasePopoverController {
  static targets = ["content"]
  // Inherit values from base controller
  
  childConnect() {
    console.log('User menu popover controller connected')
  }
  
  // Override for right-aligned positioning
  calculateHorizontalPosition(triggerRect, popoverRect, viewportWidth) {
    // Right-aligned by default for user menu
    let left = triggerRect.right - popoverRect.width
    
    // Check if popover would go off the right edge
    if (left + popoverRect.width > viewportWidth - 10) {
      left = viewportWidth - popoverRect.width - 10
    }
    
    // Check if popover would go off the left edge
    if (left < 10) {
      left = 10
    }
    
    return left
  }
  
}