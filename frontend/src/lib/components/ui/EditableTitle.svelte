<script lang="ts">
  import { tick } from 'svelte';
  import { focusManager } from '$lib/stores/focusManager.svelte';

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
    selectAllOnFocus = true,
    trimOnSave = true,
    allowEmpty = false,
    autoFocus = false,
    isEditing: externalIsEditing,
    onEditingChange
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
      exitEditMode();
      return;
    }
    
    isSaving = true;
    try {
      await onSave(trimmedValue);
      originalValue = trimmedValue;
      exitEditMode();
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
    
    // Set focus manager
    if (element) {
      focusManager.setEditingElement(element, value);
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
    focusManager.clearFocus();
    handleSave();
  }

  function handleClick(e: MouseEvent) {
    // Stop propagation to prevent row selection or other parent handlers
    e.stopPropagation();
    // Don't prevent default - let the browser handle cursor positioning
  }

  function handleMouseDown(e: MouseEvent) {
    // Also stop mousedown propagation in case row selection happens on mousedown
    e.stopPropagation();
  }

  // Fix contenteditable behavior
  function fixContentEditable(node: HTMLElement) {
    // Prevent newlines from being inserted
    node.addEventListener('beforeinput', (e: InputEvent) => {
      if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
        e.preventDefault();
      }
    });

    return {
      destroy() {
        // Cleanup if needed
      }
    };
  }
</script>

<svelte:element 
  this={tag}
  class="editable-title {className}"
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