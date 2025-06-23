import { Controller } from "@hotwired/stimulus"

// Scrolls to the bottom of the logs table on page load
export default class extends Controller {
  connect() {
    // Find the scrollable container
    const tableContainer = this.element.querySelector('.logs-table-container')
    
    if (tableContainer) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        tableContainer.scrollTop = tableContainer.scrollHeight
      })
    }
  }
}