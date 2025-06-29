# Svelte Migration User Stories

## Overview
This document breaks down the Svelte migration into implementable user stories, organized by sprint.

## Story Point Scale
- **1 point**: ~4 hours
- **2 points**: ~1 day  
- **3 points**: ~2-3 days
- **5 points**: ~1 week
- **8 points**: ~1.5 weeks

---

## Sprint 1: Foundation (13 points)

### SVELTE-001: Rails API Configuration
**Points**: 2  
**Type**: Technical  
**Priority**: Critical  

**As a** developer  
**I want** to configure Rails for API-only mode  
**So that** we can serve JSON responses efficiently

**Acceptance Criteria:**
- [ ] Add `config.api_only = true` to application.rb
- [ ] Install and configure `rack-cors` gem
- [ ] Remove view-related gems (turbo-rails, stimulus-rails)
- [ ] Set up `/api/v1` namespace
- [ ] Create health check endpoint at `/api/v1/health`
- [ ] Configure JSON serialization with `jsonapi-serializer`

**Technical Notes:**
- Keep existing models and business logic intact
- Maintain backward compatibility during transition

---

### SVELTE-002: JWT Authentication System
**Points**: 5  
**Type**: Technical  
**Priority**: Critical  
**Depends on**: SVELTE-001  

**As a** developer  
**I want** to implement JWT-based authentication  
**So that** the SPA can authenticate statelessly

**Acceptance Criteria:**
- [ ] POST `/api/v1/auth/login` returns access (15min) and refresh (7day) tokens
- [ ] POST `/api/v1/auth/refresh` exchanges refresh token for new access token
- [ ] POST `/api/v1/auth/logout` revokes refresh token
- [ ] All API endpoints validate JWT tokens
- [ ] Refresh tokens stored in database with expiry
- [ ] Error responses follow consistent format

**Technical Notes:**
```ruby
# Example response format
{
  "data": {
    "access_token": "eyJhbG...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

---

### SVELTE-003: Svelte Project Setup
**Points**: 3  
**Type**: Technical  
**Priority**: Critical  

**As a** developer  
**I want** to initialize the Svelte PWA project  
**So that** we can begin frontend development

**Acceptance Criteria:**
- [ ] Create new Svelte project with Vite
- [ ] Configure Tailwind CSS with existing design tokens
- [ ] Set up TypeScript support
- [ ] Configure path aliases (@components, @lib, etc.)
- [ ] Set up ESLint and Prettier
- [ ] Create basic folder structure
- [ ] Configure environment variables

**Technical Notes:**
```bash
frontend/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   ├── stores/
│   │   └── api/
│   ├── routes/
│   └── app.html
```

---

### SVELTE-004: API Client with Auth
**Points**: 3  
**Type**: Technical  
**Priority**: Critical  
**Depends on**: SVELTE-002, SVELTE-003  

**As a** developer  
**I want** a robust API client with automatic auth handling  
**So that** components can easily make authenticated requests

**Acceptance Criteria:**
- [ ] API client handles token storage
- [ ] Automatic token refresh on 401
- [ ] Request/response interceptors
- [ ] Proper error handling
- [ ] TypeScript interfaces for API responses
- [ ] Loading states management

**Example Usage:**
```javascript
const jobs = await api.get('/jobs');
await api.post('/jobs', { title: 'New Job' });
```

---

## Sprint 2: Core Features (21 points)

### SVELTE-005: Job List View
**Points**: 5  
**Type**: Feature  
**Priority**: High  
**Depends on**: SVELTE-004  

**As a** technician  
**I want** to see my assigned jobs  
**So that** I can manage my daily work

**Acceptance Criteria:**
- [ ] Fetch jobs from `/api/v1/jobs`
- [ ] Display job cards matching current design exactly
- [ ] Show technician avatars with initials
- [ ] Loading skeleton while fetching
- [ ] Error state with retry
- [ ] Empty state when no jobs
- [ ] Responsive grid layout

**Visual Requirements:**
- Match existing card shadows, spacing, borders
- Preserve current color scheme
- Maintain hover states

---

### SVELTE-006: Job Detail View
**Points**: 3  
**Type**: Feature  
**Priority**: High  
**Depends on**: SVELTE-005  

**As a** technician  
**I want** to view detailed job information  
**So that** I can understand the work required

**Acceptance Criteria:**
- [ ] Route to `/jobs/:id`
- [ ] Display all job fields
- [ ] Show associated tasks
- [ ] Client information panel
- [ ] Status indicators
- [ ] Actions work (drag and drop, status change)

---

### SVELTE-007: Drag & Drop Task Reordering
**Points**: 5  
**Type**: Feature  
**Priority**: High  
**Depends on**: SVELTE-006  

**As a** technician  
**I want** to reorder tasks by dragging  
**So that** I can prioritize my work efficiently

**Acceptance Criteria:**
- [ ] Smooth drag animation (60fps)
- [ ] Visual feedback during drag
- [ ] Drop zones clearly indicated
- [ ] Immediate optimistic update
- [ ] POST to `/api/v1/tasks/reorder` on drop
- [ ] Revert on server error
- [ ] Touch support for tablets

**Technical Notes:**
- Use native HTML5 drag & drop
- Consider `svelte-dnd-action` library

---

### SVELTE-008: Multi-Select Operations
**Points**: 3  
**Type**: Feature  
**Priority**: Medium  
**Depends on**: SVELTE-005  

**As a** technician  
**I want** to select multiple jobs  
**So that** I can perform bulk operations

**Acceptance Criteria:**
- [ ] Click to select/deselect
- [ ] Shift-click for range selection
- [ ] Cmd/Ctrl-click for individual selection
- [ ] Visual selection indicator

---

### SVELTE-009: macOS-Style Pop-Up Menus
**Points**: 5  
**Type**: UI Enhancement  
**Priority**: Medium  

**As a** user  
**I want** consistent, polished dropdown menus  
**So that** the interface feels professional

**Acceptance Criteria:**
- [ ] Convert all dropdowns to macOS style pop-up menus, in which the menu draws such that the currently selected item in the menu is positioned exactly where it was drawn in the button
- [ ] Backdrop blur effect
- [ ] Proper shadow and border radius
- [ ] Fixed positioning in scrollable containers
- [ ] Smooth open/close animation
- [ ] Keyboard navigation (arrow keys)
- [ ] Click outside to close
- [ ] Escape key to close

**Design Specs:**
```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(20px);
border-radius: 6px;
box-shadow: 0 4px 12px rgba(0,0,0,0.15);
```

---

## Sprint 3: Offline Support (18 points)

### SVELTE-010: Service Worker Setup
**Points**: 3  
**Type**: Technical  
**Priority**: High  

**As a** developer  
**I want** to implement a service worker  
**So that** the app works offline

**Acceptance Criteria:**
- [ ] Service worker registration
- [ ] Cache app shell on install
- [ ] Cache static assets
- [ ] Skip waiting on update
- [ ] Update notification to users

---

### SVELTE-011: Offline Read Capability
**Points**: 5  
**Type**: Feature  
**Priority**: High  
**Depends on**: SVELTE-010  

**As a** field technician  
**I want** to access jobs while offline  
**So that** I can work without internet

**Acceptance Criteria:**
- [ ] IndexedDB schema for jobs, tasks
- [ ] API responses cached after fetch
- [ ] Load from cache when offline
- [ ] Offline indicator banner
- [ ] Data freshness indicators
- [ ] 50MB storage minimum

---

### SVELTE-012: Offline Write Queue
**Points**: 5  
**Type**: Feature  
**Priority**: High  
**Depends on**: SVELTE-011  

**As a** field technician  
**I want** changes saved while offline  
**So that** they sync when connected

**Acceptance Criteria:**
- [ ] Queue changes in IndexedDB
- [ ] Visual indicator for queued changes
- [ ] Background sync on reconnect
- [ ] Conflict resolution (last-write-wins)
- [ ] Success/failure notifications
- [ ] Manual sync button

---

### SVELTE-013: PWA Manifest & Install
**Points**: 2  
**Type**: Feature  
**Priority**: Medium  
**Depends on**: SVELTE-010  

**As a** user  
**I want** to install the app on my device  
**So that** it feels like a native application

**Acceptance Criteria:**
- [ ] Web app manifest with icons
- [ ] Install prompt on supported browsers
- [ ] Splash screen configuration
- [ ] Status bar styling
- [ ] Orientation lock to portrait

---

### SVELTE-014: Data Sync Optimization
**Points**: 3  
**Type**: Technical  
**Priority**: Medium  
**Depends on**: SVELTE-012  

**As a** technician  
**I want** efficient data synchronization  
**So that** syncing is fast and reliable

**Acceptance Criteria:**
- [ ] Incremental sync (only changes)
- [ ] Compression for large payloads
- [ ] Retry logic with exponential backoff
- [ ] Sync progress indicator
- [ ] Partial sync on poor connections

---

## Sprint 4: Polish & Migration (13 points)

### SVELTE-015: Performance Optimization
**Points**: 3  
**Type**: Technical  
**Priority**: Medium  

**As a** user  
**I want** fast, responsive interactions  
**So that** the app feels native

**Acceptance Criteria:**
- [ ] Code splitting by route
- [ ] Lazy load heavy components
- [ ] Image optimization
- [ ] Bundle size < 200KB initial
- [ ] Lighthouse score > 90

---

### SVELTE-016: Migration Tooling
**Points**: 5  
**Type**: Technical  
**Priority**: High  

**As a** developer  
**I want** tools to migrate existing data  
**So that** we can switch users smoothly

**Acceptance Criteria:**
- [ ] Parallel run capability
- [ ] Data migration scripts
- [ ] Feature flags for gradual rollout
- [ ] Rollback procedure
- [ ] Migration status dashboard

---

### SVELTE-017: E2E Testing Suite
**Points**: 5  
**Type**: Testing  
**Priority**: High  

**As a** developer  
**I want** comprehensive E2E tests  
**So that** we ensure feature parity

**Acceptance Criteria:**
- [ ] Playwright test setup
- [ ] Critical path coverage
- [ ] Offline scenario tests
- [ ] Cross-browser testing
- [ ] CI/CD integration

---

## Backlog (Future Sprints)

### SVELTE-018: Push Notifications
**Points**: 5  
**Type**: Feature  
**Priority**: Low  

### SVELTE-019: Advanced Offline (Peer Sync)
**Points**: 8  
**Type**: Feature  
**Priority**: Low  

### SVELTE-020: Analytics Integration
**Points**: 3  
**Type**: Feature  
**Priority**: Low  

---

## Dependencies Graph

```
SVELTE-001 (Rails API)
    ↓
SVELTE-002 (JWT Auth)
    ↓
SVELTE-003 (Svelte Setup) → SVELTE-004 (API Client)
                                    ↓
                            SVELTE-005 (Job List)
                                    ↓
                            SVELTE-006 (Job Detail)
                                    ↓
                            SVELTE-007 (Drag & Drop)

SVELTE-010 (Service Worker) → SVELTE-011 (Offline Read) → SVELTE-012 (Offline Write)
```

---

## Risk Mitigation

1. **Feature Parity**: Run both systems in parallel initially
2. **Data Loss**: Comprehensive backup before migration
3. **Performance**: Monitor Core Web Vitals continuously
4. **Browser Support**: Progressive enhancement fallbacks