import { Controller } from "@hotwired/stimulus"
import html2canvas from "html2canvas"

export default class extends Controller {
  static outlets = ["user-menu-popover"]
  
  async reportBug(event) {
    event.preventDefault()
    
    // Immediately hide the popover by adding hidden class
    const popover = document.querySelector('.user-menu-popover')
    if (popover) {
      popover.classList.add('hidden')
    }
    
    // Also try to use the outlet if available
    if (this.hasUserMenuPopoverOutlet) {
      this.userMenuPopoverOutlets.forEach(outlet => outlet.hide())
    }
    
    // Wait for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Capture screenshot of current page before navigating
    try {
      console.log('Capturing screenshot before navigation...')
      
      // Capture browser info before leaving the page
      const browserInfo = {
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString()
      }
      
      // Store browser info
      sessionStorage.setItem('bugReportBrowserInfo', JSON.stringify(browserInfo))
      
      // Try to capture console logs if console-capture controller exists
      const consoleCaptureElement = document.querySelector('[data-controller~="console-capture"]')
      if (consoleCaptureElement) {
        try {
          const consoleController = this.application.getControllerForElementAndIdentifier(consoleCaptureElement, 'console-capture')
          if (consoleController && consoleController.getConsoleData) {
            const consoleData = consoleController.getConsoleData()
            sessionStorage.setItem('bugReportConsoleLogs', JSON.stringify(consoleData))
          }
        } catch (e) {
          console.warn('Could not capture console logs:', e)
        }
      }
      
      // Small delay to ensure popover is fully hidden
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Capture the screenshot
      const targetElement = document.querySelector('.main-container') || document.body
      const canvas = await html2canvas(targetElement, {
        scale: 2, // Full resolution
        logging: false,
        backgroundColor: null,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 5000 // Shorter timeout since user is waiting
      })
      
      // Convert to PNG
      const dataUrl = canvas.toDataURL('image/png')
      console.log('Screenshot captured, size:', dataUrl.length)
      
      // Store in sessionStorage
      sessionStorage.setItem('bugReportScreenshot', dataUrl)
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      // Don't block navigation if screenshot fails
    }
    
    // Navigate to bug report page
    const link = event.currentTarget || event.target.closest('a')
    if (link && link.href) {
      window.location.href = link.href
    }
  }
  
  requestFeature(event) {
    // Feature requests don't need screenshot, so just navigate normally
    // The menu will close automatically when navigating away
  }
}