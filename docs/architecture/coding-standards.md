# bŏs Coding Standards

## 🚨 MIGRATION IN PROGRESS

**The bŏs application is transitioning from a Rails monolith to separate Rails API + Svelte frontend.**

**Critical for AI Agents**:
- ❌ DO NOT create new Phlex components - use Svelte components
- ❌ DO NOT create new Stimulus controllers - use Svelte reactivity
- ✅ DO follow the Svelte/TypeScript standards for all new UI code
- ✅ DO create API endpoints in Rails for new features

## Overview

This document defines coding conventions and standards for the bŏs project. AI agents MUST follow these standards to maintain consistency and quality.

## Quick Reference

**Frontend Development (Svelte):**
- Check existing patterns in `/frontend/src`
- Use Svelte components with TypeScript
- Follow Apple HIG for UI decisions
- Use Tailwind CSS utilities
- Write Playwright tests for new features

**Backend Development (Rails API):**
- Create API endpoints, not views
- Use JSON serialization
- Run `rubocop -A` to fix style issues
- Write RSpec tests for API endpoints

**After coding:**
- Frontend: Run `npm run lint` and `npm run check`
- Backend: Run `rubocop -A`
- Run relevant tests
- Commit with "—CC" signature

## Ruby Standards

### General Ruby Conventions
```ruby
# Use 2 spaces for indentation (enforced by Rubocop)
class Client < ApplicationRecord
  # Constants at top
  DEFAULT_STATUS = "active"
  
  # Associations next
  has_many :jobs, dependent: :destroy
  has_many :devices, dependent: :destroy
  has_many :people, dependent: :destroy
  
  # Validations
  validates :name, presence: true
  
  # Scopes
  scope :active, -> { where(status: DEFAULT_STATUS) }
  
  # Instance methods
  def display_name
    "#{name} (#{code})"
  end
  
  private
  
  # Private methods at bottom
  def normalize_name
    self.name = name.strip.titleize
  end
end
```

### Method Naming
```ruby
# Predicates end with ?
def active?
  status == "active"
end

# Dangerous methods end with !
def activate!
  update!(status: "active")
end

# Use descriptive names
def calculate_total_hours_for_period(start_date, end_date)
  # NOT: def calc_hrs(s, e)
end
```

## Svelte Component Standards 🚨 PRIMARY APPROACH

### Basic Svelte Component Structure
```svelte
<!-- src/lib/components/Button.svelte -->
<script lang="ts">
  export let text: string;
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let disabled = false;
  
  $: classes = `
    button
    button--${variant}
    button--${size}
    ${$$props.class || ''}
  `.trim();
</script>

<button 
  class={classes}
  {disabled}
  on:click
  {...$$restProps}
>
  {text}
</button>
```

### Svelte Best Practices

1. **Use TypeScript for all components**
   ```svelte
   <script lang="ts">
   // Always use TypeScript for type safety
   </script>
   ```

2. **Component Organization**
   ```
   frontend/src/
   ├── lib/
   │   ├── components/     # Reusable components
   │   ├── stores/         # Svelte stores
   │   ├── api/            # API client functions
   │   └── utils/          # Helper functions
   ├── routes/             # SvelteKit pages
   └── app.css             # Global styles
   ```

3. **Props and Events**
   ```svelte
   <script lang="ts">
   // Export props with types
   export let name: string;
   export let count: number = 0;
   
   // Use createEventDispatcher for custom events
   import { createEventDispatcher } from 'svelte';
   const dispatch = createEventDispatcher<{
     change: { value: string };
     delete: { id: number };
   }>();
   </script>
   ```

4. **State Management**
   ```typescript
   // src/lib/stores/user.ts
   import { writable } from 'svelte/store';
   
   interface User {
     id: number;
     name: string;
     email: string;
   }
   
   export const currentUser = writable<User | null>(null);
   ```

5. **API Integration**
   ```typescript
   // src/lib/api/clients.ts
   import { createQuery } from '@tanstack/svelte-query';
   
   export function useClients() {
     return createQuery({
       queryKey: ['clients'],
       queryFn: async () => {
         const response = await fetch('/api/clients');
         if (!response.ok) throw new Error('Failed to fetch');
         return response.json();
       }
     });
   }
   ```

## LEGACY Phlex Component Standards ⚠️ DO NOT USE FOR NEW CODE

### Basic Phlex Component Structure
```ruby
# app/views/components/button_component.rb
module Components
  class ButtonComponent < ApplicationComponent
    def initialize(text:, variant: :primary, size: :medium, **options)
      @text = text
      @variant = variant
      @size = size
      @options = options
    end
    
    def view_template
      button(
        class: button_classes,
        data: data_attributes,
        **@options
      ) { @text }
    end
    
    private
    
    def button_classes
      tokens(
        "button",
        variant_class,
        size_class,
        @options[:class]
      )
    end
    
    def variant_class
      {
        primary: "button--primary",
        secondary: "button--secondary",
        danger: "button--danger",
        ghost: "button--ghost",
        link: "button--link"
      }[@variant]
    end
    
    def size_class
      {
        small: "button--small",
        medium: "button--medium",
        large: "button--large"
      }[@size]
    end
    
    def data_attributes
      @options[:data] || {}
    end
  end
end
```

### Phlex Best Practices

1. **NEVER use ERB templates for new components**
   ```ruby
   # ❌ WRONG - Don't create ERB files
   # app/views/clients/_form.html.erb
   
   # ✅ CORRECT - Use Phlex components
   # app/views/components/client_form_component.rb
   ```

2. **Component Organization**
   ```ruby
   # Place all components in app/views/components/
   app/views/components/
   ├── application_component.rb    # Base class
   ├── layouts/                    # Layout components
   ├── forms/                      # Form components
   ├── tables/                     # Table components
   └── ui/                        # General UI components
   ```

3. **Rendering Components in Controllers**
   ```ruby
   class ClientsController < ApplicationController
     def index
       render Components::Clients::IndexComponent.new(
         clients: @clients,
         current_user: current_user
       )
     end
   end
   ```

4. **Component Composition**
   ```ruby
   class ClientCardComponent < ApplicationComponent
     def initialize(client:)
       @client = client
     end
     
     def view_template
       div(class: "job-card-inline") do
         # Compose with other components
         render Components::UI::CardComponent.new do
           render Components::UI::HeadingComponent.new(
             text: @client.name,
             level: 3
           )
           
           render Components::UI::BadgeComponent.new(
             text: @client.status,
             variant: status_variant
           )
         end
       end
     end
   end
   ```

5. **Stimulus Integration in Phlex**
   ```ruby
   def view_template
     div(
       data: {
         controller: "dropdown",
         dropdown_positioning_value: "fixed"
       },
       class: "relative"
     ) do
       button(
         data: { dropdown_target: "button" },
         class: "button button--ghost"
       ) { "Open Menu" }
       
       div(
         data: { dropdown_target: "menu" },
         class: "dropdown-menu hidden"
       ) do
         # Menu items
       end
     end
   end
   ```

## TypeScript/JavaScript Standards (Svelte)

### TypeScript Configuration
```typescript
// Use strict TypeScript settings
// tsconfig.json is already configured with strict mode

// Always type your props and events
interface Props {
  name: string;
  count?: number;
}

// Use proper types for API responses
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

### Svelte Component Patterns
```svelte
<script lang="ts">
  // Imports at top
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import type { Client } from '$lib/types';
  
  // Props with defaults
  export let client: Client;
  export let showDetails = false;
  
  // Local state
  let isLoading = false;
  let error: string | null = null;
  
  // Reactive statements
  $: fullName = `${client.firstName} ${client.lastName}`;
  
  // Functions
  async function handleSave() {
    isLoading = true;
    try {
      // API call
    } catch (e) {
      error = e.message;
    } finally {
      isLoading = false;
    }
  }
  
  // Lifecycle
  onMount(() => {
    // Setup code
    return () => {
      // Cleanup code
    };
  });
</script>
```

### ESLint v9 Configuration
- Configuration file: `frontend/eslint.config.js`
- Uses flat config format
- Includes TypeScript and Svelte plugins
- Prettier integration for formatting

### Code Style
- Use Prettier for formatting (configured)
- 2-space indentation
- Single quotes for strings
- No semicolons (optional with Prettier)
- Trailing commas in multi-line objects/arrays

## LEGACY JavaScript Standards (Stimulus) ⚠️ DO NOT USE FOR NEW CODE

### Stimulus Controller Structure
```javascript
// app/javascript/controllers/client_filter_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "results", "count"]
  static values = { 
    url: String,
    minChars: { type: Number, default: 3 }
  }
  
  connect() {
    // Initialization code
    this.performFilter = debounce(this.performFilter.bind(this), 300)
  }
  
  disconnect() {
    // Cleanup code
  }
  
  filter() {
    const query = this.inputTarget.value
    
    if (query.length < this.minCharsValue) {
      this.clearResults()
      return
    }
    
    this.performFilter(query)
  }
  
  async performFilter(query) {
    try {
      const response = await fetch(`${this.urlValue}?query=${query}`)
      const html = await response.text()
      this.resultsTarget.innerHTML = html
      this.updateCount()
    } catch (error) {
      console.error("Filter error:", error)
      this.showError()
    }
  }
  
  clearResults() {
    this.resultsTarget.innerHTML = ""
    this.countTarget.textContent = "0"
  }
  
  updateCount() {
    const count = this.resultsTarget.children.length
    this.countTarget.textContent = count
  }
  
  showError() {
    this.resultsTarget.innerHTML = `
      <div class="error-message">
        Failed to load results. Please try again.
      </div>
    `
  }
}
```

### Stimulus Best Practices

1. **Data Attributes Convention**
   ```html
   <!-- Use kebab-case for HTML attributes -->
   <div data-controller="client-filter"
        data-client-filter-url-value="/clients/search"
        data-client-filter-min-chars-value="2">
   ```

2. **Target Naming**
   ```javascript
   // Targets should be semantic and reusable
   static targets = ["input", "output", "loading", "error"]
   
   // NOT: static targets = ["searchBox", "div1", "spinner"]
   ```

3. **Action Naming**
   ```html
   <!-- Be explicit about events -->
   <input data-action="input->client-filter#filter
                       client-filter:clear->client-filter#clearResults">
   
   <!-- NOT: <input data-action="client-filter#doStuff"> -->
   ```

## CSS Standards - Tailwind CSS (Current)

### Frontend Styling with Tailwind
The Svelte frontend uses Tailwind CSS with a custom dark theme configuration.

**Configuration**: `frontend/tailwind.config.js`

### Design Tokens
```javascript
// Use these color variables in Tailwind classes
colors: {
  dark: {
    100: '#1C1C1E',  // Primary background
    200: '#1C1C1D',  // Secondary background
    300: '#3A3A3C',  // Tertiary/hover
  },
  text: {
    primary: '#F2F2F7',
    secondary: '#C7C7CC',
    tertiary: '#8E8E93',
  },
  blue: {
    500: '#00A3FF',  // Primary accent
    600: '#0089E0',  // Hover state
  }
}
```

### Tailwind Best Practices
1. **Use utility classes directly**
   ```svelte
   <button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
     Click me
   </button>
   ```

2. **Extract components for repeated patterns**
   ```svelte
   <!-- Button.svelte -->
   <button class="button-primary">
     <slot />
   </button>
   
   <style lang="postcss">
     .button-primary {
       @apply px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md
              transition-colors duration-150 focus:outline-none focus:ring-2;
     }
   </style>
   ```

3. **Use CSS variables for dynamic theming**
   ```css
   /* app.css */
   :root {
     --color-primary: theme('colors.blue.500');
   }
   ```

## LEGACY SCSS/CSS Standards - Rails App ⚠️ DEPRECATED

### Design System Overview
The Rails app uses a **dark theme** design system following ITCSS architecture with macOS-native patterns.

**Status**: LEGACY - Being removed as views migrate to Svelte

### Color Palette (CSS Variables)
```scss
// Dark theme colors - DO NOT change without design review
:root {
  // Background colors
  --bg-black: #000000;          // Main app background
  --bg-primary: #1C1C1E;        // Primary containers
  --bg-secondary: #1C1C1D;      // Secondary containers  
  --bg-tertiary: #3A3A3C;       // Hover states
  
  // Text colors
  --text-primary: #F2F2F7;      // Main text
  --text-secondary: #C7C7CC;    // Secondary text
  --text-tertiary: #8E8E93;     // Muted text
  
  // Accent colors
  --accent-blue: #00A3FF;       // Primary actions
  --accent-blue-hover: #0089E0; // Hover state
  --accent-red: #FF453A;        // Danger/destructive
  --accent-green: #32D74B;      // Success states
  
  // Border colors
  --border-primary: rgba(255, 255, 255, 0.1);
  --border-secondary: rgba(255, 255, 255, 0.05);
}
```

### Spacing System
```scss
// Use these variables for ALL spacing
:root {
  --space-4xs: 0.125rem;  // 2px - Hairline spacing
  --space-3xs: 0.25rem;   // 4px - Tight grouping
  --space-2xs: 0.5rem;    // 8px - Compact spacing
  --space-xs: 0.75rem;    // 12px - Default small spacing
  --space-sm: 1rem;       // 16px - Standard spacing
  --space-md: 1.5rem;     // 24px - Section spacing
  --space-lg: 2rem;       // 32px - Large spacing
  --space-xl: 2.5rem;     // 40px - Extra spacing
  --space-2xl: 3rem;      // 48px - Major sections
  --space-3xl: 4rem;      // 64px - Page sections
}

// Example usage
.component {
  padding: var(--space-sm);
  margin-bottom: var(--space-md);
  gap: var(--space-xs);
}
```

### Component Patterns

#### Button Component
```scss
// Base button with BEM modifiers
.button {
  // Base styles - don't override these
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  
  // Focus state for accessibility
  &:focus-visible {
    @include focus-ring;
  }
  
  // Variants
  &--primary {
    background-color: var(--accent-blue);
    color: white;
    
    &:hover {
      background-color: var(--accent-blue-hover);
    }
  }
  
  &--secondary {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    
    &:hover {
      background-color: var(--bg-tertiary);
    }
  }
  
  &--danger {
    background-color: var(--accent-red);
    color: white;
    
    &:hover {
      background-color: #E5352F;
    }
  }
  
  &--ghost {
    background-color: transparent;
    color: var(--text-primary);
    
    &:hover {
      background-color: var(--bg-tertiary);
    }
  }
  
  // Sizes
  &--small {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  &--large {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  // States
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

#### Card/Panel Pattern
```scss
// Standard card component
.job-card-inline {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--accent-blue);
  }
  
  // Nested spacing
  > * + * {
    margin-top: var(--space-xs);
  }
}
```

#### Form Controls
```scss
// Input field styling
.form-input {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.15s ease;
  
  &:focus {
    @include focus-ring;
    background-color: var(--bg-tertiary);
  }
  
  &::placeholder {
    color: var(--text-tertiary);
  }
}
```

### SCSS Architecture (ITCSS)
```scss
// Follow this import order in application.scss
// 1. Settings - Design tokens
// 2. Tools - Mixins and functions  
// 3. Generic - Reset/normalize
// 4. Elements - HTML elements
// 5. Objects - Layout patterns
// 6. Components - UI components
// 7. Utilities - Helper classes

// When adding new styles, place them in the correct layer
```

### Key Mixins
```scss
// Always use these mixins for consistency

// Focus ring for accessibility
@mixin focus-ring {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 163, 255, 0.3);
}

// Standard panel/card
@mixin panel($radius: 8px) {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: $radius;
}

// Text truncation
@mixin truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Custom scrollbar
@mixin custom-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--bg-primary);
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    
    &:hover {
      background-color: var(--border-primary);
    }
  }
}
```

### Animation Guidelines
```scss
// Use these timing values
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --easing-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

// Standard transitions
$transition-fast: all 0.15s ease;
$transition-normal: all 0.25s ease;

// Hover effects should be subtle
.interactive-element {
  transition: $transition-fast;
  
  &:hover {
    // Prefer background color changes
    background-color: var(--bg-tertiary);
    
    // Avoid transforms unless necessary
    // transform: translateY(-2px); // Only for emphasis
  }
}
```

## Asset Pipeline Commands

### CRITICAL: After ANY JavaScript or CSS Changes
```bash
# This command MUST be run after making changes to:
# - Any .scss files
# - Any .js files  
# - Stimulus controllers
# - Import maps
# - Asset configurations

rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json

# Why each part matters:
# rails tmp:clear           - Clears temporary files
# rails assets:clobber      - Removes compiled assets
# rails assets:precompile   - Recompiles all assets
# rm -f public/assets/.manifest.json - Removes old manifest
```

## Git Commit Standards

### Commit Message Format
```bash
# Format: <prefix>: <description> —CC

# Prefixes:
# feature: New feature
# fix: Bug fix
# refactor: Code refactoring
# test: Adding tests
# docs: Documentation
# style: CSS/formatting changes
# maintenance: Maintenance tasks
# migration: Svelte migration work

# Frontend examples:
git commit -m "feature: Add client search with Svelte component —CC"
git commit -m "migration: Convert job list from Phlex to Svelte —CC"
git commit -m "fix: Correct TypeScript types for API response —CC"
git commit -m "test: Add Playwright tests for client creation —CC"

# Backend examples:
git commit -m "feature: Add JSON API endpoint for clients —CC"
git commit -m "fix: Correct JWT token validation —CC"
git commit -m "refactor: Extract client serialization logic —CC"
```

### Commit Workflow

**Frontend Changes:**
```bash
# 1. Make your changes in /frontend
# 2. Type check and lint
npm run check
npm run lint

# 3. Run tests
npm run test

# 4. Stage and commit
git add .
git commit -m "feature: Implement client search in Svelte —CC"

# 5. Push to remote
git push
```

**Backend Changes:**
```bash
# 1. Make your changes
# 2. Run tests
bundle exec rspec

# 3. Fix style issues
rubocop -A

# 4. Stage and commit
git add .
git commit -m "feature: Add clients API endpoint —CC"

# 5. Push to remote
git push
```

## Testing Standards

### Playwright Test Structure
```ruby
# test/playwright/clients_test.rb
require "test_helper"

class ClientsTest < PlaywrightTest
  test "creating a new client" do
    # Arrange
    login_as(users(:admin))
    
    # Act
    visit clients_path
    click_button "New Client"
    
    within_modal do
      fill_in "Name", with: "Acme Corp"
      fill_in "Code", with: "ACME"
      select "Active", from: "Status"
      click_button "Create Client"
    end
    
    # Assert
    assert_text "Client was successfully created"
    assert_selector ".job-card-inline", text: "Acme Corp"
    
    # Verify in database
    client = Client.last
    assert_equal "Acme Corp", client.name
    assert_equal "ACME", client.code
  end
  
  test "filtering clients by name" do
    # Setup test data
    create(:client, name: "Apple Inc")
    create(:client, name: "Microsoft Corp")
    create(:client, name: "Google LLC")
    
    login_as(users(:admin))
    visit clients_path
    
    # Test filtering
    fill_in "Search clients", with: "app"
    
    assert_selector ".client-card", count: 1
    assert_text "Apple Inc"
    assert_no_text "Microsoft Corp"
  end
end
```

## Common Pitfalls to Avoid

### Frontend (Svelte) Development
1. **Creating Phlex components instead of Svelte components**
2. **Not using TypeScript for new components**
3. **Using vanilla JS instead of Svelte's reactivity**
4. **Not using Tailwind utility classes**
5. **Forgetting to run type checking (`npm run check`)**
6. **Not writing Playwright tests for UI changes**
7. **Using inline styles instead of Tailwind classes**
8. **Creating custom colors instead of using theme tokens**
9. **Not following the ESLint v9 configuration**
10. **Importing from Rails app instead of API calls**

### Backend (Rails) Development
1. **Creating view templates instead of API endpoints**
2. **Adding Stimulus controllers (use Svelte instead)**
3. **Creating new Phlex components (use Svelte instead)**
4. **Forgetting to run Rubocop**
5. **Not writing RSpec tests for API endpoints**
6. **Using session auth instead of JWT for API**
7. **Returning HTML instead of JSON**

## CSS/SCSS Specific Don'ts

❌ **DON'T create new colors**
```scss
// WRONG
.my-component {
  background-color: #2A2A2C; // Don't invent colors
  color: #EFEFEF;           // Use variables
}

// CORRECT
.my-component {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}
```

❌ **DON'T use arbitrary spacing**
```scss
// WRONG
.my-component {
  padding: 14px;      // Random value
  margin-top: 18px;   // Not in scale
}

// CORRECT  
.my-component {
  padding: var(--space-sm);      // 16px
  margin-top: var(--space-md);   // 24px
}
```

❌ **DON'T override base component styles**
```scss
// WRONG
.button {
  padding: 10px 20px !important; // Don't override base
}

// CORRECT
.button--custom {
  padding: 10px 20px; // Create modifier instead
}
```

## Resources

- [Phlex Documentation](https://phlex.fun)
- [Stimulus Handbook](https://stimulus.hotwired.dev/handbook/introduction)
- [macOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/macos/overview/themes/)
- [ITCSS Architecture](https://www.creativebloq.com/web-design/manage-large-css-projects-itcss-101517528)