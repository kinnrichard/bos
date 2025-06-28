// Safe DOM manipulation utilities to prevent XSS attacks

export class SafeDOM {
  // Create a text node (automatically escaped)
  static text(content) {
    return document.createTextNode(content || '')
  }

  // Create an element with attributes and children
  static element(tag, attributes = {}, children = []) {
    const el = document.createElement(tag)
    
    // Set attributes safely
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value
      } else if (key === 'dataset') {
        // Handle data attributes
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          el.dataset[dataKey] = dataValue
        })
      } else if (key.startsWith('on')) {
        // Skip event handlers - these should be added via addEventListener
        console.warn(`Skipping inline event handler: ${key}`)
      } else {
        el.setAttribute(key, value)
      }
    })
    
    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(this.text(child))
      } else if (child instanceof Node) {
        el.appendChild(child)
      }
    })
    
    return el
  }

  // Update text content safely
  static setText(element, text) {
    element.textContent = text || ''
  }

  // Replace child nodes safely
  static replaceChildren(parent, children) {
    // Clear existing children
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild)
    }
    
    // Add new children
    children.forEach(child => {
      if (typeof child === 'string') {
        parent.appendChild(this.text(child))
      } else if (child instanceof Node) {
        parent.appendChild(child)
      }
    })
  }

  // Create dropdown content safely
  static createDropdownContent(emoji, label) {
    const span1 = this.element('span', { className: 'status-emoji' }, [emoji])
    const span2 = this.element('span', {}, [label])
    return [span1, span2]
  }

  // Create assignee content safely
  static createAssigneeContent(iconHtml, name) {
    // Parse icon HTML safely if it's provided as string
    if (typeof iconHtml === 'string') {
      const temp = document.createElement('div')
      temp.innerHTML = iconHtml // OK because this is from trusted source
      const iconElement = temp.firstElementChild
      if (iconElement) {
        return [iconElement, this.element('span', {}, [name])]
      }
    }
    
    return [this.element('span', {}, [name])]
  }

  // Insert HTML safely (for trusted content only, like server responses)
  static insertTrustedHTML(element, position, html) {
    // This should only be used for server-rendered HTML that we trust
    element.insertAdjacentHTML(position, html)
  }
}