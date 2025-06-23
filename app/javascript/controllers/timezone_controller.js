import { Controller } from "@hotwired/stimulus"

// Automatically detects and stores user's timezone in a cookie
export default class extends Controller {
  connect() {
    this.updateTimezone()
    
    // Check for timezone changes periodically (e.g., when traveling)
    this.intervalId = setInterval(() => {
      this.updateTimezone()
    }, 60000) // Check every minute
  }
  
  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
  
  updateTimezone() {
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const storedTimezone = this.getCookie('user_timezone')
    
    if (currentTimezone !== storedTimezone) {
      this.setCookie('user_timezone', currentTimezone, 365)
      
      // If timezone changed and we're not on initial page load, reload to update times
      if (storedTimezone && storedTimezone !== currentTimezone) {
        window.location.reload()
      }
    }
  }
  
  setCookie(name, value, days) {
    const expires = new Date()
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
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