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

## 🎯 **Phase 4: Client-Side Computed Properties (Week 4)**

### Problem Being Solved
ReactiveRecord models need reactive calculated fields like `in_progress_since` and `accumulated_seconds` that update automatically when underlying data changes. Currently, these calculations must be done manually in components or fetched from the server, leading to stale data and complex state management.

### Key Insight from Current Architecture
The existing ReactiveRecord system with Svelte 5 `$derived` patterns provides the perfect foundation for client-side computed properties. By leveraging the reactive query system and TTL coordination, computed properties can automatically update when their dependencies change.

### Hybrid Computed Properties Architecture

Unlike traditional Rails computed properties that are generated from schema, this system uses **hand-written, version-controlled** computed property files that are imported by the generated models.

```typescript
/**
 * Client-side computed properties with reactive dependency tracking
 * HYBRID APPROACH: Separate files imported by generated models
 */

// Generated model imports computed properties
// frontend/src/lib/models/reactive-task.ts (generated)
import { createReactiveRecord } from './base/reactive-record';
import { TaskComputedProperties } from './computed-properties/task-computed';

export const ReactiveTask = createReactiveRecord<TaskData>(ReactiveTaskConfig)
  .withComputedProperties(TaskComputedProperties);

// Hand-written computed properties file
// frontend/src/lib/models/computed-properties/task-computed.ts (version controlled)
export const TaskComputedProperties = {
  in_progress_since: {
    dependencies: ['status', 'activityLogs'] as const,
    compute: (task: TaskData): Date | null => {
      // Find when task entered in_progress status from activity logs
      const statusLogs = task.activityLogs?.filter(log => 
        log.field_name === 'status' && 
        log.new_value === 'in_progress'
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return statusLogs?.[0]?.created_at ? new Date(statusLogs[0].created_at) : null;
    }
  },

  accumulated_seconds: {
    dependencies: ['status', 'activityLogs'] as const,
    compute: (task: TaskData): number => {
      if (!task.activityLogs) return 0;
      
      let totalSeconds = 0;
      let currentStart: Date | null = null;
      
      // Calculate time spent in in_progress status from activity logs
      const statusLogs = task.activityLogs
        .filter(log => log.field_name === 'status')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      for (const log of statusLogs) {
        if (log.new_value === 'in_progress') {
          currentStart = new Date(log.created_at);
        } else if (currentStart && log.old_value === 'in_progress') {
          totalSeconds += (new Date(log.created_at).getTime() - currentStart.getTime()) / 1000;
          currentStart = null;
        }
      }
      
      // If still in progress, add time since last start
      if (currentStart && task.status === 'in_progress') {
        totalSeconds += (Date.now() - currentStart.getTime()) / 1000;
      }
      
      return totalSeconds;
    }
  },

  duration_display: {
    dependencies: ['accumulated_seconds'] as const,
    compute: (task: TaskData, computed: { accumulated_seconds: number }): string => {
      const seconds = computed.accumulated_seconds;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  }
};
```

### Enhanced ReactiveRecord Base Class

```typescript
/**
 * Extended ReactiveRecord with computed properties support
 * BUILDS ON: Existing reactive query system from Phases 1-3
 */
interface ComputedProperty<T, K = any> {
  dependencies: readonly (keyof T | string)[];
  compute: (data: T, computed?: Record<string, K>) => K;
}

interface ComputedPropertiesConfig<T> {
  [key: string]: ComputedProperty<T>;
}

class ReactiveRecordWithComputed<T extends BaseRecord> extends ReactiveRecord<T> {
  private computedProperties: ComputedPropertiesConfig<T> = {};
  
  withComputedProperties<P extends ComputedPropertiesConfig<T>>(
    properties: P
  ): ReactiveRecordWithComputed<T & { [K in keyof P]: ReturnType<P[K]['compute']> }> {
    this.computedProperties = properties;
    return this as any;
  }
  
  /**
   * Enhanced query results with computed properties
   * Uses Svelte 5 $derived for reactive computation
   */
  protected createQueryWithComputed<Q>(baseQuery: Q): Q & ComputedPropertyQuery<T> {
    return {
      ...baseQuery,
      // Add computed property access to query results
      get data() {
        const baseData = (baseQuery as any).data;
        if (!baseData) return baseData;
        
        // Apply computed properties reactively using $derived
        return $derived.by(() => {
          if (Array.isArray(baseData)) {
            return baseData.map(item => this.applyComputedProperties(item));
          }
          return this.applyComputedProperties(baseData);
        });
      }
    };
  }
  
  private applyComputedProperties(data: T): T & Record<string, any> {
    const computed: Record<string, any> = {};
    const result = { ...data };
    
    // Calculate computed properties with dependency tracking
    for (const [key, property] of Object.entries(this.computedProperties)) {
      // Check if dependencies have changed (simplified - actual implementation would use dependency tracking)
      const dependencyValues = property.dependencies.map(dep => 
        dep in computed ? computed[dep] : (data as any)[dep]
      );
      
      // Compute property value
      computed[key] = property.compute(data, computed);
      (result as any)[key] = computed[key];
    }
    
    return result;
  }
}
```

### Integration with ReactiveTTLCoordinator

```typescript
/**
 * Computed properties coordinate with TTL system for dependency management
 * BUILDS ON: Phase 2 ReactiveTTLCoordinator
 */
class ComputedPropertyCoordinator {
  /**
   * Register computed properties with TTL-based dependency tracking
   */
  registerComputedQuery<T>(
    baseQuery: IReactiveQuery<T>,
    computedProperties: ComputedPropertiesConfig<T>,
    options: { ttl?: string; refreshInterval?: number } = {}
  ): IReactiveQuery<T & Record<string, any>> {
    
    // Use ReactiveTTLCoordinator for dependency management
    const coordinator = new ReactiveTTLCoordinator();
    
    // Register base query with TTL
    coordinator.registerQuery('base', () => baseQuery, {
      ttl: options.ttl || '1h',
      required: true
    });
    
    // For properties that depend on activity logs, register separate query
    const needsActivityLogs = Object.values(computedProperties).some(prop =>
      prop.dependencies.includes('activityLogs')
    );
    
    if (needsActivityLogs) {
      coordinator.registerQuery('activityLogs', 
        () => ReactiveActivityLog.where({ entity_type: 'Task', entity_id: baseQuery.data?.id }),
        { ttl: '5m', preload: true } // Shorter TTL for activity logs
      );
    }
    
    return coordinator.createCombinedQuery(['base', 'activityLogs']);
  }
}
```

### Real-World Usage Examples

```typescript
// In Svelte component - computed properties available reactively
<script>
  import { ReactiveTask } from '$lib/models/reactive-task';
  
  export let taskId: string;
  
  // Query includes computed properties automatically
  const taskQuery = ReactiveTask.includes('activityLogs').find(taskId);
  
  // Computed properties are reactive and auto-update
  $: task = taskQuery.data;
  $: inProgressSince = task?.in_progress_since;
  $: accumulatedTime = task?.accumulated_seconds;
  $: durationDisplay = task?.duration_display;
</script>

{#if task}
  <div class="task-timing">
    {#if inProgressSince}
      <p>In progress since: {inProgressSince.toLocaleString()}</p>
    {/if}
    <p>Time spent: {durationDisplay}</p>
  </div>
{/if}

// In vanilla JavaScript
const taskQuery = ReactiveTask.includes('activityLogs').find(taskId);
taskQuery.subscribe((task) => {
  if (task) {
    console.log('Time tracking:', {
      inProgressSince: task.in_progress_since,
      totalSeconds: task.accumulated_seconds,
      display: task.duration_display
    });
  }
});
```

### Rails Generator Integration

```erb
<%# Enhanced generator template %>
import { createReactiveRecord } from './base/reactive-record';
import type { <%= class_name %>Data, Create<%= class_name %>Data, Update<%= class_name %>Data } from './types/<%= file_name %>-data';
<% if has_computed_properties? -%>
import { <%= class_name %>ComputedProperties } from './computed-properties/<%= file_name %>-computed';
<% end -%>

export const Reactive<%= class_name %> = createReactiveRecord<<%= class_name %>Data>(Reactive<%= class_name %>Config)
<% if has_computed_properties? -%>
  .withComputedProperties(<%= class_name %>ComputedProperties);
<% else -%>
;
<% end -%>
```

### Performance Optimizations

```typescript
/**
 * Performance-aware computed properties with caching and selective computation
 * INTEGRATES WITH: Existing performance monitoring from all phases
 */
class PerformanceAwareComputedProperties {
  private computeCache = new Map<string, { value: any; dependencies: any[]; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  
  computeWithCaching<T>(
    key: string,
    data: T,
    property: ComputedProperty<T>,
    computed: Record<string, any>
  ): any {
    const cacheKey = `${key}-${JSON.stringify(data.id)}`;
    const cached = this.computeCache.get(cacheKey);
    
    // Check if cache is valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      const currentDeps = property.dependencies.map(dep => 
        dep in computed ? computed[dep] : (data as any)[dep]
      );
      
      // Use cache if dependencies haven't changed
      if (JSON.stringify(currentDeps) === JSON.stringify(cached.dependencies)) {
        return cached.value;
      }
    }
    
    // Compute new value
    const value = property.compute(data, computed);
    const dependencies = property.dependencies.map(dep => 
      dep in computed ? computed[dep] : (data as any)[dep]
    );
    
    // Cache result
    this.computeCache.set(cacheKey, {
      value,
      dependencies,
      timestamp: Date.now()
    });
    
    return value;
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

### **Week 4: Enhanced ReactiveView Integration + Computed Properties Foundation**
- Integrate all coordination services into single `ReactiveView` component
- Simplify component API by leveraging Zero.js automatic capabilities
- **NEW: Implement computed properties base architecture**
  - Extend ReactiveRecord base class with `withComputedProperties()` method
  - Create computed property dependency tracking system
  - Integrate with existing Svelte 5 `$derived` patterns
- Add comprehensive debugging and monitoring tools for reactive coordination and computed properties

### **Week 5: Rails Generator Enhancement + Computed Properties Integration**
- Update generator to respect Zero.js constraints in generated queries
- **NEW: Enhance Rails generator for computed properties**
  - Add computed properties import detection to generator templates
  - Create computed-properties/ directory structure
  - Generate example computed property files for common patterns
- Add usage pattern analysis for TTL optimization
- Generate coordinated query classes with performance monitoring
- **NEW: Implement ComputedPropertyCoordinator** for TTL-based dependency management

### **Week 6: Migration & Polish + Computed Properties Examples**
- Create backward compatibility layer for existing `ZeroDataView`
- Build automated migration tools and documentation
- **NEW: Create Task model computed properties examples**
  - Implement `in_progress_since` and `accumulated_seconds` calculations
  - Add comprehensive test coverage for computed properties
  - Create migration guide for existing models to use computed properties
- Add comprehensive performance monitoring and debugging tools
- **NEW: Performance optimization for computed properties** with caching and selective computation

---

## 🔥 **Critical Success Factors (Updated)**

### 1. **Leverage Zero.js Built-in Capabilities**
- Never add retry logic - Zero.js handles all retries automatically
- Trust Zero.js data freshness - "there is never any stale data in Zero"
- Use TTL system for query lifecycle management instead of custom coordination
- **NEW: Computed properties leverage Zero.js reactive updates** for automatic recalculation

### 2. **Respect Zero.js Constraints**
- Handle many-to-many relationship ordering limitations gracefully
- Monitor and warn about 20k client row limits
- Provide fallback strategies for unsupported features
- **NEW: Computed properties respect Zero.js data lifecycle** and integrate with TTL coordination

### 3. **Simplify Based on Zero.js Guarantees**
- State coordination focused purely on visual concerns
- No complex cache invalidation (Zero.js handles data freshness)
- Automatic query reuse eliminates manual data sharing complexity
- **NEW: Computed properties use Svelte 5 `$derived`** for reactive calculation without manual state management

### 4. **Performance Awareness**
- Client row count monitoring and optimization suggestions (postponed to future sprint)
- TTL-based background queries for navigation performance
- Size-based query strategy selection
- **NEW: Computed properties performance optimization**
  - Dependency-based caching to avoid unnecessary recalculation
  - Selective computation - only calculate accessed properties
  - Integration with existing performance monitoring systems

### 5. **Computed Properties Design Principles** *(NEW)*
- **Hand-written, version-controlled**: Computed property logic lives in separate TypeScript files, not generated code
- **Reactive by design**: Automatic updates when dependencies change using Svelte 5 patterns
- **Type-safe**: Full TypeScript support with IntelliSense for computed properties
- **Performance-first**: Caching and dependency tracking prevent expensive recalculations
- **Rails-compatible**: Familiar API patterns that feel natural to Rails developers
- **Zero.js integrated**: Computed properties coordinate with TTL system and respect Zero.js constraints

This updated architecture is significantly simpler while being more robust, leveraging Zero.js's powerful built-in capabilities instead of reinventing them.

---

## 📋 **Updated Classes List - All Phases**

### **Core Classes (Phases 1-4)**

1. **ReactiveCoordinator** (Phase 1)
   - Lightweight coordinator that prevents UI flashing during Zero.js state transitions

2. **ReactiveTTLCoordinator** (Phase 2)
   - Coordinates multiple queries using Zero.js's TTL system and preload() methods

3. **CombinedQuery** (Phase 2)
   - Combines multiple queries into a single coordinated view using TTL management

4. **RailsToReactiveQueryCompiler** (Phase 3)
   - Compiles Rails-style queries while respecting Zero.js constraints and limitations

5. **ZeroConstraintDetector** (Phase 3)
   - Analyzes queries for Zero.js constraints and provides fallback strategies

6. **ReactiveRecordWithComputed** *(NEW - Phase 4)*
   - Extended ReactiveRecord base class with computed properties support
   - Provides `withComputedProperties()` method for adding reactive calculations

7. **ComputedPropertyCoordinator** *(NEW - Phase 4)*
   - Coordinates computed properties with TTL system for dependency management
   - Integrates with ReactiveTTLCoordinator for optimal performance

8. **PerformanceAwareComputedProperties** *(NEW - Phase 4)*
   - Performance optimization for computed properties with caching and selective computation
   - Provides dependency-based caching to avoid unnecessary recalculations

### **Supporting Interfaces & Types (Phase 4)**

- **ComputedProperty<T, K>**: Interface for defining computed property with dependencies and compute function
- **ComputedPropertiesConfig<T>**: Configuration object for multiple computed properties
- **ComputedPropertyQuery<T>**: Enhanced query interface that includes computed properties

### **Real-World Implementation Example**

The Task model computed properties demonstrate the full system integration:
- `TaskComputedProperties` defines `in_progress_since`, `accumulated_seconds`, and `duration_display`
- Properties are hand-written in version-controlled files, not generated
- Full integration with existing ReactiveRecord, TTL coordination, and Svelte 5 reactive patterns
- Automatic updates when activity logs or task status changes

This comprehensive system provides a complete reactive data orchestration layer that eliminates UI flashing, coordinates complex queries, respects Zero.js constraints, and enables powerful client-side computed properties - all while maintaining Rails-familiar API patterns.
