/**
 * Spellcheck Action
 * 
 * A global Svelte action that manages spellcheck behavior on contenteditable elements.
 * Automatically enables spellcheck on focus and disables it on blur to prevent
 * visual clutter from persistent spell check suggestions.
 * 
 * Usage:
 * ```svelte
 * <div contenteditable="true" use:spellcheck>Content</div>
 * ```
 */

export function spellcheck(element: HTMLElement) {
  // Set initial state - spellcheck disabled by default
  element.setAttribute('spellcheck', 'false');
  
  function handleFocus() {
    // Enable spellcheck when element gains focus
    element.setAttribute('spellcheck', 'true');
  }
  
  function handleBlur() {
    // Disable spellcheck when element loses focus to hide suggestions
    element.setAttribute('spellcheck', 'false');
  }
  
  // Add event listeners
  element.addEventListener('focus', handleFocus);
  element.addEventListener('blur', handleBlur);
  
  return {
    destroy() {
      // Clean up event listeners when element is destroyed
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    }
  };
}