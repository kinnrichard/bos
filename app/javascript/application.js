// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import { Turbo } from "@hotwired/turbo-rails"

// Disable Turbo Drive but keep Turbo Streams for server-driven sorting
Turbo.session.drive = false

import "controllers"

// Create Bos namespace for custom utilities
window.Bos = window.Bos || {}

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
