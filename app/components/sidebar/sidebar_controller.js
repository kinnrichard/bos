import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="sidebar"
export default class extends Controller {
  static targets = ["sidebar"]

  connect() {
    // Check if sidebar was previously hidden
    const isHidden = localStorage.getItem("sidebarHidden") === "true"
    if (isHidden) {
      // Hide immediately without animation on initial load
      this.hideImmediately()
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
  }
  
  hide() {
    this.sidebarTarget.classList.add("sidebar-hidden")
    document.querySelectorAll(".show-sidebar-btn").forEach(btn => {
      btn.style.display = "flex"
    })
    localStorage.setItem("sidebarHidden", "true")
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
  }
}