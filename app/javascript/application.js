// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import { Turbo } from "@hotwired/turbo-rails"

// Disable Turbo Drive but keep Turbo Streams for server-driven sorting
Turbo.session.drive = false

// Import all Bos modules first, before controllers
import * as EmojiConfig from "bos/emoji_config"
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
import { StatusConverter } from "bos/status_converter"
import { JobTaskManager } from "bos/job_task_manager"
import { JobSelectionHandler } from "bos/job_selection_handler"
import { JobDragHandler } from "bos/job_drag_handler"
import { JobTimerManager } from "bos/job_timer_manager"
import { JobKeyboardHandler } from "bos/job_keyboard_handler"
import { errorHandler } from "bos/error_handler"
import { notificationManager } from "bos/notification_manager"
import { optimisticUI } from "bos/optimistic_ui_manager"

// Create Bos namespace for custom utilities and modules
window.Bos = window.Bos || {}

// Expose modules on window.Bos
Object.assign(window.Bos, {
  EmojiConfig,
  Icons,
  Constants,
  UserDisplay,
  ApiClient,
  SelectionManager,
  TaskRenderer,
  TaskInitializer,
  BasePopoverController,
  taskCreationQueue,
  SafeDOM,
  StatusConverter,
  JobTaskManager,
  JobSelectionHandler,
  JobDragHandler,
  JobTimerManager,
  JobKeyboardHandler,
  errorHandler,
  NotificationManager: notificationManager,
  optimisticUI
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
