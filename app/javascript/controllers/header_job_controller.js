import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  toggleJobPopover(event) {
    event.stopPropagation()
    // Find the job popover and toggle it
    const popover = document.querySelector('.job-popover')
    if (popover) {
      popover.classList.toggle('hidden')
    }
  }
}