import { Controller } from "@hotwired/stimulus"
import html2canvas from "html2canvas"

export default class extends Controller {
  static targets = ["overlay", "form", "pageUrl", "userAgent", "viewportSize", "consoleLogs", "screenshot", "screenshotPreview", "submitButton"]
  static outlets = ["console-capture"]

  async connect() {
    // Capture the page URL from the previous page
    this.pageUrlTarget.value = document.referrer || window.location.href
    
    // Capture browser info
    this.userAgentTarget.value = navigator.userAgent
    this.viewportSizeTarget.value = `${window.innerWidth}x${window.innerHeight}`
    
    // Get console logs from console capture controller if available
    if (this.hasConsoleCaptureOutlet) {
      const consoleData = this.consoleCaptureOutlet.getConsoleData()
      this.consoleLogsTarget.value = JSON.stringify(consoleData)
    } else {
      // Fallback to empty array
      this.consoleLogsTarget.value = JSON.stringify({ entries: [], capturedAt: new Date().toISOString() })
    }
    
    // Start screenshot capture
    await this.captureScreenshot()
  }

  async captureScreenshot() {
    try {
      // Update status
      this.screenshotPreviewTarget.innerHTML = '<p class="screenshot-status">Capturing screenshot...</p>'
      
      // Small delay to ensure the modal overlay is not in the screenshot
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Hide the modal temporarily
      const modal = this.element.querySelector('.modal')
      const overlay = this.overlayTarget
      modal.style.display = 'none'
      overlay.style.display = 'none'
      
      // Capture the screenshot
      const canvas = await html2canvas(document.body, {
        scale: 0.3, // 30% scale for smaller file size
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY
      })
      
      // Convert to JPEG for smaller size
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      this.screenshotTarget.value = dataUrl
      
      // Show preview
      this.screenshotPreviewTarget.innerHTML = `
        <p class="screenshot-status">Screenshot captured successfully</p>
        <img src="${dataUrl}" alt="Screenshot" class="screenshot-thumb">
      `
      
      // Show modal again
      modal.style.display = ''
      overlay.style.display = ''
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      this.screenshotPreviewTarget.innerHTML = '<p class="screenshot-status error">Failed to capture screenshot</p>'
      
      // Show modal again even on error
      const modal = this.element.querySelector('.modal')
      const overlay = this.overlayTarget
      modal.style.display = ''
      overlay.style.display = ''
    }
  }

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