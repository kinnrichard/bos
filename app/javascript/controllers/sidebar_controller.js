import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "toggleButton"]

  connect() {
    // Check if sidebar should be hidden on load
    const sidebarHidden = this.getCookie('sidebar_hidden') === 'true'
    if (sidebarHidden) {
      this.element.querySelector('.sidebar').classList.add('sidebar-hidden')
    }
    this.updateToggleButtonVisibility()
  }

  hide() {
    const sidebar = this.element.querySelector('.sidebar')
    sidebar.classList.add('sidebar-hidden')
    this.setCookie('sidebar_hidden', 'true', 365)
    this.updateToggleButtonVisibility()
  }

  show() {
    const sidebar = this.element.querySelector('.sidebar')
    sidebar.classList.remove('sidebar-hidden')
    this.setCookie('sidebar_hidden', 'false', 365)
    this.updateToggleButtonVisibility()
  }

  toggle() {
    const sidebar = this.element.querySelector('.sidebar')
    if (sidebar.classList.contains('sidebar-hidden')) {
      this.show()
    } else {
      this.hide()
    }
  }

  updateToggleButtonVisibility() {
    const sidebar = this.element.querySelector('.sidebar')
    const isHidden = sidebar.classList.contains('sidebar-hidden')
    
    // Update all toggle buttons
    if (this.hasToggleButtonTarget) {
      this.toggleButtonTargets.forEach(button => {
        button.style.display = isHidden ? 'flex' : 'none'
      })
    }
  }

  // Cookie helpers
  setCookie(name, value, days) {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  }

  getCookie(name) {
    const nameEQ = name + "="
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }
}