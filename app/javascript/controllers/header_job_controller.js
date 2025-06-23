import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  toggleJobPopover(event) {
    event.stopPropagation()
    const triggerButton = event.currentTarget
    // Find the job popover controller
    const popoverElement = document.querySelector('.job-popover:not(.schedule-popover)')
    if (popoverElement) {
      const controller = this.application.getControllerForElementAndIdentifier(popoverElement, 'job-popover')
      if (controller) {
        // Close other popovers
        window.popoverManager?.closeAllExcept(controller)
        controller.toggleWithTrigger(triggerButton)
      } else {
        // Fallback for elements not yet using the new controller
        popoverElement.classList.toggle('hidden')
      }
    }
  }
  
  toggleSchedulePopover(event) {
    event.stopPropagation()
    const triggerButton = event.currentTarget
    // Find the schedule popover controller
    const popoverElement = document.querySelector('.schedule-popover')
    if (popoverElement) {
      const controller = this.application.getControllerForElementAndIdentifier(popoverElement, 'schedule-popover')
      if (controller) {
        // Close other popovers
        window.popoverManager?.closeAllExcept(controller)
        controller.toggleWithTrigger(triggerButton)
      } else {
        // Fallback for elements not yet using the new controller
        popoverElement.classList.toggle('hidden')
      }
    }
  }
  
  toggleUserMenuPopover(event) {
    event.stopPropagation()
    const triggerButton = event.currentTarget
    // Find the user menu popover controller
    const popoverElement = document.querySelector('.user-menu-popover')
    if (popoverElement) {
      const controller = this.application.getControllerForElementAndIdentifier(popoverElement, 'user-menu-popover')
      if (controller) {
        // Close other popovers
        window.popoverManager?.closeAllExcept(controller)
        controller.toggleWithTrigger(triggerButton)
      } else {
        // Fallback for elements not yet using the new controller
        popoverElement.classList.toggle('hidden')
      }
    }
  }
}