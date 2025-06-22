import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  toggleJobPopover(event) {
    event.stopPropagation()
    // Find the job popover controller
    const popoverElement = document.querySelector('.job-popover:not(.schedule-popover)')
    if (popoverElement) {
      const controller = this.application.getControllerForElementAndIdentifier(popoverElement, 'job-popover')
      if (controller) {
        // Close other popovers
        window.popoverManager?.closeAllExcept(controller)
        controller.toggle()
      } else {
        // Fallback for elements not yet using the new controller
        popoverElement.classList.toggle('hidden')
      }
    }
  }
  
  toggleSchedulePopover(event) {
    event.stopPropagation()
    // Find the schedule popover controller
    const popoverElement = document.querySelector('.schedule-popover')
    if (popoverElement) {
      const controller = this.application.getControllerForElementAndIdentifier(popoverElement, 'schedule-popover')
      if (controller) {
        // Close other popovers
        window.popoverManager?.closeAllExcept(controller)
        controller.toggle()
      } else {
        // Fallback for elements not yet using the new controller
        popoverElement.classList.toggle('hidden')
      }
    }
  }
}