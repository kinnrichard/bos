import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]
  
  toggle() {
    this.contentTarget.classList.toggle("hidden")
  }
  
  hide(event) {
    if (!this.element.contains(event.target)) {
      this.contentTarget.classList.add("hidden")
    }
  }
  
  connect() {
    this.hideHandler = this.hide.bind(this)
    document.addEventListener("click", this.hideHandler)
  }
  
  disconnect() {
    document.removeEventListener("click", this.hideHandler)
  }
}