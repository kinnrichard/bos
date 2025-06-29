# bŏs Frontend Migration Guide

## Overview

This guide documents the ongoing migration from a Rails monolith with server-rendered Phlex components to a decoupled architecture with a Rails API backend and Svelte frontend.

## Migration Goals

### Primary Objectives
1. **Decouple frontend from backend** - Enable independent deployment and scaling
2. **Modernize the development experience** - Hot module replacement, TypeScript, modern tooling
3. **Improve performance** - Client-side routing, optimized bundles, better caching
4. **Enable offline functionality** - Service workers, local data persistence
5. **Maintain design consistency** - Keep the dark theme and Apple-inspired UI

### Architecture Changes
- **FROM**: Rails monolith with Phlex components and Stimulus.js
- **TO**: Rails API + Svelte SPA (separate applications)

## Migration Status

### ✅ Completed (Sprint 1)
- **SVELTE-001**: Project research and planning
- **SVELTE-002**: Migration stories documentation
- **SVELTE-003**: Svelte project setup with TypeScript, Tailwind, PWA support

### 🚧 In Progress (Sprint 2)
- **SVELTE-004**: API client setup with JWT authentication

### 📋 Planned Sprints

**Sprint 2: Core UI Components**
- SVELTE-005: Job List View
- SVELTE-006: Job Detail View  
- SVELTE-007: Drag & Drop
- SVELTE-008: Multi-Select
- SVELTE-009: Error Boundaries

**Sprint 3: Offline Support**
- SVELTE-010: Service Worker enhancement
- SVELTE-011: IndexedDB setup
- SVELTE-012: Sync Queue
- SVELTE-013: Conflict Resolution
- SVELTE-014: iOS PWA fixes

**Sprint 4: Polish & Migration**
- SVELTE-015: Performance optimization
- SVELTE-016: Component testing
- SVELTE-017: API contract testing
- SVELTE-018: E2E test suite
- SVELTE-019: Documentation
- SVELTE-020: Production deployment

## Component Migration Map

### Priority 1 - Core Features
| Rails/Phlex Component | Svelte Component | Status | Notes |
|----------------------|------------------|--------|-------|
| ClientsController#index | /clients route | Planned | List with search/filter |
| ClientCardComponent | ClientCard.svelte | Planned | Reusable component |
| JobsController#index | /jobs route | Planned | Kanban board view |
| JobCardComponent | JobCard.svelte | Planned | Draggable cards |
| SessionsController | /login route | Planned | JWT auth |

### Priority 2 - Supporting Features
| Rails/Phlex Component | Svelte Component | Status | Notes |
|----------------------|------------------|--------|-------|
| DevicesController | /devices route | Planned | Device management |
| PeopleController | /people route | Planned | Contact management |
| ReportsController | /reports route | Planned | Analytics views |

### Priority 3 - Admin Features
| Rails/Phlex Component | Svelte Component | Status | Notes |
|----------------------|------------------|--------|-------|
| Admin::UsersController | /admin/users | Planned | User management |
| Admin::SettingsController | /admin/settings | Planned | System config |

## API Development Guidelines

### Converting Controllers to API Endpoints

**Before (Rails Controller with Phlex):**
```ruby
class ClientsController < ApplicationController
  def index
    @clients = Client.active
    render Components::Clients::IndexComponent.new(clients: @clients)
  end
end
```

**After (API Controller):**
```ruby
class Api::ClientsController < Api::BaseController
  def index
    clients = Client.active
    render json: ClientSerializer.new(clients)
  end
end
```

### API Standards
1. **RESTful endpoints** - Follow REST conventions
2. **JSON:API format** - Consistent response structure
3. **JWT authentication** - Stateless auth
4. **Pagination** - Use cursor-based pagination
5. **Filtering** - Query parameters for filtering
6. **Error handling** - Consistent error responses

## Frontend Development Guidelines

### Creating New Features

1. **Start with the API** - Ensure the endpoint exists
2. **Create TypeScript types** - Define interfaces for API responses
3. **Build the Svelte component** - Use TypeScript and Tailwind
4. **Add to router** - Create the route file
5. **Write tests** - Playwright for E2E

### Example Migration Flow

**Step 1: Create API Endpoint**
```ruby
# app/controllers/api/clients_controller.rb
class Api::ClientsController < Api::BaseController
  def index
    clients = Client.includes(:jobs).page(params[:page])
    render json: {
      data: clients.map { |c| ClientSerializer.new(c) },
      meta: pagination_meta(clients)
    }
  end
end
```

**Step 2: Define TypeScript Types**
```typescript
// frontend/src/lib/types/client.ts
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  jobsCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**Step 3: Create API Function**
```typescript
// frontend/src/lib/api/clients.ts
import { api } from '$lib/api/client';
import type { Client } from '$lib/types/client';

export async function getClients(page = 1) {
  return api.get<{ data: Client[]; meta: any }>(`/clients?page=${page}`);
}
```

**Step 4: Build Svelte Component**
```svelte
<!-- frontend/src/routes/clients/+page.svelte -->
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { getClients } from '$lib/api/clients';
  import ClientCard from '$lib/components/ClientCard.svelte';
  
  const query = createQuery({
    queryKey: ['clients'],
    queryFn: () => getClients()
  });
</script>

{#if $query.isLoading}
  <div>Loading...</div>
{:else if $query.error}
  <div>Error: {$query.error.message}</div>
{:else}
  <div class="grid gap-4">
    {#each $query.data.data as client}
      <ClientCard {client} />
    {/each}
  </div>
{/if}
```

## Migration Checklist

### For Each Feature Migration

- [ ] API endpoint created and tested
- [ ] TypeScript types defined
- [ ] API client function written
- [ ] Svelte component created
- [ ] Route added to SvelteKit
- [ ] Tailwind styles applied
- [ ] Loading/error states handled
- [ ] Playwright test written
- [ ] Old Phlex component marked as deprecated
- [ ] Documentation updated

## Common Patterns

### Authentication Flow
```typescript
// Login and store JWT
const response = await api.post('/auth/login', credentials);
auth.login(response.user, response.token);

// Subsequent API calls include token automatically
const clients = await api.get('/clients'); // Token in header
```

### Data Fetching Pattern
```svelte
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  
  const query = createQuery({
    queryKey: ['resource', id],
    queryFn: fetchResource,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
</script>
```

### Form Handling Pattern
```svelte
<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query';
  
  const mutation = createMutation({
    mutationFn: createResource,
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      goto('/resources');
    }
  });
</script>
```

## Deployment Strategy

### Phase 1: Parallel Deployment (Current)
- Rails app serves both API and legacy views
- Svelte app deployed separately
- Nginx routes `/api/*` to Rails, everything else to Svelte

### Phase 2: Full Separation
- Rails becomes API-only
- Remove all Phlex components
- Remove Stimulus controllers
- Optimize Rails for API performance

### Phase 3: Independent Scaling
- Deploy Rails API to multiple instances
- CDN for Svelte static assets
- Consider serverless for API

## Rollback Plan

If issues arise during migration:

1. **Feature flags** - Toggle between old/new UI
2. **Gradual rollout** - Migrate one feature at a time
3. **Parallel running** - Keep both UIs available
4. **Quick revert** - Git tags for each migration phase

## Performance Targets

### Metrics to Maintain/Improve
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90
- Bundle Size: < 200KB (initial)

## Security Considerations

### During Migration
1. **CORS configuration** - Properly configure for API access
2. **JWT security** - Secure token storage and rotation
3. **CSP headers** - Content Security Policy for both apps
4. **API rate limiting** - Prevent abuse
5. **Input validation** - Both client and server side

## Timeline

### Estimated Completion
- Sprint 1: ✅ Complete (Foundation)
- Sprint 2: 2 weeks (Core UI)
- Sprint 3: 2 weeks (Offline)
- Sprint 4: 1 week (Polish)
- **Total: ~5 weeks**

### Milestones
1. **Week 2**: Basic CRUD operations working
2. **Week 4**: Feature parity with Rails app
3. **Week 5**: Production ready

## Getting Help

### Resources
- [SvelteKit Documentation](https://kit.svelte.dev)
- [Rails API Guide](https://guides.rubyonrails.org/api_app.html)
- [Migration Stories](../SVELTE_MIGRATION_STORIES.md)
- Frontend Architecture: [frontend-architecture.md](./frontend-architecture.md)

### Key Decisions
- **Why Svelte?** - Performance, DX, small bundle size
- **Why separate apps?** - Independent deployment, better scaling
- **Why TypeScript?** - Type safety, better IDE support
- **Why Tailwind?** - Rapid development, consistency

## Contributing

### How to Help
1. Pick a story from the backlog
2. Follow the migration checklist
3. Write comprehensive tests
4. Update documentation
5. Submit PR with clear description

### Code Review Focus
- TypeScript types correct?
- API endpoint follows standards?
- Tailwind classes used properly?
- Loading/error states handled?
- Tests comprehensive?

Remember: The goal is not just to replicate the existing UI, but to improve the user experience with modern web capabilities while maintaining the elegant, dark-themed design that makes bŏs unique.