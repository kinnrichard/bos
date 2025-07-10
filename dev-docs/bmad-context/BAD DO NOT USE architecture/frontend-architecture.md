# bŏs Frontend Architecture

## Overview

The bŏs frontend is a modern Single Page Application (SPA) built with SvelteKit, TypeScript, and Tailwind CSS. It communicates with the Rails backend via a JSON API.

## Technology Stack

### Core Framework
- **SvelteKit** - Full-stack framework with file-based routing
- **Svelte 4** - Reactive component framework
- **TypeScript** - Type safety throughout the application
- **Vite** - Build tool with fast HMR

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Custom Dark Theme** - Matching the original bŏs design system
- **PostCSS** - CSS processing

### Data Management
- **@tanstack/svelte-query** - Server state management
- **Svelte Stores** - Client state management
- **JWT Authentication** - Secure API communication

### Development Tools
- **ESLint v9** - Flat config with TypeScript/Svelte support
- **Prettier** - Code formatting
- **Playwright** - E2E testing
- **TypeScript** - Static type checking

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/         # Basic UI elements
│   │   │   ├── forms/      # Form components
│   │   │   └── layouts/    # Layout components
│   │   ├── stores/         # Svelte stores
│   │   │   ├── auth.ts     # Authentication state
│   │   │   └── ui.ts       # UI state (modals, etc.)
│   │   ├── api/            # API client functions
│   │   │   ├── client.ts   # Base API client
│   │   │   ├── auth.ts     # Auth endpoints
│   │   │   └── resources/  # Resource-specific APIs
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── routes/             # SvelteKit pages/routes
│   │   ├── +layout.svelte  # Root layout
│   │   ├── +page.svelte    # Home page
│   │   ├── login/          # Auth pages
│   │   └── (app)/          # Authenticated app routes
│   ├── app.css             # Global styles & Tailwind
│   ├── app.html            # HTML template
│   └── app.d.ts            # Global type definitions
├── static/                 # Static assets
├── tests/                  # Playwright E2E tests
└── Configuration files...
```

## Key Architectural Decisions

### 1. SvelteKit over Plain Svelte
- **Reasoning**: File-based routing, SSR capabilities, built-in optimizations
- **Benefits**: Better SEO, faster initial loads, simpler routing

### 2. TypeScript Everywhere
- **Reasoning**: Catch errors at compile time, better IDE support
- **Implementation**: Strict mode enabled, all components use TypeScript

### 3. Tailwind CSS
- **Reasoning**: Rapid development, consistent spacing/colors, small bundle size
- **Configuration**: Custom theme matching bŏs design system

### 4. @tanstack/svelte-query
- **Reasoning**: Powerful caching, background refetching, optimistic updates
- **Usage**: All API calls go through query/mutation hooks

### 5. JWT Authentication
- **Reasoning**: Stateless, works well with API architecture
- **Storage**: Secure httpOnly cookies (implemented)

## Component Guidelines

### Basic Component Template
```svelte
<!-- src/lib/components/ui/Card.svelte -->
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  
  // Props with TypeScript
  export let title: string;
  export let description: string = '';
  export let variant: 'default' | 'highlighted' = 'default';
  
  // Computed classes
  $: cardClasses = {
    default: 'bg-dark-200 border-dark-400',
    highlighted: 'bg-dark-300 border-blue-500'
  }[variant];
</script>

<div class="rounded-lg border p-4 {cardClasses}">
  <h3 class="text-lg font-semibold text-text-primary">{title}</h3>
  {#if description}
    <p class="mt-2 text-text-secondary">{description}</p>
  {/if}
  <slot />
</div>
```

### Form Component with Validation
```svelte
<!-- src/lib/components/forms/ClientForm.svelte -->
<script lang="ts">
  import { createForm } from 'svelte-forms-lib';
  import * as yup from 'yup';
  import type { Client } from '$lib/types';
  
  export let client: Partial<Client> = {};
  export let onSubmit: (values: Client) => Promise<void>;
  
  const { form, errors, handleChange, handleSubmit } = createForm({
    initialValues: {
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || ''
    },
    validationSchema: yup.object({
      name: yup.string().required('Name is required'),
      email: yup.string().email('Invalid email').required('Email is required'),
      phone: yup.string()
    }),
    onSubmit
  });
</script>

<form on:submit|preventDefault={handleSubmit}>
  <!-- Form fields -->
</form>
```

## State Management

### Local Component State
```svelte
<script lang="ts">
  // Simple local state
  let isOpen = false;
  let searchQuery = '';
  
  // Reactive statements
  $: filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>
```

### Global State with Stores
```typescript
// src/lib/stores/auth.ts
import { writable, derived } from 'svelte/store';
import type { User } from '$lib/types';

function createAuthStore() {
  const { subscribe, set, update } = writable<{
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
  }>({
    user: null,
    token: null,
    isAuthenticated: false
  });

  return {
    subscribe,
    login: (user: User, token: string) => {
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      set({ user: null, token: null, isAuthenticated: false });
    }
  };
}

export const auth = createAuthStore();
export const currentUser = derived(auth, $auth => $auth.user);
```

### Server State with Query
```typescript
// src/lib/api/clients.ts
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { api } from '$lib/api/client';

export const clientsQuery = () => 
  createQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients')
  });

export const createClientMutation = () => {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: (data: CreateClientData) => api.post('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });
};
```

## Routing

### File-based Routes
```
src/routes/
├── +page.svelte              # / (home)
├── login/
│   └── +page.svelte         # /login
├── (app)/                   # Layout group (authenticated)
│   ├── +layout.svelte       # Shared layout
│   ├── clients/
│   │   ├── +page.svelte     # /clients (list)
│   │   └── [id]/
│   │       └── +page.svelte # /clients/:id (detail)
│   └── jobs/
│       ├── +page.svelte     # /jobs
│       └── new/
│           └── +page.svelte # /jobs/new
```

### Route Protection
```typescript
// src/routes/(app)/+layout.ts
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/stores/auth';
import { get } from 'svelte/store';

export function load() {
  const { isAuthenticated } = get(auth);
  
  if (!isAuthenticated) {
    throw redirect(302, '/login');
  }
}
```

## API Integration

### Base API Client
```typescript
// src/lib/api/client.ts
class ApiClient {
  private baseURL = '/api';
  
  async request(endpoint: string, options: RequestInit = {}) {
    const token = get(auth).token;
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  }
  
  get = (endpoint: string) => this.request(endpoint);
  post = (endpoint: string, data: any) => 
    this.request(endpoint, { method: 'POST', body: JSON.stringify(data) });
  // ... other methods
}

export const api = new ApiClient();
```

## Testing Strategy

### Component Testing
```typescript
// tests/components/Button.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import Button from '$lib/components/ui/Button.svelte';

test('emits click event', async () => {
  const { component, getByRole } = render(Button, {
    props: { text: 'Click me' }
  });
  
  const mockHandler = vi.fn();
  component.$on('click', mockHandler);
  
  await fireEvent.click(getByRole('button'));
  expect(mockHandler).toHaveBeenCalled();
});
```

### E2E Testing with Playwright
```typescript
// tests/e2e/clients.spec.ts
import { test, expect } from '@playwright/test';

test('create new client', async ({ page }) => {
  await page.goto('/clients');
  await page.click('text=New Client');
  
  await page.fill('[name=name]', 'Acme Corp');
  await page.fill('[name=email]', 'contact@acme.com');
  await page.click('text=Save');
  
  await expect(page.locator('text=Client created successfully')).toBeVisible();
  await expect(page.locator('text=Acme Corp')).toBeVisible();
});
```

## Performance Considerations

### Code Splitting
- SvelteKit automatically code-splits by route
- Lazy load heavy components when needed
- Use dynamic imports for conditional features

### Bundle Optimization
- Tree-shaking enabled by default
- Tailwind CSS purges unused styles
- Vite optimizes dependencies

### Caching Strategy
- Static assets cached with long TTL
- API responses cached by svelte-query
- Service worker for offline support

## Security

### XSS Prevention
- Svelte escapes content by default
- Use `{@html}` carefully and only with sanitized content

### CSRF Protection
- Include CSRF token in API requests (implemented)
- Use SameSite cookies

### Content Security Policy
- Configured in app.html
- Restricts resource loading

## Development Workflow

### Local Development
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### Type Checking
```bash
npm run check  # Runs svelte-check
```

### Linting & Formatting
```bash
npm run lint    # ESLint with flat config
npm run format  # Prettier
```

### Building
```bash
npm run build   # Production build
npm run preview # Preview production build
```

## Migration Status

This frontend is part of the ongoing migration from Rails monolith to decoupled architecture. See `migration-guide.md` for details on:
- What has been migrated
- What remains to be done
- How to contribute to the migration

## Common Patterns

### Loading States
```svelte
<script lang="ts">
  const query = clientsQuery();
</script>

{#if $query.isLoading}
  <LoadingSpinner />
{:else if $query.error}
  <ErrorMessage error={$query.error} />
{:else}
  <ClientList clients={$query.data} />
{/if}
```

### Modal Management
```svelte
<script lang="ts">
  import { modal } from '$lib/stores/ui';
  
  function openEditModal(client: Client) {
    modal.open('edit-client', { client });
  }
</script>
```

### Form Handling
```svelte
<script lang="ts">
  const mutation = createClientMutation();
  
  async function handleSubmit(values: ClientFormData) {
    try {
      await $mutation.mutateAsync(values);
      toast.success('Client created');
      goto('/clients');
    } catch (error) {
      toast.error('Failed to create client');
    }
  }
</script>
```

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)