import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static outlets = ["user-menu-popover"]
  
  async reportBug(event) {
    event.preventDefault()
    
    // Close the user menu dropdown
    if (this.hasUserMenuPopoverOutlet) {
      this.userMenuPopoverOutlets.forEach(outlet => outlet.hide())
    }
    
    // Wait for menu animation to complete
    await new Promise(resolve => setTimeout(resolve, 250))
    
    // Navigate to bug report page
    window.location.href = event.currentTarget.href
  }
  
  requestFeature(event) {
    // Feature requests don't need screenshot, so just navigate normally
    // The menu will close automatically when navigating away
  }
}