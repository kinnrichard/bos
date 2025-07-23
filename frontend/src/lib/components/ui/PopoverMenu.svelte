<script lang="ts" generics="T = any">
  import { onMount } from 'svelte';
  
  // Option type definition
  interface MenuOption {
    id: string | number;
    value: T;
    label: string;
    icon?: string;      // URL or emoji
    disabled?: boolean;
    divider?: boolean;  // Render as divider
    header?: boolean;   // Render as header
  }

  // Props interface
  interface Props {
    options: MenuOption[];
    selected?: T | T[];
    multiple?: boolean;
    onSelect: (value: T, option: MenuOption) => void;
    onClose?: () => void;
    showCheckmarks?: boolean;
    showIcons?: boolean;
    iconPosition?: 'left' | 'right';
    className?: string;
    optionClassName?: string;
    selectedClassName?: string;
    enableKeyboard?: boolean;
    autoFocus?: boolean;
    maxHeight?: string;
  }

  let {
    options,
    selected,
    multiple = false,
    onSelect,
    onClose,
    showCheckmarks = true,
    showIcons = true,
    iconPosition = 'left',
    className = '',
    optionClassName = '',
    selectedClassName = '',
    enableKeyboard = true,
    autoFocus = true,
    maxHeight = ''
  }: Props = $props();
  
  let menuElement = $state<HTMLElement>();
  let focusedIndex = $state(-1);
  let searchQuery = $state('');
  let searchTimeout: ReturnType<typeof setTimeout>;
  
  // Filter out dividers and headers for keyboard navigation
  const selectableOptions = $derived(
    options.filter(opt => !opt.divider && !opt.header && !opt.disabled)
  );
  
  // Find index in selectable options
  const focusedOption = $derived(
    focusedIndex >= 0 && focusedIndex < selectableOptions.length 
      ? selectableOptions[focusedIndex] 
      : null
  );
  
  function isSelected(value: T): boolean {
    if (selected === undefined) return false;
    if (Array.isArray(selected)) {
      return selected.includes(value);
    }
    return selected === value;
  }
  
  function handleSelect(option: MenuOption) {
    if (option.disabled || option.divider || option.header) return;
    
    onSelect(option.value, option);
    
    // Close on single select
    if (!multiple && onClose) {
      // Small delay to allow click animation
      setTimeout(() => onClose(), 100);
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (!enableKeyboard) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        const nextIndex = focusedIndex < selectableOptions.length - 1 
          ? focusedIndex + 1 
          : 0;
        focusedIndex = nextIndex;
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        const prevIndex = focusedIndex > 0 
          ? focusedIndex - 1 
          : selectableOptions.length - 1;
        focusedIndex = prevIndex;
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        if (focusedOption) {
          handleSelect(focusedOption);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        break;
        
      default:
        // Type-ahead search
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          clearTimeout(searchTimeout);
          searchQuery += e.key.toLowerCase();
          
          // Find first matching option
          const matchIndex = selectableOptions.findIndex(opt =>
            opt.label.toLowerCase().startsWith(searchQuery)
          );
          
          if (matchIndex >= 0) {
            focusedIndex = matchIndex;
          }
          
          // Clear search after 1 second
          searchTimeout = setTimeout(() => {
            searchQuery = '';
          }, 1000);
        }
    }
  }
  
  // Focus management
  onMount(() => {
    if (autoFocus && menuElement) {
      menuElement.focus();
      
      // Set initial focus to selected item
      if (selected !== undefined && !Array.isArray(selected)) {
        const selectedIndex = selectableOptions.findIndex(
          opt => opt.value === selected
        );
        if (selectedIndex >= 0) {
          focusedIndex = selectedIndex;
        }
      }
    }
    
    return () => {
      clearTimeout(searchTimeout);
    };
  });

  // Get index of option in full options array for rendering
  function getOptionIndex(option: MenuOption): number {
    return options.indexOf(option);
  }
</script>

<div 
  class="popover-menu {className}"
  role={multiple ? 'listbox' : 'menu'}
  aria-multiselectable={multiple}
  tabindex="0"
  bind:this={menuElement}
  onkeydown={handleKeydown}
  style="{maxHeight ? `max-height: ${maxHeight};` : ''}"
>
  {#each options as option (option.id)}
    {#if option.divider}
      <div class="popover-menu-divider" role="separator"></div>
    {:else if option.header}
      <div class="popover-menu-header" role="heading" aria-level="3">
        {option.label}
      </div>
    {:else}
      <button
        type="button"
        role={multiple ? 'option' : 'menuitem'}
        aria-selected={isSelected(option.value)}
        aria-disabled={option.disabled}
        class="popover-menu-option {optionClassName}"
        class:selected={isSelected(option.value)}
        class:focused={option === focusedOption}
        class:disabled={option.disabled}
        disabled={option.disabled}
        onclick={() => handleSelect(option)}
        onmouseenter={() => {
          const idx = selectableOptions.indexOf(option);
          if (idx >= 0) focusedIndex = idx;
        }}
      >
        {#if showCheckmarks}
          <div class="popover-menu-checkmark">
            {#if isSelected(option.value)}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            {/if}
          </div>
        {/if}
        
        {#if showIcons && option.icon && iconPosition === 'left'}
          <span class="popover-menu-icon popover-menu-icon-left">
            {#if option.icon.startsWith('/') || option.icon.startsWith('http')}
              <img src={option.icon} alt="" />
            {:else}
              {option.icon}
            {/if}
          </span>
        {/if}
        
        <span class="popover-menu-label">{option.label}</span>
        
        {#if showIcons && option.icon && iconPosition === 'right' && !showCheckmarks}
          <span class="popover-menu-icon popover-menu-icon-right">
            {#if option.icon.startsWith('/') || option.icon.startsWith('http')}
              <img src={option.icon} alt="" />
            {:else}
              {option.icon}
            {/if}
          </span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .popover-menu {
    display: flex;
    flex-direction: column;
    padding: 4px;
    min-width: 200px;
    outline: none;
    overscroll-behavior: contain;
  }

  /* Scrollbar styling */
  .popover-menu::-webkit-scrollbar {
    width: 6px;
  }

  .popover-menu::-webkit-scrollbar-track {
    background: transparent;
  }

  .popover-menu::-webkit-scrollbar-thumb {
    background-color: var(--border-secondary);
    border-radius: 3px;
  }
  
  .popover-menu-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border: none;
    background: none;
    text-align: left;
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    width: 100%;
    position: relative;
    outline: none; /* Remove focus outline */
  }
  
  /* Remove focus styles from all states */
  .popover-menu-option:focus {
    outline: none;
  }
  
  .popover-menu-option:focus-visible {
    outline: none;
  }
  
  .popover-menu-option:hover:not(.disabled) {
    background-color: var(--bg-tertiary);
  }
  
  .popover-menu-option.focused:not(.disabled) {
    background-color: var(--accent-blue);
    color: #FFFFFF;
    text-shadow: 1.5px 1.5px 3px rgba(0, 0, 0, 0.5);
  }
  
  .popover-menu-option.selected:not(.disabled) {
    background-color: var(--accent-blue-bg);
    color: var(--accent-blue);
  }
  
  .popover-menu-option.selected.focused:not(.disabled) {
    background-color: var(--accent-blue);
    color: #FFFFFF;
    text-shadow: 1.5px 1.5px 3px rgba(0, 0, 0, 0.5);
  }
  
  .popover-menu-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .popover-menu-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
  }
  
  .popover-menu-icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .popover-menu-icon-left {
  }

  .popover-menu-icon-right {
    margin-left: auto;
  }
  
  .popover-menu-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 30px;
  }
  
  .popover-menu-checkmark {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-blue);
  }
  
  .popover-menu-divider {
    height: 1px;
    background-color: var(--border-secondary);
    margin: 4px 8px;
  }
  
  .popover-menu-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    opacity: 0.33;
    line-height: 1.5;
    /* Add invisible checkmark and icon space for alignment */
    padding-left: 64px; /* 12px padding + 20px checkmark + 4px gap + 20px icon + 8px gap */
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .popover-menu-option {
      transition: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .popover-menu-option.focused {
      /* Use stronger background instead of outline for high contrast */
      background-color: var(--bg-tertiary);
    }
    
    .popover-menu-option.selected {
      font-weight: 600;
    }
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .popover-menu {
      /* Colors are already using CSS variables that adapt to dark mode */
    }
  }
</style>