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

## LEGACY Phlex Components ⚠️ DEPRECATED

**Status**: DEPRECATED - Only for reference when migrating existing code

**Key Points:**
- Legacy Phlex components are in `app/views/components/`
- DO NOT create new Phlex components
- DO NOT enhance existing Phlex components
- When touching legacy code, migrate to Svelte instead

**Migration Pattern:**
```ruby
# OLD: app/views/components/button_component.rb
# NEW: frontend/src/lib/components/Button.svelte
```

For complete Phlex documentation, see: [Legacy Phlex Guide](../legacy/phlex-migration.md)

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

## LEGACY Stimulus Controllers ⚠️ DEPRECATED

**Status**: DEPRECATED - Only for reference when migrating existing code

**Key Points:**
- Legacy Stimulus controllers are in `app/javascript/controllers/`
- DO NOT create new Stimulus controllers
- DO NOT enhance existing Stimulus controllers
- When touching legacy code, migrate to Svelte instead

**Migration Pattern:**
```javascript
// OLD: app/javascript/controllers/client_filter_controller.js
// NEW: frontend/src/lib/components/ClientFilter.svelte
```

For complete Stimulus documentation, see: [Legacy Stimulus Guide](../legacy/stimulus-migration.md)

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

## LEGACY Rails SCSS/CSS ⚠️ DEPRECATED

**Status**: DEPRECATED - Only for reference when migrating existing code

**Key Points:**
- Legacy Rails styles are in `app/assets/stylesheets/`
- DO NOT create new SCSS files in Rails app
- DO NOT enhance existing Rails styles
- When touching legacy code, migrate to Svelte + Tailwind instead

**Migration Pattern:**
```scss
// OLD: app/assets/stylesheets/components/_button.scss
// NEW: frontend/src/lib/components/Button.svelte (with Tailwind)
```

**Design Tokens** (for reference when migrating):
- Background: `#1C1C1E`, `#1C1C1D`, `#3A3A3C`
- Text: `#F2F2F7`, `#C7C7CC`, `#8E8E93`
- Accent: `#00A3FF`, `#FF453A`, `#32D74B`

For complete Rails CSS documentation, see: [Legacy Rails Styles Guide](../legacy/rails-styles.md)

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

## CSS/Tailwind Specific Guidelines

✅ **DO use Tailwind utility classes**
```svelte
<!-- Use theme-configured classes -->
<button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md">
  Click me
</button>
```

✅ **DO use theme tokens**
```svelte
<!-- Use configured dark theme colors -->
<div class="bg-dark-100 text-text-primary border border-dark-300">
  Content
</div>
```

❌ **DON'T create arbitrary values**
```svelte
<!-- WRONG: Custom values -->
<div class="bg-[#2A2A2C] text-[#EFEFEF] p-[14px]">
  
<!-- CORRECT: Use theme values -->
<div class="bg-dark-200 text-text-primary p-4">
```

## Resources

**Current (Svelte) Documentation:**
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Svelte Documentation](https://svelte.dev/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [TanStack Query (Svelte)](https://tanstack.com/query/latest/docs/svelte/overview)
- [Playwright Testing](https://playwright.dev/)

**Design Guidelines:**
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://material.io/design)

**Legacy Documentation:**
- [Legacy Phlex Guide](../legacy/phlex-migration.md)
- [Legacy Stimulus Guide](../legacy/stimulus-migration.md)
- [Legacy Rails Styles Guide](../legacy/rails-styles.md)