# ReactiveRecord V2 Architecture Plan

## Executive Summary
Create a comprehensive data orchestration layer that abstracts Zero.js complexity away from components, providing Rails-style scoped queries with clean 5-state lifecycle management. This eliminates the debugging complexity we saw in the recent commit and provides a Sandi Metz-approved separation of concerns.

## Core Architecture

### 1. Five-State Data Model
Every query operates in exactly one of these states:
- **Complete**: Fresh data, 1+ rows visible
- **CompleteAndEmpty**: Fresh data, 0 rows (truly empty for this scope)
- **CompleteButFilteredBlank**: Fresh data exists but filtered out (0 visible)
- **PartiallyLoaded**: Have some data, syncing full set from server
- **NotYetLoaded**: No data yet, waiting for server

### 2. Rails-Style Scoped Queries
```typescript
ReactivePost.all()        // Everything
ReactivePost.kept()       // WHERE discarded_at IS NULL
ReactivePost.discarded()  // WHERE discarded_at IS NOT NULL
```

### 3. ReactiveView Component
Clean, declarative API that handles all complexity:
```svelte
<ReactiveView 
  query={ReactivePost.kept()} 
  displayFilters={{ search, status }}
  strategy="progressive"
>
  {#snippet content({ data, state })}
    <!-- Components only handle presentation -->
  {/snippet}
</ReactiveView>
```

## Implementation Phases

### Phase 1: Core State Machine
- Implement 5-state detection logic from Zero.js resultType + data presence
- Create state transition management (no flashing between states)
- Build query + displayData separation architecture
- Add comprehensive TypeScript interfaces

### Phase 2: Rails-Style Scopes
- Extend ReactiveRecord models with scope methods (.all, .kept, .discarded)
- Implement scoped query builders that work with Zero.js WHERE clauses
- Create semantic empty state handling per scope
- Add chainable query methods for complex scopes

### Phase 3: ReactiveView Component
- Build declarative component API with snippet-based rendering
- Implement progressive loading strategies with intelligent timeouts
- Add display-level filtering (separate from query-level scopes)
- Create context-aware empty state messaging for CompleteButFilteredBlank

### Phase 4: Developer Experience
- Migrate existing ZeroDataView usage to new ReactiveView
- Eliminate all component-level data state logic (jobLoaded props, etc.)
- Remove debugging complexity from consuming components
- Create comprehensive documentation and migration guide

### Phase 5: Advanced Features
- Multi-query coordination (required vs optional queries)
- Smart caching and subscription management
- Performance optimization for large datasets
- Error boundary integration

## Success Metrics
1. **Zero Data Logic in Components**: Components handle only presentation, never data orchestration
2. **Eliminate Debug Code**: No more 70+ line debugging blocks in components
3. **Rails Familiarity**: Developers can use familiar .kept() and .discarded() patterns
4. **Clean State API**: Five clear states that map to specific UX patterns
5. **Application-Wide Consistency**: Single ReactiveView works for all pages except login

## Migration Strategy
- Backward compatible with existing ZeroDataView
- Gradual migration path for existing components
- Clear documentation for scope usage patterns
- Performance testing to ensure no overhead from abstraction

This architecture eliminates the complexity that infected multiple components and centralizes it in a clean, reusable ReactiveView layer that developers will love using.