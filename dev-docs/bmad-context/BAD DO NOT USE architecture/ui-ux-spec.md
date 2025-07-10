# bŏs UI/UX Specification

## Overview

This document defines the UI/UX guidelines for bŏs, which follows a dark theme inspired by macOS native applications. The goal is to create an interface that feels like a native Apple desktop app - professional, efficient, and refined.

## Quick Reference

**Design Principles:**
- Dark theme optimized for long work sessions
- Minimal, functional aesthetics
- Subtle animations and transitions
- Information density without clutter
- Consistent spacing and alignment

**Key Elements:**
- Background: Pure black (#000000)
- Containers: Dark grays (#1C1C1E)
- Primary text: Off-white (#F2F2F7) - NOT pure white
- Button text: Pure white (#FFFFFF) on colored backgrounds only
- Accent: Blue (#00A3FF)
- Corners: Subtle radius (4-8px)
- Shadows: Minimal and functional

## Design System

### Color Palette

```scss
// All colors are CSS variables - use these, never hardcode colors
:root {
  // Backgrounds - Dark to Light
  --bg-black: #000000;          // Main app background
  --bg-primary: #1C1C1E;        // Primary containers, cards
  --bg-secondary: #1C1C1D;      // Secondary containers, inputs
  --bg-tertiary: #3A3A3C;       // Hover states, selected items
  
  // Text - Off-white to Gray (NOT pure white for general text)
  --text-primary: #F2F2F7;      // Main text - off-white for reduced eye strain
  --text-secondary: #C7C7CC;    // Secondary text, labels
  --text-tertiary: #8E8E93;     // Muted text, placeholders
  
  // Accent Colors
  --accent-blue: #00A3FF;       // Primary actions, links
  --accent-blue-hover: #0089E0; // Hover state for blue
  --accent-red: #FF453A;        // Destructive actions, errors
  --accent-green: #32D74B;      // Success, positive states
  --accent-yellow: #FFD60A;     // Warnings, attention
  --accent-purple: #BF5AF2;     // Special highlights
  
  // Borders
  --border-primary: rgba(255, 255, 255, 0.1);   // Visible borders
  --border-secondary: rgba(255, 255, 255, 0.05); // Subtle borders
  
  // Shadows (subtle in dark theme)
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.5);
}
```

### Text Color Usage

**Important**: We use a subtle hierarchy of text colors:

1. **Pure White (#FFFFFF)** - Used ONLY for:
   - Text on primary buttons (blue background)
   - Text on danger buttons (red background)
   - Text on any colored background where maximum contrast is needed

2. **Off-White (#F2F2F7)** - Used for:
   - All general interface text
   - Headers and body text
   - Text on dark backgrounds
   - Secondary buttons

3. **Gray Shades** - Used for:
   - Secondary information (#C7C7CC)
   - Placeholder text (#8E8E93)
   - Disabled states

This creates visual hierarchy where button text "pops" while general text is easier on the eyes.

### Typography

```scss
// System font stack for native feel
--font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;

// Font sizes - use these variables
$font-size-xs: 11px;    // Small labels, captions
$font-size-sm: 12px;    // Secondary text
$font-size-base: 14px;  // Body text (macOS default)
$font-size-md: 16px;    // Subheadings
$font-size-lg: 18px;    // Section headers
$font-size-xl: 20px;    // Page titles
$font-size-2xl: 24px;   // Major headings
$font-size-3xl: 28px;   // Hero text

// Font weights
$font-weight-normal: 400;   // Body text
$font-weight-medium: 500;   // Emphasis
$font-weight-semibold: 600; // Headings
$font-weight-bold: 700;     // Strong emphasis

// Line heights
$line-height-tight: 1.2;    // Headings
$line-height-normal: 1.5;   // Body text
$line-height-relaxed: 1.75; // Reading text
```

### Spacing System

```scss
// Use these variables for ALL spacing - creates visual rhythm
:root {
  --space-4xs: 0.125rem;  // 2px - Hairline spacing
  --space-3xs: 0.25rem;   // 4px - Tight elements
  --space-2xs: 0.5rem;    // 8px - Related items
  --space-xs: 0.75rem;    // 12px - Standard gap
  --space-sm: 1rem;       // 16px - Default spacing
  --space-md: 1.5rem;     // 24px - Section spacing
  --space-lg: 2rem;       // 32px - Major gaps
  --space-xl: 2.5rem;     // 40px - Large sections
  --space-2xl: 3rem;      // 48px - Major breaks
  --space-3xl: 4rem;      // 64px - Page sections
}

// Example usage
.component {
  padding: var(--space-sm);           // 16px padding
  margin-bottom: var(--space-md);     // 24px bottom margin
  gap: var(--space-xs);               // 12px between items
}
```

### Border Radius

```scss
// Subtle rounding for professional feel
:root {
  --radius-sm: 4px;     // Buttons, inputs
  --radius-md: 6px;     // Cards, dropdowns
  --radius-lg: 8px;     // Modals, large cards
  --radius-xl: 12px;    // Special containers
  --radius-2xl: 16px;   // Hero sections
  --radius-full: 9999px; // Pills, avatars
}
```

## Component Patterns

### Buttons

```scss
// Primary Button - Main actions
.button--primary {
  background-color: var(--accent-blue);
  color: #FFFFFF;  // Pure white for maximum contrast
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  
  &:hover {
    background-color: var(--accent-blue-hover);
    // No transform - professional apps don't "bounce"
  }
  
  &:active {
    // Subtle feedback
    opacity: 0.9;
  }
  
  &:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
}

// Secondary Button - Alternative actions
.button--secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);  // Off-white, not pure white
  border: 1px solid var(--border-primary);
  
  &:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-primary);
  }
}

// Ghost Button - Tertiary actions
.button--ghost {
  background-color: transparent;
  color: var(--text-primary);  // Off-white
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
}

// Danger Button - Destructive actions
.button--danger {
  background-color: var(--accent-red);
  color: #FFFFFF;  // Pure white for maximum contrast
  
  &:hover {
    background-color: #E5352F;
  }
}

// Size Variants
.button--small {
  padding: 6px 12px;
  font-size: 13px;
}

.button--large {
  padding: 12px 24px;
  font-size: 16px;
}
```

### Cards and Containers

```scss
// Standard card component
.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  
  // Very subtle shadow for depth
  box-shadow: var(--shadow-sm);
  
  // Text uses off-white
  color: var(--text-primary);
  
  // No hover transform - just color change
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }
}

// Inline job card (specific pattern)
.job-card-inline {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }
  
  .job-status {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      
      &.status-dot--active {
        background-color: var(--accent-green);
      }
      
      &.status-dot--pending {
        background-color: var(--accent-yellow);
      }
    }
  }
}
```

### Form Controls

```scss
// Text Input
.form-input {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-primary);  // Off-white for input text
  width: 100%;
  
  transition: all 0.15s ease;
  
  &:hover {
    background-color: var(--bg-tertiary);
  }
  
  &:focus {
    outline: none;
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px rgba(0, 163, 255, 0.3);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Select Dropdown
.form-select {
  @extend .form-input;
  
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23C7C7CC' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 20px;
  padding-right: 36px;
}

// Checkbox/Radio
.form-checkbox {
  width: 16px;
  height: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  
  &:checked {
    background-color: var(--accent-blue);
    border-color: var(--accent-blue);
  }
}
```

### Navigation

```scss
// Sidebar navigation
.sidebar {
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-secondary);
  width: 240px;
  height: 100vh;
  padding: var(--space-md);
  
  .nav-section {
    margin-bottom: var(--space-lg);
    
    .nav-section-title {
      font-size: $font-size-xs;
      font-weight: $font-weight-semibold;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-xs);
    }
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    transition: all 0.15s ease;
    
    &:hover {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);  // Off-white on hover
    }
    
    &.active {
      background-color: var(--accent-blue);
      color: #FFFFFF;  // Pure white when selected
    }
    
    .nav-icon {
      width: 16px;
      height: 16px;
      margin-right: var(--space-xs);
    }
  }
}
```

### Modals

```scss
// Modal backdrop
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}

// Modal content
.modal-content {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  
  .modal-header {
    padding: var(--space-md);
    border-bottom: 1px solid var(--border-secondary);
    
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    h2 {
      font-size: $font-size-lg;
      font-weight: $font-weight-semibold;
      color: var(--text-primary);  // Off-white headers
    }
    
    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-tertiary);
      
      &:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
      }
    }
  }
  
  .modal-body {
    padding: var(--space-md);
    overflow-y: auto;
    color: var(--text-primary);  // Off-white body text
  }
  
  .modal-footer {
    padding: var(--space-md);
    border-top: 1px solid var(--border-secondary);
    
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-xs);
  }
}
```

### Tables

```scss
// Data table
.data-table {
  width: 100%;
  border-collapse: collapse;
  
  thead {
    border-bottom: 1px solid var(--border-primary);
    
    th {
      padding: var(--space-xs) var(--space-sm);
      text-align: left;
      font-size: $font-size-sm;
      font-weight: $font-weight-semibold;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
  
  tbody {
    tr {
      border-bottom: 1px solid var(--border-secondary);
      transition: background-color 0.15s ease;
      
      &:hover {
        background-color: var(--bg-tertiary);
      }
      
      &.selected {
        background-color: var(--accent-blue);
        color: #FFFFFF;  // Pure white when selected
      }
    }
    
    td {
      padding: var(--space-sm);
      font-size: $font-size-base;
      color: var(--text-primary);  // Off-white for data
    }
  }
}
```

## Interaction Patterns

### Hover States
- Use background color changes, not transforms
- Subtle border highlight for interactive elements
- 150ms transition for smooth feedback

### Focus States
- Blue outline with 2px width
- 2px offset from element
- High contrast for accessibility

### Active States
- Slightly darker background
- No "pressed" transform effect
- Instant feedback (no transition)

### Disabled States
- 50% opacity
- No hover effects
- cursor: not-allowed

## Animation Guidelines

### Timing
```scss
// Standard timing variables
:root {
  --duration-fast: 150ms;   // Hover states, small transitions
  --duration-normal: 250ms; // Most animations
  --duration-slow: 350ms;   // Complex animations
  --easing-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### Transitions
- Prefer `opacity` and `background-color` changes
- Avoid `transform` unless necessary
- Use `will-change` sparingly
- Keep animations subtle and functional

### Examples
```scss
// Fade in
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

// Slide down (for dropdowns)
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Usage
.dropdown-menu {
  animation: slideDown var(--duration-fast) var(--easing-smooth);
}
```

## Responsive Design

### Breakpoints
```scss
// Mobile-first breakpoints
$breakpoint-sm: 640px;   // Small tablets
$breakpoint-md: 768px;   // Tablets
$breakpoint-lg: 1024px;  // Small laptops
$breakpoint-xl: 1280px;  // Desktops
$breakpoint-2xl: 1536px; // Large screens

// Usage
@media (min-width: $breakpoint-lg) {
  .sidebar {
    display: block;
  }
}
```

### Mobile Considerations
- Increase tap targets to 44px minimum
- Adjust spacing for smaller screens
- Stack elements vertically
- Hide non-essential elements
- Use full-screen modals

## Accessibility

### Color Contrast
- Text on backgrounds must meet WCAG AA standards
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text
- Pure white on colored backgrounds ensures maximum contrast

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Visible focus indicators required
- Logical tab order
- Skip links for main content

### Screen Readers
- Proper heading hierarchy
- Descriptive link text
- Alt text for images
- ARIA labels where needed

## Icons and Graphics

### Icon Guidelines
- Use SF Symbols or similar system icons
- 16px default size, 20px for emphasis
- Match text color for consistency
- Subtle animations on interaction

### Loading States
```scss
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Empty States

```scss
.empty-state {
  text-align: center;
  padding: var(--space-2xl);
  
  .empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--space-md);
    opacity: 0.3;
  }
  
  .empty-title {
    font-size: $font-size-lg;
    font-weight: $font-weight-semibold;
    color: var(--text-primary);  // Off-white
    margin-bottom: var(--space-xs);
  }
  
  .empty-description {
    font-size: $font-size-base;
    color: var(--text-secondary);
    margin-bottom: var(--space-md);
  }
}
```

## Do's and Don'ts

### DO's ✅
- Use CSS variables for all colors
- Follow the spacing system
- Keep animations subtle
- Test in dark environments
- Maintain consistency
- Use pure white (#FFFFFF) only on colored backgrounds

### DON'Ts ❌
- Don't create new colors
- Don't use arbitrary spacing
- Don't add bouncy animations
- Don't use pure white (#FFFFFF) for general text (use --text-primary)
- Don't ignore accessibility

## Implementation Checklist

When implementing UI:
- [ ] Use existing color variables
- [ ] Follow spacing system
- [ ] Add proper hover/focus states
- [ ] Test keyboard navigation
- [ ] Check contrast ratios
- [ ] Add loading states
- [ ] Handle empty states
- [ ] Test on different screen sizes
- [ ] Ensure smooth animations
- [ ] Write Playwright tests