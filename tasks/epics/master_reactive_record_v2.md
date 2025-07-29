# Master ReactiveRecord V2 Architecture Plan

## Executive Summary

Create a comprehensive data orchestration layer that combines Rails-style query expressiveness with Zero.js optimization, intelligent state management, and automatic UI complexity elimination. This architecture addresses the loading flash issues, component state pollution, and developer experience gaps identified in recent commits while maintaining the familiar Rails patterns developers expect.

**Updated based on Zero.js documentation analysis**: This plan has been significantly simplified by leveraging Zero.js's built-in capabilities for data freshness, error handling, and query lifecycle management.

## Core Architectural Pillars

### 1. **Simplified Zero.js State Coordination**
Prevent loading flashes through lightweight transition guards that focus purely on visual smoothness. Zero.js handles all data freshness and error management automatically.

### 2. **Smart ReactiveView with Auto-Detection** 
Eliminate the complexity of separate query/displayData props through automatic pattern detection and context-aware empty state management.

### 3. **Rails-Style Query Compiler with Zero.js Constraints**
Automatically compile Rails-familiar query syntax into optimal Zero.js queries while handling documented limitations (many-to-many ordering, client row limits).

### 4. **TTL-Based Multi-Query Coordination**
Leverage Zero.js's TTL and preload() systems for query coordination instead of custom dependency management. Zero.js automatic query reuse eliminates manual data sharing complexity.

### 5. **Five-State Lifecycle Management with Client Row Awareness**
Clean, predictable data states that map directly to UX patterns, with built-in monitoring for Zero.js's 20k row client limit.

---

## 🎯 **Phase 1: Simplified Zero.js State Coordination (Week 1)**

### Problem Being Solved
Recent commits (642ad91, ff6f061, 614d752, 7c1cfec6) show ongoing battles with Zero.js state transitions causing UI flashing. Components contain complex "ultra-conservative" loading logic that still doesn't prevent flashing during navigation.

### Key Insight from Zero.js Documentation
- **Zero.js data is always fresh** - "there is never any stale data in Zero"
- **Zero.js handles all errors and retries automatically** 
- **Query reuse is automatic** - data is shared between queries automatically
- **Data lifetime is controlled by query lifecycle** (active/background with TTL)

### Simplified Zero.js State Coordinator Architecture

```typescript
/**
 * Lightweight coordinator that prevents UI flashing during Zero.js state transitions
 * SIMPLIFIED: Only handles visual transitions - Zero.js manages data freshness and errors
 */
class ReactiveCoordinator {
  private transitionHistory = new Map<string, TransitionEvent[]>();
  private flashPreventionTimers = new Map<string, number>();

  /**
   * Prevent visual flashing during state transitions
   * FOCUS: Pure UI concerns, not data management
   */
  coordinateVisualTransition(
    queryId: string,
    zeroState: ZeroResultType,
    hasData: boolean,
    componentType: string
  ): VisualState {
    // Record transition for flash detection
    const history = this.transitionHistory.get(queryId) || [];
    const event = {
      from: history[history.length - 1]?.to || 'unknown',
      to: zeroState,
      hasData,
      timestamp: Date.now(),
      componentType
    };
    
    history.push(event);
    this.transitionHistory.set(queryId, history.slice(-5)); // Keep last 5 events

    // Check for navigation flash pattern
    if (this.isNavigationFlash(queryId, event)) {
      return this.holdPreviousState(queryId, 'navigation_flash_prevention');
    }

    // Check for rapid loading toggle
    if (this.isRapidLoadingToggle(queryId, event)) {
      return this.stabilizeLoadingState(queryId, 'rapid_loading_stabilization');
    }

    // Normal state mapping - much simpler since Zero.js handles data concerns
    return this.mapZeroStateToVisual(zeroState, hasData);
  }

  /**
   * Detect navigation flash: complete -> loading within 50ms
   * SIMPLIFIED: Focus only on the specific pattern causing flashes
   */
  private isNavigationFlash(queryId: string, event: TransitionEvent): boolean {
    const history = this.transitionHistory.get(queryId) || [];
    if (history.length < 2) return false;

    const previous = history[history.length - 2];
    return previous.to === 'complete' && 
           event.to === 'loading' && 
           (event.timestamp - previous.timestamp) < 50;
  }

  /**
   * Detect rapid loading toggles that cause UI instability
   */
  private isRapidLoadingToggle(queryId: string, event: TransitionEvent): boolean {
    const history = this.transitionHistory.get(queryId) || [];
    if (history.length < 3) return false;

    // Look for loading -> complete -> loading pattern within 200ms
    const last3 = history.slice(-3);
    return last3[0].to === 'loading' &&
           last3[1].to === 'complete' &&
           last3[2].to === 'loading' &&
           (last3[2].timestamp - last3[0].timestamp) < 200;
  }

  /**
   * Simple state mapping without complex cache/error management
   * Zero.js handles data freshness, we handle visual consistency
   */
  private mapZeroStateToVisual(zeroState: ZeroResultType, hasData: boolean): VisualState {
    switch (zeroState) {
      case 'complete':
        return {
          shouldShowLoading: false,
          shouldShowContent: hasData,
          shouldShowEmpty: !hasData,
          reason: hasData ? 'data_available' : 'no_data'
        };

      case 'loading':
      case 'unknown':
        return {
          shouldShowLoading: true,
          shouldShowContent: false,
          shouldShowEmpty: false,
          reason: 'loading_from_zero'
        };

      case 'error':
        // Zero.js will retry automatically, we just show error state
        return {
          shouldShowLoading: false,
          shouldShowContent: false,
          shouldShowEmpty: false,
          shouldShowError: true,
          reason: 'zero_will_retry_automatically'
        };

      default:
        return {
          shouldShowLoading: true,
          shouldShowContent: false,
          shouldShowEmpty: false,
          reason: 'unknown_state'
    }
  }

  /**
   * Helper methods for flash prevention
   */
  private holdPreviousState(queryId: string, reason: string): VisualState {
    // Hold previous visual state to prevent flash
    return {
      shouldShowLoading: false,
      shouldShowContent: true, // Keep showing previous content
      shouldShowEmpty: false,
      reason: reason,
      isHolding: true
    };
  }

  private stabilizeLoadingState(queryId: string, reason: string): VisualState {
    // Stabilize in loading state to prevent rapid toggles
    this.flashPreventionTimers.set(queryId, 
      setTimeout(() => this.flashPreventionTimers.delete(queryId), 200)
    );
    
    return {
      shouldShowLoading: true,
      shouldShowContent: false,
      shouldShowEmpty: false,
      reason: reason,
      isStabilizing: true
    };
  }
}

interface TransitionEvent {
  from: ZeroResultType | 'unknown';
  to: ZeroResultType;
  hasData: boolean;
  timestamp: number;
  componentType: string;
}

interface VisualState {
  shouldShowLoading: boolean;
  shouldShowContent: boolean;
  shouldShowEmpty: boolean;
  shouldShowError?: boolean;
  reason: string;
  isHolding?: boolean;
  isStabilizing?: boolean;
}
```

### Integration with Current ZeroDataView

```typescript
// Simplified integration - no complex state management needed
const stateCoordinator = new ReactiveCoordinator();

const visualState = $derived(stateCoordinator.coordinateVisualTransition(
  'query-' + queryId,
  query.resultType,
  query.data !== null,
  'ZeroDataView'
));

// Much simpler than current "ultra-conservative" loading logic
const isLoading = $derived(visualState.shouldShowLoading);
const hasError = $derived(visualState.shouldShowError);
const isEmpty = $derived(visualState.shouldShowEmpty);
---

## 🎯 **Phase 2: TTL-Based Multi-Query Coordination (Week 2)**

### Problem Being Solved
Your job detail page shows complex multi-query coordination with manual state management. Zero.js provides TTL and preload() methods that can handle this coordination automatically.

### Key Insight from Zero.js Documentation
- **Query lifecycle is managed by TTL** - active queries become background queries with TTL
- **Automatic query reuse** - Zero.js shares data between queries automatically
- **preload() method** - allows syncing larger queries without views for coordination scenarios
- **Data lifetime controlled by syncing queries** - no manual cache management needed

### TTL-Based Multi-Query Coordinator

```typescript
/**
 * Coordinates multiple queries using Zero.js's TTL system
 * SIMPLIFIED: Leverages Zero.js query lifecycle instead of custom dependency management
 */
class ReactiveTTLCoordinator {
  private queryRegistrations = new Map<string, QueryRegistration>();
  private preloadedQueries = new Map<string, { cleanup: () => void }>();

  /**
   * Register a query with TTL-based coordination
   */
  registerQuery<T>(
    id: string,
    queryBuilder: () => IReactiveQuery<T>,
    options: {
      ttl?: string; // Zero.js TTL format: '1d', '1h', '30m', etc.
      required?: boolean;
      preload?: boolean; // Use Zero.js preload() for coordination
    } = {}
  ): CoordinatedQuery<T> {
    
    this.queryRegistrations.set(id, {
      queryBuilder,
      options: {
        ttl: options.ttl || '1h', // Default 1 hour background
        required: options.required ?? true,
        preload: options.preload ?? false
      }
    });

    if (options.preload) {
      // Use Zero.js preload() for queries that need coordination
      const query = queryBuilder();
      const preloadCleanup = z.preload(query, { ttl: options.ttl || '1h' });
      this.preloadedQueries.set(id, { cleanup: preloadCleanup });
    }

    return new CoordinatedQuery(id, this);
  }

  /**
   * Get coordinated query that uses TTL for lifecycle management
   */
  getCoordinatedQuery<T>(queryId: string): IReactiveQuery<T> | null {
    const registration = this.queryRegistrations.get(queryId);
    if (!registration) return null;

    // Zero.js handles query reuse automatically
    // TTL ensures background queries stay active for coordination
    return registration.queryBuilder();
  }

  /**
   * Create a coordinated view that combines multiple queries
   * Uses Zero.js automatic data sharing between queries
   */
  createCombinedQuery(queryIds: string[]): CombinedQuery {
    const queries = queryIds
      .map(id => this.getCoordinatedQuery(id))
      .filter(q => q !== null);

    return new CombinedQuery(queries, {
      // Zero.js will handle data freshness across all queries
      // TTL ensures coordinated queries stay in sync
      coordinationStrategy: 'zero_ttl_based'
    });
  }
}
```

### Real-World Usage for Your Job Page

```typescript
// Instead of complex manual coordination in your job detail page
// Replace this complexity:
const jobQuery = $derived(/* complex conditional logic */);
const clientQuery = $derived(/* more complex logic */);
const isLoading = $derived(/* ultra-conservative loading logic */);

// With this TTL-based coordination:
const coordinator = new ReactiveTTLCoordinator();

// Job query with 1-day TTL for navigation performance
const jobQuery = coordinator.registerQuery('job', 
  () => ReactiveJob.includes('client').find(jobId),
  { ttl: '1d', required: true }
);

// Client query with shorter TTL, optional
const clientQuery = coordinator.registerQuery('client',
  () => ReactiveClient.find(clientId),
  { ttl: '1h', required: false }
);

// Tasks query preloaded for instant access
const tasksQuery = coordinator.registerQuery('tasks',
  () => ReactiveTask.where({ job_id: jobId }).orderBy('position'),
  { ttl: '1d', preload: true } // Preloaded for instant filtering
);

// Single coordinated state - Zero.js handles the complexity
const combinedQuery = coordinator.createCombinedQuery(['job', 'client', 'tasks']);
const data = combinedQuery.data; // { job, client, tasks }
const isLoading = combinedQuery.isLoading; // Coordinated loading state
```

### Client Row Count Monitoring

**Note: ClientRowMonitor postponed to future sprint** - Will implement comprehensive row monitoring with Zero.js 20k limit warnings and optimization suggestions in a later iteration.

---

## 🎯 **Phase 3: Rails Compiler with Zero.js Constraints (Week 3)**

### Problem Being Solved
Rails-style query compilation needs to respect Zero.js's documented limitations, particularly around many-to-many relationships and client row limits.

### Key Zero.js Constraints to Handle
- **Many-to-many relationship limitations**: `orderBy`/`limit` not supported in junction relationships
- **Client row limits**: 20k default, 100k max - need size-based query strategies
- **No aggregates yet**: COUNT, GROUP BY, HAVING not supported
- **No full-text search**: ILIKE scales linearly, need client-side alternatives

### Enhanced Rails Compiler with Constraint Detection

```typescript
/**
 * Rails-style query compiler that respects Zero.js constraints
 * UPDATED: Handles documented limitations and suggests alternatives
 */
class RailsToReactiveQueryCompiler {
  private constraintDetector = new ZeroConstraintDetector();
  // Note: ClientRowMonitor postponed to future sprint

  /**
   * Compile Rails-style query with constraint handling
   */
  compile<T>(railsQuery: RailsStyleQuery<T>): CompiledZeroQuery<T> {
    // Analyze for Zero.js constraints
    const constraints = this.constraintDetector.analyze(railsQuery);
    
    if (constraints.hasManyToManyOrdering) {
      return this.handleManyToManyOrdering(railsQuery, constraints);
    }
    
    if (constraints.hasAggregates) {
      return this.handleAggregates(railsQuery, constraints);
    }
    
    if (constraints.estimatedRowCount > 15000) {
      return this.handleLargeDataset(railsQuery, constraints);
    }
    
    // Direct compilation possible
    return this.directCompile(railsQuery);
  }

  /**
   * Handle many-to-many ordering limitation
   * Zero.js docs: "orderBy or limit in junction relationships throws runtime error"
   */
  private handleManyToManyOrdering<T>(
    railsQuery: RailsStyleQuery<T>,
    constraints: ConstraintAnalysis
  ): CompiledZeroQuery<T> {
    console.warn(
      'Many-to-many relationship ordering detected. Zero.js limitation: orderBy/limit not supported in junction relationships.'
    );
    
    // Strategy 1: Move ordering to client-side
    if (constraints.estimatedRowCount < 5000) {
      return {
        zeroQuery: this.removeJunctionOrdering(railsQuery),
        clientProcessing: this.extractOrderingLogic(railsQuery),
        strategy: 'client_side_ordering',
        warning: 'Ordering moved to client-side due to Zero.js junction limitation'
      };
    }
    
    // Strategy 2: Suggest explicit junction handling
    return {
      zeroQuery: this.makeJunctionExplicit(railsQuery),
      strategy: 'explicit_junction',
      suggestion: 'Consider making junction relationship explicit for better control'
    };
  }

  /**
   * Handle client row limit concerns
   */
  private handleLargeDataset<T>(
    railsQuery: RailsStyleQuery<T>,
    constraints: ConstraintAnalysis
  ): CompiledZeroQuery<T> {
    const estimatedRows = constraints.estimatedRowCount;
    
    if (estimatedRows > 20000) {
      throw new Error(
        `Query would exceed Zero.js client row limit (${estimatedRows} > 20000). ` +
        'Consider server-side filtering or pagination.'
      );
    }
    
    if (estimatedRows > 16000) {
      console.warn(
        `Query approaching Zero.js row limit: ${estimatedRows}/20000 rows. ` +
        'Consider optimization strategies.'
      );
    }
    
    return {
      zeroQuery: railsQuery,
      strategy: 'monitored_large_dataset',
      // Note: Row monitoring postponed to future sprint
      suggestions: this.generateOptimizationSuggestions(constraints)
    };
  }
}
```

---

## 🎯 **Updated Implementation Timeline**

### **Week 1: Simplified State Coordination**
- Build lightweight `ReactiveCoordinator` focused purely on visual flash prevention
- Remove complex error handling (Zero.js manages this)
- Integrate with existing `ZeroDataView` using simple visual state coordination

### **Week 2: TTL-Based Multi-Query Coordination**
- Replace custom dependency management with Zero.js TTL system
- Implement `ReactiveTTLCoordinator` using `preload()` for complex scenarios
- Note: Client row count monitoring postponed to future sprint

### **Week 3: Rails Compiler with Zero.js Constraints**
- Update Rails compiler (`RailsToReactiveQueryCompiler`) to handle many-to-many ordering limitations
- Add client-side processing fallbacks for unsupported features
- Note: Performance warnings for large datasets moved to future sprint

### **Week 4: Enhanced ReactiveView Integration**
- Integrate all coordination services into single `ReactiveView` component
- Simplify component API by leveraging Zero.js automatic capabilities
- Add comprehensive debugging and monitoring tools

### **Week 5: Rails Generator Enhancement**
- Update generator to respect Zero.js constraints in generated queries
- Add usage pattern analysis for TTL optimization
- Generate coordinated query classes with performance monitoring

### **Week 6: Migration & Polish**
- Create backward compatibility layer for existing `ZeroDataView`
- Build automated migration tools and documentation
- Add comprehensive performance monitoring and debugging tools

---

## 🔥 **Critical Success Factors (Updated)**

### 1. **Leverage Zero.js Built-in Capabilities**
- Never add retry logic - Zero.js handles all retries automatically
- Trust Zero.js data freshness - "there is never any stale data in Zero"
- Use TTL system for query lifecycle management instead of custom coordination

### 2. **Respect Zero.js Constraints**
- Handle many-to-many relationship ordering limitations gracefully
- Monitor and warn about 20k client row limits
- Provide fallback strategies for unsupported features

### 3. **Simplify Based on Zero.js Guarantees**
- State coordination focused purely on visual concerns
- No complex cache invalidation (Zero.js handles data freshness)
- Automatic query reuse eliminates manual data sharing complexity

### 4. **Performance Awareness**
- Client row count monitoring and optimization suggestions
- TTL-based background queries for navigation performance
- Size-based query strategy selection

This updated architecture is significantly simpler while being more robust, leveraging Zero.js's powerful built-in capabilities instead of reinventing them.
