/**
 * Cursor positioning utilities for click-to-position functionality
 * Eliminates duplicate cursor positioning logic in TaskList.svelte
 */

/**
 * Positions cursor in input element based on click location
 * Used for both new task creation and title editing
 */
export function positionCursorAtClick(
  event: MouseEvent, 
  inputElement: HTMLInputElement, 
  referenceText: string
): void {
  if (!inputElement) return;
  
  requestAnimationFrame(() => {
    const clickX = event.clientX;
    const inputRect = inputElement.getBoundingClientRect();
    const relativeX = clickX - inputRect.left;
    
    // Create temporary measurement element with same styling
    const tempSpan = document.createElement('span');
    Object.assign(tempSpan.style, {
      visibility: 'hidden',
      position: 'absolute',
      whiteSpace: 'pre',
      font: window.getComputedStyle(inputElement).font
    });
    tempSpan.textContent = referenceText;
    
    document.body.appendChild(tempSpan);
    
    try {
      const charWidth = tempSpan.offsetWidth / referenceText.length;
      const cursorPosition = Math.max(0, Math.min(
        Math.round(relativeX / charWidth),
        referenceText.length
      ));
      
      inputElement.setSelectionRange(cursorPosition, cursorPosition);
    } finally {
      document.body.removeChild(tempSpan);
    }
  });
}

/**
 * Enhanced version for title editing that handles existing content
 * Finds closest character position in existing text
 */
export function positionCursorInText(
  event: MouseEvent,
  inputElement: HTMLInputElement,
  currentText: string
): void {
  if (!inputElement) return;
  
  requestAnimationFrame(() => {
    const clickX = event.clientX;
    const inputRect = inputElement.getBoundingClientRect();
    const relativeX = clickX - inputRect.left;
    
    // Create temporary span with exact styling
    const tempSpan = document.createElement('span');
    const computedStyle = window.getComputedStyle(inputElement);
    tempSpan.style.cssText = computedStyle.cssText;
    Object.assign(tempSpan.style, {
      position: 'absolute',
      visibility: 'hidden',
      whiteSpace: 'nowrap'
    });
    
    document.body.appendChild(tempSpan);
    
    try {
      // Find the closest character position
      let bestPosition = 0;
      let bestDistance = Infinity;
      
      for (let i = 0; i <= currentText.length; i++) {
        tempSpan.textContent = currentText.substring(0, i);
        const textWidth = tempSpan.getBoundingClientRect().width;
        const distance = Math.abs(relativeX - textWidth);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPosition = i;
        }
      }
      
      inputElement.setSelectionRange(bestPosition, bestPosition);
    } catch (error) {
      // Fallback: position at end of text
      inputElement.setSelectionRange(currentText.length, currentText.length);
    } finally {
      document.body.removeChild(tempSpan);
    }
  });
}