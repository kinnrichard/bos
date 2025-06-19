import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="search"
export default class extends Controller {
  static targets = ["input", "dropdown", "results"]
  static values = { url: String }

  connect() {
    this.hideDropdown()
    // Add click outside listener
    document.addEventListener("click", this.handleClickOutside.bind(this))
  }

  disconnect() {
    document.removeEventListener("click", this.handleClickOutside.bind(this))
  }

  search() {
    const query = this.inputTarget.value
    
    if (query.length < 2) {
      this.hideDropdown()
      return
    }

    // Fetch search results
    fetch(`${this.urlValue}?q=${encodeURIComponent(query)}`, {
      headers: {
        "Accept": "text/html"
      }
    })
      .then(response => response.text())
      .then(html => {
        this.resultsTarget.innerHTML = html
        this.showDropdown()
      })
  }

  showDropdown() {
    this.dropdownTarget.classList.remove("hidden")
  }

  hideDropdown() {
    this.dropdownTarget.classList.add("hidden")
  }

  handleClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.hideDropdown()
    }
  }

  selectClient(event) {
    const clientName = event.currentTarget.dataset.clientName
    this.inputTarget.value = clientName
    this.hideDropdown()
  }

  createNewClient(event) {
    event.preventDefault()
    const name = this.inputTarget.value
    window.location.href = `/clients/new?name=${encodeURIComponent(name)}`
  }
}