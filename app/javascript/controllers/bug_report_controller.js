import { Controller } from "@hotwired/stimulus"
import html2canvas from "html2canvas"

export default class extends Controller {
  static targets = ["overlay", "form", "pageUrl", "userAgent", "viewportSize", "consoleLogs", "screenshot", "screenshotPreview", "submitButton"]
  static outlets = ["console-capture"]

  async connect() {
    try {
      // Check for pre-captured browser info from sessionStorage
      const storedBrowserInfo = sessionStorage.getItem('bugReportBrowserInfo')
      if (storedBrowserInfo) {
        const browserInfo = JSON.parse(storedBrowserInfo)
        this.pageUrlTarget.value = browserInfo.pageUrl
        this.userAgentTarget.value = browserInfo.userAgent
        this.viewportSizeTarget.value = browserInfo.viewportSize
        sessionStorage.removeItem('bugReportBrowserInfo')
      } else {
        // Fallback to current page info
        this.pageUrlTarget.value = document.referrer || window.location.href
        this.userAgentTarget.value = navigator.userAgent
        this.viewportSizeTarget.value = `${window.innerWidth}x${window.innerHeight}`
      }
      
      // Check for pre-captured console logs
      const storedConsoleLogs = sessionStorage.getItem('bugReportConsoleLogs')
      if (storedConsoleLogs) {
        this.consoleLogsTarget.value = storedConsoleLogs
        sessionStorage.removeItem('bugReportConsoleLogs')
      } else {
        this.consoleLogsTarget.value = JSON.stringify({ entries: [], capturedAt: new Date().toISOString() })
      }
      
      // Check for pre-captured screenshot
      const storedScreenshot = sessionStorage.getItem('bugReportScreenshot')
      if (storedScreenshot) {
        console.log('Using pre-captured screenshot from sessionStorage')
        this.screenshotTarget.value = storedScreenshot
        
        // Show preview
        this.screenshotPreviewTarget.innerHTML = `
          <p class="screenshot-status">Screenshot captured from previous page</p>
          <img src="${storedScreenshot}" alt="Screenshot" class="screenshot-thumb">
        `
        
        // Clear from sessionStorage
        sessionStorage.removeItem('bugReportScreenshot')
      } else {
        // No pre-captured screenshot available
        console.log('No pre-captured screenshot found')
        this.screenshotPreviewTarget.innerHTML = `
          <p class="screenshot-status">No screenshot available</p>
          <p class="screenshot-help">Screenshot could not be captured from the previous page.</p>
        `
      }
    } catch (error) {
      console.error('Error in bug report controller connect:', error)
    }
  }

  // Screenshot capture is now handled before navigation in feedback_menu_controller.js

  close(event) {
    event?.preventDefault()
    
    // Go back to previous page
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  handleSubmit(event) {
    // Disable submit button to prevent double submission
    this.submitButtonTarget.disabled = true
    this.submitButtonTarget.textContent = "Submitting..."
  }
}