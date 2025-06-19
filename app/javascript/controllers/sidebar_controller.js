import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="sidebar"
export default class extends Controller {
  static targets = ["sidebar"]

  connect() {
    // Check if sidebar was previously hidden
    const isHidden = localStorage.getItem("sidebarHidden") === "true"
    if (isHidden) {
      this.hide()
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
}