import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="client"
export default class extends Controller {
  static targets = [ "deleteButton" ]

  showDelete(event) {
    event.preventDefault()
    this.deleteButtonTarget.style.display = "inline"
    
    // Still navigate to the edit page
    window.location.href = event.currentTarget.href
  }
}