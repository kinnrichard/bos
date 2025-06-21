import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="sidebar"
export default class extends Controller {
  static targets = ["sidebar"]

  connect() {
    // Sync localStorage with cookie on page load
    const cookieValue = this.getCookie('sidebar_hidden')
    const localStorageValue = localStorage.getItem("sidebarHidden")
    
    // If cookie and localStorage disagree, localStorage wins (most recent interaction)
    if (localStorageValue && cookieValue !== localStorageValue) {
      this.setCookie('sidebar_hidden', localStorageValue)
    } else if (cookieValue && !localStorageValue) {
      // If only cookie exists, sync to localStorage
      localStorage.setItem("sidebarHidden", cookieValue)
    }
    
    // Check if sidebar was previously hidden (from either cookie or localStorage)
    const isHidden = localStorage.getItem("sidebarHidden") === "true"
    if (isHidden) {
      // If server already rendered it hidden (via cookie), just update buttons
      if (this.sidebarTarget.classList.contains("sidebar-hidden")) {
        document.querySelectorAll(".show-sidebar-btn").forEach(btn => {
          btn.style.display = "flex"
        })
      } else {
        // Otherwise hide immediately without animation
        this.hideImmediately()
      }
    } else {
      // Ensure toggle button is hidden when sidebar is visible
      document.querySelectorAll(".show-sidebar-btn").forEach(btn => {
        btn.style.display = "none"
      })
    }
  }

  toggle() {
    if (this.sidebarTarget.classList.contains("sidebar-hidden")) {
      this.show()
    } else {
      this.hide()
    }
  }
  
  show() {
    this.sidebarTarget.classList.remove("sidebar-hidden")
    document.querySelectorAll(".show-sidebar-btn").forEach(btn => {
      btn.style.display = "none"
    })
    localStorage.setItem("sidebarHidden", "false")
    this.setCookie('sidebar_hidden', 'false')
  }
  
  hide() {
    this.sidebarTarget.classList.add("sidebar-hidden")
    document.querySelectorAll(".show-sidebar-btn").forEach(btn => {
      btn.style.display = "flex"
    })
    localStorage.setItem("sidebarHidden", "true")
    this.setCookie('sidebar_hidden', 'true')
  }
  
  hideImmediately() {
    // Add no-transition class temporarily to prevent animation
    this.sidebarTarget.classList.add("no-transition")
    this.sidebarTarget.classList.add("sidebar-hidden")
    
    // Force a reflow to ensure the no-transition takes effect
    void this.sidebarTarget.offsetHeight
    
    // Remove the no-transition class after a frame
    requestAnimationFrame(() => {
      this.sidebarTarget.classList.remove("no-transition")
    })
    
    document.querySelectorAll(".show-sidebar-btn").forEach(btn => {
      btn.style.display = "flex"
    })
    localStorage.setItem("sidebarHidden", "true")
    this.setCookie('sidebar_hidden', 'true')
  }
  
  // Cookie helper methods
  getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] : null
  }
  
  setCookie(name, value) {
    // Set cookie for 1 year
    const date = new Date()
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000))
    document.cookie = `${name}=${value};path=/;expires=${date.toUTCString()}`
  }
}