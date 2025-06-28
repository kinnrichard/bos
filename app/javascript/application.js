// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import { Turbo } from "@hotwired/turbo-rails"

// Disable Turbo Drive but keep Turbo Streams for server-driven sorting
Turbo.session.drive = false

// Import all Bos modules first, before controllers
import * as Icons from "bos/icons"
import * as Constants from "bos/constants"
import * as UserDisplay from "bos/user_display"
import { ApiClient } from "bos/api_helpers"
import { SelectionManager } from "bos/selection_manager"
import { TaskRenderer } from "bos/task_renderer"
import { TaskInitializer } from "bos/task_initializer"
import BasePopoverController from "bos/base_popover_controller"
import { taskCreationQueue } from "bos/task_creation_queue"
import { SafeDOM } from "bos/safe_dom"

// Create Bos namespace for custom utilities and modules
window.Bos = window.Bos || {}

// Expose modules on window.Bos
Object.assign(window.Bos, {
  Icons,
  Constants,
  UserDisplay,
  ApiClient,
  SelectionManager,
  TaskRenderer,
  TaskInitializer,
  BasePopoverController,
  taskCreationQueue,
  SafeDOM
})

// Now import controllers after Bos is set up
import "controllers"

// Custom Turbo Stream renderer that refreshes sortable controllers
Bos.renderTurboStreamMessage = (html) => {
  // First render the Turbo Stream
  const result = Turbo.renderStreamMessage(html)
  
  // Then refresh all sortable controllers on the page
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-controller~="sortable"]').forEach(element => {
      // Try to get the Stimulus controller instance
      const application = window.Stimulus || document.querySelector('[data-controller]')?._stimulusApplication
      if (application) {
        const controller = application.getControllerForElementAndIdentifier(element, 'sortable')
        if (controller?.refresh) {
          controller.refresh()
        }
      }
    })
  })
  
  return result
}
