import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="person-form"
export default class extends Controller {
  static targets = ["contactMethods", "contactMethod"]
  
  connect() {
    this.index = this.contactMethodTargets.length
  }
  
  addContactMethod(event) {
    event.preventDefault()
    
    const template = `
      <div class="contact-method-field" data-person-form-target="contactMethod">
        <input type="text" 
               name="person[contact_methods_attributes][${this.index}][value]" 
               class="form-input" 
               placeholder="Phone, email, or address">
        <button type="button" 
                class="btn btn-danger btn-sm" 
                data-action="click->person-form#removeContactMethod">
          Remove
        </button>
      </div>
    `
    
    this.contactMethodsTarget.insertAdjacentHTML('beforeend', template)
    this.index++
  }
  
  removeContactMethod(event) {
    event.preventDefault()
    const field = event.target.closest('[data-person-form-target="contactMethod"]')
    
    // If this is an existing record, mark it for destruction
    const destroyCheckbox = field.querySelector('input[type="checkbox"][name*="_destroy"]')
    if (destroyCheckbox) {
      destroyCheckbox.checked = true
      field.style.display = 'none'
    } else {
      // If it's a new record, just remove it
      field.remove()
    }
  }
}