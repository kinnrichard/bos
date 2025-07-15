# Svelte Actions

This directory contains reusable Svelte actions that can be applied to DOM elements across the application.

## Available Actions

### `spellcheck`

**Purpose**: Automatically manages spellcheck behavior on contenteditable elements to prevent visual clutter from persistent spell check suggestions.

**Behavior**:
- Sets `spellcheck="false"` by default (no spell check suggestions shown)
- Enables `spellcheck="true"` when element gains focus (spell check active during editing)
- Disables `spellcheck="false"` when element loses focus (spell check suggestions hidden)

**Usage**:
```svelte
<script>
  import { spellcheck } from '$lib/actions/spellcheck';
</script>

<!-- Apply to any contenteditable element -->
<div contenteditable="true" use:spellcheck>
  Editable content here
</div>

<!-- Works with any element type -->
<p contenteditable="true" use:spellcheck>Paragraph content</p>
<h1 contenteditable="true" use:spellcheck>Header content</h1>
<span contenteditable="true" use:spellcheck>Span content</span>
```

**Benefits**:
- Consistent behavior across all contenteditable elements
- Automatic cleanup when elements are destroyed
- No need to manually manage focus/blur handlers
- Works regardless of how element gains/loses focus (click, tab, programmatic)

**Example Integration**:
```svelte
<script>
  import { spellcheck } from '$lib/actions/spellcheck';
  
  let content = "Edit me!";
</script>

<div 
  contenteditable="true" 
  use:spellcheck
  bind:textContent={content}
>
  {content}
</div>
```

This action should be used on **all** contenteditable elements throughout the application to ensure consistent spell check behavior.