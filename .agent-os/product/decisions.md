# Product Decisions Log

> Last Updated: 2025-07-21
> Version: 1.0.0
> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-07-21: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Tech Lead, Team

### Decision

Build bŏs as a flexible work management platform targeting IT service providers initially but designed for broader service team adoption. Focus on real-time collaboration, client relationship management, and task coordination with seamless Microsoft 365 integration planned.

### Context

The IT service management market is underserved by either overly complex enterprise tools or inadequate small business solutions. However, feedback indicates strong demand from non-IT service teams for a flexible CRM/task management solution. By building with flexibility in mind, we can capture both markets.

### Alternatives Considered

1. **Pure IT PSA Tool**
   - Pros: Focused market, clear requirements, established category
   - Cons: Limited growth potential, heavy competition, complex features

2. **Generic Project Management Tool**
   - Pros: Huge market, broad appeal, simpler requirements
   - Cons: Crowded space, harder differentiation, less value per user

3. **Industry-Specific Versions**
   - Pros: Targeted solutions, premium pricing, clear value prop
   - Cons: Higher development cost, fragmented market, harder to maintain

### Rationale

The flexible platform approach allows us to start with IT (where we have domain expertise) while keeping architecture open for other verticals. Real-time sync via Zero.js provides clear differentiation, and the modern tech stack enables rapid iteration.

### Consequences

**Positive:**
- Larger addressable market beyond IT services
- Flexibility attracts diverse service teams
- Modern architecture enables quick pivots
- Real-time features provide competitive advantage

**Negative:**
- More complex to message and position
- Feature prioritization across user types
- Need to maintain flexibility without feature bloat

## 2025-07-21: Technology Stack Selection

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, Development Team

### Decision

Use Ruby on Rails 8 API + SvelteKit + Zero.js as the core technology stack, moving away from the legacy Phlex-based Rails views to a pure SPA/PWA architecture.

### Context

The initial implementation used Phlex components for Rails views, but this approach limited interactivity and real-time capabilities. The team found greater productivity and user satisfaction with the SPA approach using SvelteKit.

### Alternatives Considered

1. **Full Rails with Hotwire**
   - Pros: Single framework, good Rails integration, simpler deployment
   - Cons: Limited real-time capabilities, less interactive UI, harder mobile support

2. **Next.js + Node.js Backend**
   - Pros: Full JavaScript stack, large ecosystem, good performance
   - Cons: Team lacks Node.js backend expertise, Rails provides better conventions

3. **Rails + React**
   - Pros: Popular combination, large talent pool, extensive libraries
   - Cons: More complex than Svelte, larger bundle sizes, steeper learning curve

### Rationale

Rails provides excellent backend conventions and developer productivity. Svelte offers superior developer experience and smaller bundle sizes compared to React. Zero.js solves the real-time sync challenge elegantly without building custom WebSocket infrastructure.

### Consequences

**Positive:**
- Exceptional developer productivity with Rails + Svelte
- Built-in real-time capabilities via Zero.js
- Smaller frontend bundle sizes
- Clear separation of concerns (API/SPA)

**Negative:**
- Smaller Svelte ecosystem vs React
- Two separate deployment targets
- Need to maintain API versioning

## 2025-07-21: Real-time Sync Architecture

**ID:** DEC-003
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, Backend Team, Frontend Team

### Decision

Implement Zero.js as the primary real-time synchronization layer, with PostgreSQL as the upstream database and custom mutations for complex business logic.

### Context

Real-time collaboration is a key differentiator. Building custom WebSocket infrastructure would be time-consuming and error-prone. Zero.js provides battle-tested sync with offline support and conflict resolution.

### Alternatives Considered

1. **Custom WebSocket with Action Cable**
   - Pros: Full control, Rails native, no external dependencies
   - Cons: Complex to build, no offline support, conflict resolution challenges

2. **Supabase Realtime**
   - Pros: PostgreSQL native, good developer experience, built-in auth
   - Cons: Vendor lock-in, less flexible, additional service to manage

3. **Firebase/Firestore**
   - Pros: Mature solution, good SDK, proven scale
   - Cons: NoSQL (major rewrite), Google dependency, pricing concerns

### Rationale

Zero.js provides the best balance of features, developer experience, and architectural fit. It works with our existing PostgreSQL database, provides offline-first capabilities, and handles conflict resolution automatically. The custom mutations feature allows us to implement complex business logic while maintaining real-time sync.

### Consequences

**Positive:**
- Instant UI updates across all clients
- Offline-first architecture built-in
- Automatic conflict resolution
- Reduced backend complexity for real-time features

**Negative:**
- Additional service to run (Zero server)
- Learning curve for Zero concepts
- Some constraints on data modeling
- Dependency on external technology