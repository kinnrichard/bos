<script lang="ts">
  import { tick } from 'svelte';
  import { focusActions } from '$lib/stores/focusManager.svelte';
  import '../../styles/focus-ring.css';

  // Props interface
  interface Props {
    value: string;
    placeholder?: string;
    onSave: (newValue: string) => Promise<void>;
    onCancel?: () => void;
    tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'span';
    className?: string;
    fontSize?: string;
    fontWeight?: string;
    selectAllOnFocus?: boolean;
    trimOnSave?: boolean;
    allowEmpty?: boolean;
    autoFocus?: boolean;
    isEditing?: boolean;
    onEditingChange?: (editing: boolean) => void;
    onClick?: (e: MouseEvent) => void;
  }

  let {
    value,
    placeholder = 'Untitled',
    onSave,
    onCancel,
    tag = 'h3',
    className = '',
    fontSize,
    fontWeight,
    selectAllOnFocus = false,
    trimOnSave = true,
    allowEmpty = false,
    autoFocus = false,
    isEditing: externalIsEditing,
    onEditingChange,
    onClick
  }: Props = $props();

  let element = $state<HTMLElement>();
  let originalValue = $state(value);
  let isSaving = $state(false);
  let hasFocus = $state(false);
  
  // Update original value when value prop changes
  $effect(() => {
    if (!hasFocus) {
      originalValue = value;
    }
  });

  // Auto-focus on mount if requested
  $effect(() => {
    if (autoFocus && element) {
      element.focus();
    }
  });

  async function handleSave() {
    if (!element || isSaving) return;
    
    const newValue = element.textContent || '';
    const trimmedValue = trimOnSave ? newValue.trim() : newValue;
    
    // Validate empty values
    if (!allowEmpty && !trimmedValue) {
      handleCancel();
      return;
    }
    
    // Skip if value hasn't changed
    if (trimmedValue === originalValue) {
      element?.blur();
      return;
    }
    
    isSaving = true;
    try {
      await onSave(trimmedValue);
      originalValue = trimmedValue;
      element?.blur();
    } catch (error) {
      console.error('Failed to save title:', error);
      // Revert on error
      if (element) element.textContent = originalValue;
    } finally {
      isSaving = false;
    }
  }
  
  function handleCancel() {
    if (element) {
      element.textContent = originalValue;
    }
    onCancel?.();
    element?.blur();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  function handleFocus() {
    hasFocus = true;
    originalValue = element?.textContent || '';
    onEditingChange?.(true);
    
    // Enable spellcheck when focused
    if (element) {
      element.setAttribute('spellcheck', 'true');
      focusActions.setEditingElement(element, value);
    }
    
    if (selectAllOnFocus && element?.textContent) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }
  
  function handleBlur() {
    hasFocus = false;
    onEditingChange?.(false);
    focusActions.clearFocus();
    
    // Disable spellcheck when not focused
    if (element) {
      element.setAttribute('spellcheck', 'false');
    }
    
    handleSave();
  }

  function handleClick(e: MouseEvent) {
    // Always stop propagation to prevent double-handling
    e.stopPropagation();
    
    // Call parent's onClick if provided (for row selection)
    onClick?.(e);
    
    // Don't prevent default - let the browser handle cursor positioning
  }

  function handleMouseDown(e: MouseEvent) {
    // Always stop mousedown propagation to prevent double-handling
    e.stopPropagation();
  }

  // Fix contenteditable behavior
  function fixContentEditable(node: HTMLElement) {
    // Set initial state - spellcheck disabled by default
    node.setAttribute('spellcheck', 'false');
    
    // Prevent newlines from being inserted
    function handleBeforeInput(e: InputEvent) {
      if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
        e.preventDefault();
      }
    }
    
    // Add event listener
    node.addEventListener('beforeinput', handleBeforeInput);

    return {
      destroy() {
        // Clean up event listener
        node.removeEventListener('beforeinput', handleBeforeInput);
      }
    };
  }
</script>

<svelte:element 
  this={tag}
  class="editable-title focus-ring-tight {className}"
  class:editing={hasFocus}
  class:saving={isSaving}
  contenteditable="true"
  use:fixContentEditable
  bind:this={element}
  onclick={handleClick}
  onmousedown={handleMouseDown}
  onkeydown={handleKeydown}
  onblur={handleBlur}
  onfocus={handleFocus}
  style:font-size={fontSize}
  style:font-weight={fontWeight}
  data-placeholder={placeholder}
  role="textbox"
  aria-label="Edit title"
  tabindex="0"
>
  {value || ''}
</svelte:element>

<style>
  .editable-title {
    cursor: text;
    position: relative;
    min-height: 1.2em;
    word-break: break-word;
    /* Always have padding to prevent layout shift when focus ring appears */
    padding: 3px 8px;
    margin: -3px -8px;
  }
  
  /* Remove hover effect for desktop-style experience */
  
  /* When editing, show visual feedback */
  .editable-title.editing {
    background-color: var(--bg-primary);
    border-radius: 4px;
  }
  
  /* Let browser handle default focus ring without modification */
  
  .editable-title.saving {
    opacity: 0.6;
    pointer-events: none;
  }
  
  /* Show placeholder when empty */
  .editable-title:empty::before {
    content: attr(data-placeholder);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  /* Keep browser default focus outline */

  /* Ensure consistent line height */
  .editable-title h1,
  .editable-title h2,
  .editable-title h3,
  .editable-title h4,
  .editable-title h5 {
    margin: 0;
    padding: 0;
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    /* No hover effects */
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .editable-title {
      transition: none;
    }
  }
</style>