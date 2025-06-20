import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="empty-state"
export default class extends Controller {
  focusSearch(event) {
    event.preventDefault()
    const searchInput = document.querySelector('.search-input')
    if (searchInput) {
      searchInput.focus()
    }
  }
}