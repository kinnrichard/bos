# Product Requirements Document: Rails + Svelte PWA Migration

## Executive Summary

This document outlines the migration of the bŏs application from a traditional Rails monolith with Hotwire/Stimulus to a modern architecture featuring a Rails API backend and Svelte PWA frontend with offline capabilities.

## Current State Analysis

### Architecture
- **Backend**: Rails 8.x with full MVC stack
- **Frontend**: Server-rendered ERB/Phlex views with Stimulus controllers
- **Interactivity**: Turbo/Hotwire for page updates
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with ActiveRecord

### Pain Points
1. **Performance**: Server round-trips for UI updates cause noticeable lag in drag-and-drop and multi-select operations
2. **DRY Violations**: Duplicate rendering logic between server (Phlex) and client (Stimulus, client-side plain JavaScript)
3. **Complexity**: Complex interactions require extensive Stimulus controllers with manual DOM manipulation
4. **UI Inconsistencies**: Dropdown/popover positioning issues in scrollable containers
5. **Limited Offline**: No offline functionality for field technicians

### Working Well
- Rails business logic and data modeling
- Authentication and authorization (Devise)
- Background job processing
- Database structure and migrations
- Overall visual design and branding

## Target Architecture

### High-Level Design
```
┌─────────────────────┐         ┌─────────────────────┐
│   Rails API         │   JWT   │   Svelte PWA        │
├─────────────────────┤  <───>  ├─────────────────────┤
│ • Business Logic    │         │ • UI Components     │
│ • Data Models       │         │ • Client Router     │
│ • Authentication    │         │ • Service Worker    │
│ • Background Jobs   │         │ • IndexedDB Cache   │
│ • WebSockets        │         │ • Offline Queue     │
└─────────────────────┘         └─────────────────────┘
```

### Technology Stack
- **Backend**: Rails 8.x (API-only mode)
- **Frontend**: Svelte 5 + Vite
- **Offline**: Service Workers + IndexedDB (via Dexie.js)
- **State Management**: Svelte stores + svelte-query
- **Styling**: Tailwind CSS (retained)
- **API Format**: JSON:API specification
- **Authentication**: JWT tokens with refresh mechanism

## Functional Requirements

### 1. Feature Parity
All existing functionality must be preserved:
- Job management (CRUD, assignment, status updates)
- Task tracking with drag-and-drop reordering
- Multi-select operations
- Real-time updates via WebSockets
- Document management
- Reporting and analytics

### 2. Offline Capabilities
- **Read Access**: Full application browsable offline
- **Create/Update**: Queue changes locally when offline
- **Sync**: Automatic background sync when connection restored
- **Conflict Resolution**: Last-write-wins with audit trail
- **Storage**: 50MB minimum offline data

### 3. UI/UX Improvements
- **Dropdowns**: Convert to macOS-style popup menus
- **Popovers**: Fixed positioning in scrollable containers
- **Performance**: < 16ms response time for all interactions
- **Animations**: Smooth 60fps transitions
- **Touch**: First-class mobile support

### 4. Progressive Enhancement
- **Install**: Add to homescreen capability
- **Updates**: Automatic app updates with user notification
- **Push**: Web push notifications for task assignments

## Non-Functional Requirements

### Performance
- **Initial Load**: < 3s on 3G connection
- **Route Changes**: < 100ms
- **API Calls**: < 200ms p95
- **Offline Detection**: < 1s

### Security
- **Authentication**: JWT with 15min access / 7day refresh tokens
- **Authorization**: Role-based with Rails Pundit policies
- **Data**: All API calls over HTTPS
- **Storage**: Encrypted IndexedDB for sensitive data

### Browser Support
- Chrome/Edge: Last 2 versions
- Safari: iOS 15+ / macOS 12+
- Firefox: Last 2 versions

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Set up Rails API-only configuration
2. Implement JWT authentication
3. Create API endpoints for existing functionality
4. Set up Svelte project with Vite
5. Implement basic routing and layout

### Phase 2: Core Features (Week 3-4)
1. Migrate Jobs views (list, detail, edit)
2. Implement drag-and-drop task management
3. Add multi-select functionality
4. Convert dropdowns to popup menus

### Phase 3: Offline Support (Week 5)
1. Implement Service Worker
2. Set up IndexedDB schema
3. Create sync queue mechanism
4. Add offline indicators

### Phase 4: Polish & Testing (Week 6)
1. Performance optimization
2. Cross-browser testing
3. Mobile responsiveness
4. Bug fixes

## Success Metrics

### Technical
- 100% feature parity with current system
- < 100ms interaction response time
- 100% offline read capability
- 95%+ successful sync rate

### Business
- No increase in user-reported issues
- Improved technician productivity in low-connectivity areas
- Reduced server load by 50%

## Risks & Mitigations

### Risk: Learning Curve
**Mitigation**: Start with simple components, provide team training

### Risk: Data Sync Conflicts
**Mitigation**: Implement robust conflict resolution with audit trails

### Risk: Bundle Size
**Mitigation**: Code splitting, lazy loading, aggressive tree shaking

## Appendix A: Component Mapping

| Current (Rails/Stimulus) | Target (Svelte) |
|-------------------------|-----------------|
| jobs/index.html.erb | routes/jobs/+page.svelte |
| jobs/_job_card.erb | lib/components/JobCard.svelte |
| stimulus/drag_controller.js | Native Svelte drag handlers |
| turbo_frame updates | Svelte store reactivity |

## Appendix B: API Design

```json
// GET /api/v1/jobs
{
  "data": [{
    "id": "1",
    "type": "jobs",
    "attributes": {
      "title": "Fix HVAC Unit",
      "status": "active",
      "priority": "high"
    },
    "relationships": {
      "technician": { "data": { "type": "users", "id": "5" } },
      "tasks": { "data": [{ "type": "tasks", "id": "10" }] }
    }
  }],
  "included": [...]
}
```

## Next Steps

1. Review and approve this PRD
2. Set up development environment
3. Create detailed technical specifications
4. Begin Phase 1 implementation

---

*Document Version: 1.0*  
*Last Updated: 2025-06-29*  
*Author: System Architect*