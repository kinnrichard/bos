import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.consoleEntries = []
    this.maxEntries = 50
    
    // Store original console methods
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    }
    
    // Override console methods to capture output
    this.overrideConsoleMethods()
    
    // Capture any existing errors
    this.captureExistingErrors()
  }
  
  disconnect() {
    // Restore original console methods
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method]
    })
  }
  
  overrideConsoleMethods() {
    const methods = ['log', 'warn', 'error', 'info', 'debug']
    
    methods.forEach(method => {
      console[method] = (...args) => {
        // Call original method
        this.originalConsole[method].apply(console, args)
        
        // Capture the entry
        this.captureEntry(method, args)
      }
    })
  }
  
  captureEntry(type, args) {
    const entry = {
      type: type,
      timestamp: new Date().toISOString(),
      message: this.formatMessage(args),
      stack: type === 'error' ? this.getStackTrace() : null
    }
    
    // Add to entries array
    this.consoleEntries.push(entry)
    
    // Keep only the last N entries
    if (this.consoleEntries.length > this.maxEntries) {
      this.consoleEntries.shift()
    }
  }
  
  formatMessage(args) {
    return args.map(arg => {
      if (arg === null) return 'null'
      if (arg === undefined) return 'undefined'
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch (e) {
          return '[Circular Object]'
        }
      }
      return String(arg)
    }).join(' ')
  }
  
  getStackTrace() {
    const error = new Error()
    const stack = error.stack || ''
    // Remove the first few lines that reference this capture code
    const lines = stack.split('\n')
    return lines.slice(3).join('\n')
  }
  
  captureExistingErrors() {
    // Listen for unhandled errors
    window.addEventListener('error', (event) => {
      this.captureEntry('error', [
        event.message,
        `at ${event.filename}:${event.lineno}:${event.colno}`
      ])
    })
    
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureEntry('error', [
        'Unhandled Promise Rejection:',
        event.reason
      ])
    })
  }
  
  getConsoleData() {
    return {
      entries: this.consoleEntries,
      capturedAt: new Date().toISOString(),
      totalCaptured: this.consoleEntries.length,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }
  }
  
  // Clear captured console data
  clear() {
    this.consoleEntries = []
  }
}