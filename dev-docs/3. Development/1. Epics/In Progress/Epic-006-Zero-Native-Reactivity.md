# Epic-006: Zero Native Reactivity Integration

**Epic ID:** Epic-006  
**Priority:** High  
**Epic Type:** Technical Performance Enhancement  
**Estimated Effort:** 1 sprint  
**Status:** Planning  

## Executive Summary

Replace inefficient polling-based reactivity with Zero's native `addListener` event system to eliminate performance bottlenecks and provide true real-time updates. This epic leverages Zero's built-in reactivity capabilities discovered through architectural research, delivering immediate performance improvements while establishing the foundation for optimal Zero + Svelte 5 integration patterns.

## Strategic Rationale

### Why Zero Native Reactivity?
- **Performance Optimization**: Eliminate CPU-intensive polling that processes 148 jobs every 5 seconds
- **True Real-time Updates**: Leverage Zero's WebSocket-driven change notifications for instant UI updates
- **Architectural Correctness**: Use Zero's intended integration patterns instead of workarounds
- **Developer Experience**: Cleaner, more maintainable code with better performance characteristics
- **Future-Proofing**: Establish patterns for all future Zero integrations

### Business Value
- **Improved User Experience**: Instant real-time updates without performance lag
- **Reduced Resource Usage**: Significant CPU and memory usage reduction
- **Technical Debt Reduction**: Remove polling anti-patterns from codebase
- **Development Velocity**: Simplified reactivity patterns for future features

## Current State Analysis

### Performance Issues Discovered
- **Jobs Page Polling**: 5-second intervals processing all 148 jobs repeatedly
- **CPU Overhead**: Constant job transformation and comparison operations
- **Memory Pressure**: Continuous object creation and garbage collection
- **Console Pollution**: Excessive logging from repeated operations
- **Inefficient Architecture**: Custom polling when Zero provides native reactivity

### Research Findings
Through systematic architectural investigation, we discovered Zero's native reactivity system:

```javascript
// Zero's Native Reactivity API (Discovered)
const view = query.materialize();
const removeListener = view.addListener((newData) => {
    // Real-time data updates without polling
    console.log('🔥 ZERO DATA CHANGED! New count:', newData?.length || 0);
});

// Synchronous data access
const currentData = view.data; // Not a promise!
```

### Technical Debt Assessment
- **Polling-based `createReactiveQuery`**: 50+ lines of complex timing and retry logic
- **Manual State Synchronization**: Svelte reactivity fighting against getter-based object properties
- **Performance Anti-patterns**: 148 transformations per polling cycle
- **Resource Waste**: Zero's built-in reactivity unused

## Target State Vision

### Zero-Native Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Svelte 5      │    │   Zero Client   │    │   WebSocket     │
│                 │    │                 │    │                 │
│ - $state runes  │◄──►│ - addListener   │◄──►│ - Real-time     │
│ - Event-driven  │    │ - Event system  │    │ - Data sync     │
│ - No polling    │    │ - Native hooks  │    │ - Change events │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Capabilities
- **Event-Driven Updates**: Zero's `addListener` provides instant change notifications
- **Synchronous Data Access**: `view.data` eliminates async complexity
- **Automatic Cleanup**: Listener returns cleanup function for memory management
- **WebSocket Integration**: Leverages Zero's existing real-time infrastructure
- **Svelte 5 Compatibility**: Native integration with Svelte 5 reactivity system

## Technical Objectives

### Primary Goals
1. **Eliminate All Polling**: Replace interval-based updates with event-driven architecture
2. **Implement Native Reactivity**: Use Zero's `addListener` for all data changes
3. **Optimize Performance**: Achieve measurable CPU and memory usage reduction
4. **Maintain Functionality**: Zero regression in existing real-time behavior
5. **Establish Patterns**: Create reusable integration patterns for future development

### Success Metrics
- **Zero polling intervals** remaining in codebase
- **CPU usage reduction** of 60%+ during idle states
- **Memory pressure reduction** measurable via browser dev tools
- **Real-time latency improvement** to <50ms for data changes
- **All existing functionality** preserved without regression

## Implementation Strategy

### Phase 1: Core Reactivity Implementation (Sprint 1 - Week 1)
**Update `createReactiveQuery` Function**
- Replace polling-based implementation with `view.addListener`
- Implement synchronous data access via `view.data`
- Add proper cleanup with returned unsubscribe function
- Remove complex retry and timing logic

**Jobs Page Optimization**
- Remove 5-second polling interval completely
- Implement proper Svelte 5 reactive patterns
- Add immediate state updates on Zero changes
- Clean up console logging

### Phase 2: Generator & Validation (Sprint 1 - Week 2)
**Rails Generator Update**
- Update mutation generator to produce optimized `createReactiveQuery`
- Regenerate all Zero model files with native reactivity
- Validate generated code follows new patterns
- Remove polling patterns from generator templates

**Performance Validation**
- Benchmark CPU usage before/after implementation
- Validate real-time functionality preserved
- Test memory usage improvements
- Confirm all Playwright tests pass

## Story Breakdown

### Epic-006-Story-001: Custom `fZero` Rune Implementation
**Acceptance Criteria:**
- [x] Create `frontend/src/lib/zero/runes.ts` with custom `fZero` rune
- [x] Rune uses `$effect` for external subscriptions (NOT `onMount`)
- [x] Uses Zero's native `view.addListener` instead of polling
- [x] Returns cleanup function from `$effect` for memory management
- [x] Provides `data`, `isLoading`, and `error` state via getters
- [x] Function provides immediate data via `view.data` (synchronous)
- [x] All retry and timing logic removed from implementation

**Estimated Effort:** 3 story points

### Dev Agent Record (Epic-006-Story-001)

**Agent Model Used:** Sonnet 4 (claude-sonnet-4-20250514)

**Status:** Ready for Review

**Debug Log References:**
- Successfully implemented custom `fZero` rune with native Zero addListener
- Validated TypeScript compilation passes without errors
- Build process completed successfully with warnings only from existing code
- Test framework setup completed (unit tests pass syntax validation)

**Completion Notes:**
- Implemented both `fZero` and `fZeroOne` runes for array and single record queries
- Used proper Svelte 5 patterns: `$effect` for subscriptions, `$state` for reactive state
- Eliminated all polling, retry, and timing logic from implementation
- Zero's native `view.addListener` provides real-time updates with automatic cleanup
- Synchronous data access via `view.data` eliminates async complexity
- Memory management handled via cleanup function returned from `$effect`

**File List:**
- `frontend/src/lib/zero/runes.ts` (created) - Custom Zero reactive runes
- `frontend/src/lib/zero/runes.test.ts` (created) - Comprehensive test suite

**Change Log:**
- 2025-07-11: Created zero native reactivity runes implementing Epic-006-Story-001 requirements
- 2025-07-11: Added comprehensive test coverage for rune functionality
- 2025-07-11: Validated TypeScript compilation and build process

### Epic-006-Story-002: Jobs Page Svelte 5 Migration
**Acceptance Criteria:**
- [ ] Jobs page uses custom `fZero` rune (NOT `onMount` patterns)
- [ ] Data transformation uses `$derived` (NOT imperative updates)
- [ ] All polling intervals removed from jobs page
- [ ] Uses `$effect` for side effects (NOT `onMount`/`onDestroy`)
- [ ] Console logging reduced to data change events only
- [ ] State updates happen immediately on Zero changes
- [ ] 148 jobs display instantly without transformation delays
- [ ] Implementation follows Svelte 5 idioms checklist

**Estimated Effort:** 2 story points

### Epic-006-Story-003: Rails Generator Svelte 5 Integration
**Acceptance Criteria:**
- [ ] Generator updated to recommend custom `fZero` rune pattern
- [ ] Generated documentation shows Svelte 5 idiomatic usage examples
- [ ] ActiveRecord-style methods work seamlessly with `fZero` rune
- [ ] Generated code follows Svelte 5 performance patterns
- [ ] Old polling patterns removed from generated documentation
- [ ] Future generated files include Svelte 5 usage examples
- [ ] Generator produces TypeScript compatible with custom rune pattern

**Estimated Effort:** 3 story points

### Epic-006-Story-004: Performance Validation & Documentation
**Acceptance Criteria:**
- [ ] CPU usage benchmarked and improved by 60%+
- [ ] Memory usage improvement documented
- [ ] Real-time latency measured and optimized
- [ ] All Playwright tests pass without regression
- [ ] Integration patterns documented for future use

**Estimated Effort:** 2 story points

## Risk Assessment & Mitigation

### High Risks
1. **Breaking existing functionality**: Zero's event system behaves differently than polling
   - *Mitigation*: Comprehensive testing, gradual rollout, maintain existing test coverage
2. **Svelte 5 integration complexity**: Reactive patterns may not integrate smoothly
   - *Mitigation*: Architectural research completed, solution validated in console

### Medium Risks
1. **Memory leaks**: Event listeners may not clean up properly
   - *Mitigation*: Proper cleanup functions, memory usage monitoring
2. **Zero version compatibility**: Future Zero updates may change API
   - *Mitigation*: Document API usage, version pinning, compatibility testing

### Low Risks
1. **Performance regression**: Native approach could be slower than expected
   - *Mitigation*: Benchmarking before implementation, rollback plan available

## Dependencies

### External Dependencies
- Zero client version `@rocicorp/zero@0.21.2025070200` with `addListener` API
- Svelte 5 reactivity system for integration
- WebSocket connection stability

### Internal Dependencies
- Existing Zero model generator infrastructure
- Current Playwright test suite for validation
- Jobs page implementation as test case

## Success Criteria

### Technical Success
- [ ] Zero polling intervals in entire codebase
- [ ] Native Zero `addListener` used for all data changes
- [ ] CPU usage reduced by 60%+ during normal operation
- [ ] Memory pressure measurably improved
- [ ] All existing functionality preserved

### Performance Success
- [ ] Jobs page loads instantly (<100ms to first content)
- [ ] Real-time updates appear within 50ms of Zero changes
- [ ] Console output reduced to meaningful change events only
- [ ] Browser performance tools show CPU/memory improvements

### Developer Experience Success
- [ ] Cleaner, more maintainable reactivity code
- [ ] Reusable patterns established for future Zero integrations
- [ ] Generator produces optimal code automatically
- [ ] Clear documentation of integration patterns

## Acceptance Criteria

### Epic Complete When:
1. **Zero polling intervals** remain in the codebase
2. **All Zero queries** use native `addListener` for reactivity
3. **Performance improvements** documented and measured
4. **Existing functionality** preserved without regression
5. **Generator updated** to produce optimal patterns
6. **Integration patterns** documented for future development
7. **All tests passing** with improved performance characteristics

## Architectural Research Summary

### Discovery Process
Through systematic console investigation, we discovered Zero's native reactivity capabilities:

```javascript
// Key Discovery: Zero View Object API
console.log('View prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(view)));
// Result: ['constructor', 'data', 'addListener', 'destroy', 'push', 'flush', 'updateTTL']

// Validated Working Pattern
const removeListener = view.addListener((data) => {
    console.log('🔥 ZERO DATA CHANGED! New count:', data?.length || 0);
});
```

### Technical Validation
- **`addListener(callback)`**: Takes single callback function, returns cleanup function
- **`view.data`**: Synchronous property (not Promise), provides current data
- **Event-driven**: Callback fires immediately and on every data change
- **Memory Management**: Cleanup function prevents memory leaks

### Integration Strategy Confirmed
```typescript
// Optimal Svelte 5 + Zero Integration Pattern (Custom Rune)
export function fZero<T>(queryBuilder: any, defaultValue: T[] = [] as T[]) {
  let data = $state(defaultValue);
  let isLoading = $state(true);
  let error = $state<Error | null>(null);
  
  // ✨ USE $effect FOR EXTERNAL SUBSCRIPTIONS (NOT onMount)
  $effect(() => {
    try {
      const view = queryBuilder.materialize();
      
      const removeListener = view.addListener((newData: T[]) => {
        data = newData || defaultValue;
        isLoading = false;
        error = null;
      });
      
      // ✨ CLEANUP RETURNED FROM $effect - SVELTE 5 IDIOMATIC
      return () => {
        removeListener();
        view.destroy();
      };
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      isLoading = false;
    }
  });
  
  return {
    get data() { return data; },
    get isLoading() { return isLoading; },
    get error() { return error; }
  };
}
```

## Svelte 5 Implementation Patterns

### CRITICAL: Use Proper Svelte 5 Idioms

**⚠️ AVOID Svelte 4 Patterns:**
```svelte
<!-- ❌ DON'T USE onMount for external subscriptions -->
<script>
  let data = $state([]);
  
  onMount(() => {
    const view = query.materialize();
    // This is Svelte 4 thinking!
  });
</script>
```

**✅ CORRECT Svelte 5 Patterns:**

#### 1. Custom Rune Approach (Recommended)
```typescript
// frontend/src/lib/zero/runes.ts
export function fZero<T>(queryBuilder: any, defaultValue: T[] = [] as T[]) {
  let data = $state(defaultValue);
  let isLoading = $state(true);
  let error = $state<Error | null>(null);
  
  $effect(() => {
    const view = queryBuilder.materialize();
    const removeListener = view.addListener((newData: T[]) => {
      data = newData || defaultValue;
      isLoading = false;
      error = null;
    });
    
    return () => {
      removeListener();
      view.destroy();
    };
  });
  
  return { get data() { return data; }, get isLoading() { return isLoading; }, get error() { return error; } };
}
```

#### 2. Component Usage (Idiomatic)
```svelte
<!-- ✅ CORRECT: One-line Zero integration -->
<script lang="ts">
  import { Job } from '$lib/zero/models/job.generated';
  import { fZero } from '$lib/zero/runes';
  
  const jobsQuery = fZero(Job.all());
  
  // ✅ USE $derived FOR TRANSFORMATIONS
  const transformedJobs = $derived(
    jobsQuery.data.map(transformZeroJobToPopulatedJob)
  );
</script>

{#if jobsQuery.isLoading}
  <LoadingSkeleton />
{:else if jobsQuery.error}
  <ErrorMessage error={jobsQuery.error} />
{:else}
  {#each transformedJobs as job}
    <JobCard {job} />
  {/each}
{/if}
```

#### 3. Reactive Queries with Props
```svelte
<!-- ✅ CORRECT: Reactive to prop changes -->
<script lang="ts">
  import { Task } from '$lib/zero/models/task.generated';
  import { fZero } from '$lib/zero/runes';
  
  let { jobId }: { jobId: string } = $props();
  
  // ✅ REACTIVE QUERY - UPDATES WHEN jobId CHANGES
  let tasksQuery = $state(null);
  
  $effect(() => {
    tasksQuery = fZero(Task.where({ job_id: jobId }));
  });
  
  const tasks = $derived(tasksQuery?.data || []);
</script>
```

### Key Svelte 5 Principles for Implementation

1. **`$effect` for External Subscriptions** - NOT `onMount`/`onDestroy`
2. **Custom Runes** - Encapsulate reusable reactive logic  
3. **`$derived` for Transformations** - NOT imperative updates
4. **`$state` for Local State** - Reactive by default
5. **Automatic Cleanup** - Return cleanup functions from `$effect`

### Implementation Checklist

- [ ] Use `$effect` instead of `onMount` for Zero subscriptions
- [ ] Create custom `fZero` rune for reusable patterns
- [ ] Use `$derived` for data transformations
- [ ] Return cleanup functions from `$effect`
- [ ] Use `$props()` for component props
- [ ] Avoid mixing Svelte 4 and Svelte 5 patterns

## Notes

- This epic represents a focused performance optimization with significant architectural benefits
- Success unlocks Zero's full potential for real-time applications
- Establishes foundation patterns for all future Zero + Svelte 5 development
- Research validates that Zero's native capabilities eliminate need for custom polling solutions
- Performance improvements will be immediately visible to users and developers
- **CRITICAL**: Implementation must use proper Svelte 5 idioms to avoid technical debt