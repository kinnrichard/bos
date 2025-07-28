# ReactiveQuery: Rails-Style Auto-Compilation Architecture

## Executive Summary
Create a ReactiveQuery system that allows developers to write Rails-style queries while automatically compiling them into optimal Zero.js queries + client-side processing. This eliminates the need to manually understand Zero.js limitations while maintaining familiar Rails patterns and reactive data updates.

## The Problem

### Current Pain Points
```typescript
// Current: Manual Zero.js constraint navigation
const jobQuery = $derived(
  !isNewJobMode && jobId
    ? ReactiveJob.includes('client')
        .includes('tasks', { orderBy: ['position', 'created_at'] })  // Limited to 2 levels
        .includes('jobAssignments')
        .find(jobId)
    : null
);

// Manual state management
const isLoading = $derived(
  isNewJobMode
    ? !newJobMock && (clientQuery?.resultType === 'loading' || clientQuery?.resultType === 'unknown')
    : !job && (jobQuery?.resultType === 'loading' || jobQuery?.resultType === 'unknown')
);

// Manual client-side processing
const keptTasks = $derived(job?.tasks?.filter((t) => !t.discarded_at) || []);
const displayedTasks = $derived(job?.tasks?.filter(shouldShowTask) || []);
```

### Zero.js Limitations Developers Must Navigate
- ❌ No complex joins across multiple tables
- ❌ No aggregates (COUNT, GROUP BY, HAVING)
- ❌ No deep relationship chaining (>2 levels)
- ❌ Limited to 20k rows client-side
- ❌ No full-text search
- ❌ Basic operators only (=, !=, <, >, LIKE, IN, IS)

## The Solution: ReactiveQuery Auto-Compilation

### Developer Experience (Rails-Style)
```typescript
// Developer writes familiar Rails-style code
export class JobDetailQuery extends ReactiveQuery<JobData> {
  constructor(private jobId: string, private filters: { showDeleted?: boolean } = {}) {
    super();
  }

  scope() {
    return this.model(ReactiveJob)
      .includes('client', 'tasks', 'assignments.user')  // Deep includes - auto-split
      .where({ status: 'active' })                      // Simple conditions - to Zero.js
      .where('assignments.user_id', this.userId)        // Cross-table - to client-side
      .where('tasks.status', '!=', 'completed')         // Cross-table - to client-side
      .having('COUNT(tasks.id) > ?', 3)                 // Aggregates - to client-side
      .orderBy('client.name', 'jobs.created_at DESC')  // Cross-table order - to client-side
      .find(this.jobId);
  }
}

// Component usage (dramatically simplified)
const jobQuery = new JobDetailQuery(jobId, { showDeleted: taskFilter.showDeleted });
```

### What ReactiveQuery Compiler Generates
```typescript
// Auto-generated optimized execution plan
class JobDetailQueryCompiled {
  private reactiveQueries: {
    baseJob: IReactiveQuery<JobData | null>;
    assignments: IReactiveQuery<JobAssignmentData[]>;
    tasks: IReactiveQuery<TaskData[]>;
  };

  constructor(jobId: string, userId: string) {
    // STEP 1: Zero.js-compatible base query
    this.reactiveQueries.baseJob = ReactiveJob
      .includes('client')        // ✅ Single level OK
      .where({ status: 'active' }) // ✅ Simple where OK
      .find(jobId);

    // STEP 2: Separate simple queries for complex relationships
    this.reactiveQueries.assignments = ReactiveJobAssignment
      .includes('user')          // ✅ Single level OK
      .where({ job_id: jobId, user_id: userId }); // ✅ Simple conditions OK

    this.reactiveQueries.tasks = ReactiveTask
      .where({ job_id: jobId })  // ✅ Simple where OK
      .orderBy('position', 'asc') // ✅ Single-table order OK
      .all();
  }

  // Reactive data that auto-updates
  get data(): JobData | null {
    const job = this.reactiveQueries.baseJob.data;
    const assignments = this.reactiveQueries.assignments.data;
    const tasks = this.reactiveQueries.tasks.data;

    if (!job) return null;

    // STEP 3: Client-side processing (what Zero.js can't do)
    return this.processRailsLogic(job, assignments, tasks);
  }

  get resultType(): 'loading' | 'complete' | 'error' | 'unknown' {
    // Coordinate multiple query states
    const states = [
      this.reactiveQueries.baseJob.resultType,
      this.reactiveQueries.assignments.resultType,
      this.reactiveQueries.tasks.resultType
    ];

    if (states.some(s => s === 'error')) return 'error';
    if (states.some(s => s === 'loading' || s === 'unknown')) return 'loading';
    return 'complete';
  }

  private processRailsLogic(job: JobData, assignments: JobAssignmentData[], tasks: TaskData[]): JobData {
    // Auto-generated from Rails-style query
    const filteredTasks = tasks.filter(t => t.status !== 'completed');
    
    // Apply HAVING logic client-side
    if (filteredTasks.length <= 3) return null;

    // Attach related data
    return {
      ...job,
      tasks: filteredTasks,
      assignments: assignments.filter(a => a.job_id === job.id),
      // Apply client-side ordering by client.name
      _sortKey: job.client?.name || ''
    };
  }
}
```

## Architecture Components

### 1. ReactiveQuery Base Class
```typescript
abstract class ReactiveQuery<T> {
  protected modelType: any;
  protected singleLevelIncludes: string[] = [];
  protected complexIncludes: string[] = [];
  protected simpleWhere: WhereCondition[] = [];
  protected crossTableConditions: CrossTableCondition[] = [];
  protected clientAggregates: AggregateCondition[] = [];
  protected clientGrouping: string[] = [];
  protected singleTableOrderBy: OrderByCondition[] = [];
  protected crossTableOrderBy: OrderByCondition[] = [];

  // Rails-familiar DSL
  model(modelClass: any): this {
    this.modelType = modelClass;
    return this;
  }

  includes(...relationships: string[]): this {
    relationships.forEach(rel => {
      if (rel.includes('.')) {
        // Complex: 'assignments.user' -> Split into separate queries
        this.complexIncludes.push(rel);
      } else {
        // Simple: 'client' -> Zero.js compatible
        this.singleLevelIncludes.push(rel);
      }
    });
    return this;
  }

  where(conditions: object): this;
  where(field: string, operator: string, value: any): this;
  where(field: string, value: any): this;
  where(fieldOrConditions: string | object, operatorOrValue?: string | any, value?: any): this {
    if (typeof fieldOrConditions === 'object') {
      // Simple object conditions -> Zero.js
      Object.entries(fieldOrConditions).forEach(([key, val]) => {
        this.simpleWhere.push({ field: key, operator: '=', value: val });
      });
    } else {
      const field = fieldOrConditions;
      if (field.includes('.')) {
        // Cross-table condition -> Client-side
        this.crossTableConditions.push({
          field,
          operator: value !== undefined ? operatorOrValue : '=',
          value: value !== undefined ? value : operatorOrValue
        });
      } else {
        // Single-table condition -> Zero.js
        this.simpleWhere.push({
          field,
          operator: value !== undefined ? operatorOrValue : '=',
          value: value !== undefined ? value : operatorOrValue
        });
      }
    }
    return this;
  }

  having(condition: string, ...values: any[]): this {
    // Always client-side processing
    this.clientAggregates.push({ condition, values });
    return this;
  }

  groupBy(...fields: string[]): this {
    // Always client-side processing
    this.clientGrouping = fields;
    return this;
  }

  orderBy(...orders: string[]): this {
    orders.forEach(order => {
      const [field, direction = 'asc'] = order.split(' ');
      if (field.includes('.')) {
        // Cross-table ordering -> Client-side
        this.crossTableOrderBy.push({ field, direction });
      } else {
        // Single-table ordering -> Zero.js
        this.singleTableOrderBy.push({ field, direction });
      }
    });
    return this;
  }

  // Compile to optimized execution plan
  compile(): CompiledReactiveQuery<T> {
    const compiler = new ReactiveQueryCompiler();
    return compiler.compile(this);
  }

  // Reactive data access
  abstract get data(): T | T[] | null;
  abstract get resultType(): 'loading' | 'complete' | 'error' | 'unknown';
  abstract get error(): Error | null;
}
```

### 2. ReactiveQuery Compiler
```typescript
class ReactiveQueryCompiler {
  compile<T>(query: ReactiveQuery<T>): CompiledReactiveQuery<T> {
    const plan = this.analyzeQuery(query);
    return new CompiledReactiveQuery(plan);
  }

  private analyzeQuery<T>(query: ReactiveQuery<T>): QueryExecutionPlan {
    return {
      zeroQueries: this.extractZeroCompatibleQueries(query),
      clientProcessing: this.extractClientSideLogic(query),
      coordination: this.planQueryCoordination(query)
    };
  }

  private extractZeroCompatibleQueries<T>(query: ReactiveQuery<T>): ZeroQueryPlan[] {
    const plans: ZeroQueryPlan[] = [];

    // Base model query
    plans.push({
      model: query.modelType,
      includes: query.singleLevelIncludes,
      where: query.simpleWhere,
      orderBy: query.singleTableOrderBy,
      queryType: 'base'
    });

    // Separate queries for complex relationships
    query.complexIncludes.forEach(complexInclude => {
      const [baseRel, nestedRel] = complexInclude.split('.');
      plans.push({
        model: this.getModelForRelationship(query.modelType, baseRel),
        includes: [nestedRel],
        where: this.extractRelatedConditions(query.crossTableConditions, complexInclude),
        queryType: 'relationship',
        relationshipPath: complexInclude
      });
    });

    return plans;
  }

  private extractClientSideLogic<T>(query: ReactiveQuery<T>): ClientProcessingPlan {
    return {
      crossTableJoins: query.crossTableConditions,
      aggregates: query.clientAggregates,
      grouping: query.clientGrouping,
      crossTableSorting: query.crossTableOrderBy,
      having: query.clientAggregates.filter(agg => agg.condition.toLowerCase().includes('having'))
    };
  }
}
```

### 3. CompiledReactiveQuery Execution
```typescript
class CompiledReactiveQuery<T> {
  private zeroQueries: Map<string, IReactiveQuery<any>> = new Map();
  private processingPlan: ClientProcessingPlan;

  constructor(private plan: QueryExecutionPlan) {
    this.initializeZeroQueries();
    this.processingPlan = plan.clientProcessing;
  }

  private initializeZeroQueries(): void {
    this.plan.zeroQueries.forEach(queryPlan => {
      const zeroQuery = this.buildZeroQuery(queryPlan);
      this.zeroQueries.set(queryPlan.queryType, zeroQuery);
    });
  }

  get data(): T | T[] | null {
    // Collect data from all Zero.js queries
    const queryResults = new Map<string, any>();
    
    for (const [key, query] of this.zeroQueries) {
      const result = query.data;
      if (result === null && query.resultType === 'loading') {
        return null; // Still loading
      }
      queryResults.set(key, result);
    }

    // Apply client-side processing
    return this.processClientSideLogic(queryResults);
  }

  get resultType(): 'loading' | 'complete' | 'error' | 'unknown' {
    const states = Array.from(this.zeroQueries.values()).map(q => q.resultType);
    
    if (states.some(s => s === 'error')) return 'error';
    if (states.some(s => s === 'loading' || s === 'unknown')) return 'loading';
    return 'complete';
  }

  get error(): Error | null {
    for (const query of this.zeroQueries.values()) {
      if (query.error) return query.error;
    }
    return null;
  }

  private processClientSideLogic(queryResults: Map<string, any>): T | T[] | null {
    let result = queryResults.get('base');
    if (!result) return null;

    // Apply cross-table joins
    result = this.applyCrossTableJoins(result, queryResults);

    // Apply aggregates and filtering
    result = this.applyAggregates(result);

    // Apply grouping
    result = this.applyGrouping(result);

    // Apply cross-table sorting
    result = this.applyCrossTableSorting(result);

    return result;
  }

  private applyCrossTableJoins(baseData: any, allResults: Map<string, any>): any {
    // Implement Rails-style joins client-side
    this.processingPlan.crossTableJoins.forEach(join => {
      // Join logic based on relationship paths
    });
    return baseData;
  }

  private applyAggregates(data: any): any {
    // Implement Rails-style aggregates client-side
    this.processingPlan.aggregates.forEach(aggregate => {
      // COUNT, SUM, etc. logic
    });
    return data;
  }
}
```

## Rails Generator Integration

### Extending Your Existing Generator
```ruby
# lib/zero_schema_generator/reactive_query_generator.rb
class ReactiveQueryGenerator < Generator
  def generate_reactive_queries
    puts "🔍 Analyzing Rails models for ReactiveQuery generation..."
    
    models_data = @introspector.extract_models_with_scopes
    
    puts "🔄 Generating ReactiveQuery classes..."
    reactive_queries = build_reactive_queries(models_data)
    
    puts "📝 Writing ReactiveQuery files..."
    write_reactive_query_files(reactive_queries)
  end

  private

  def build_reactive_queries(models_data)
    models_data.map do |model|
      {
        model_name: model[:name],
        table_name: model[:table_name],
        scopes: extract_optimizable_scopes(model),
        relationships: analyze_relationships_for_splitting(model[:relationships]),
        patterns: model[:patterns]
      }
    end
  end

  def extract_optimizable_scopes(model)
    # Analyze Rails scopes for Zero.js compatibility
    model[:scopes].map do |scope|
      complexity_analysis = analyze_scope_complexity(scope)
      
      {
        name: scope[:name],
        original_sql: scope[:sql_equivalent],
        zero_compatible_parts: complexity_analysis[:zero_parts],
        client_processing_parts: complexity_analysis[:client_parts],
        optimization_strategy: determine_optimization_strategy(complexity_analysis)
      }
    end
  end

  def analyze_scope_complexity(scope)
    # Parse Rails scope to determine what can go to Zero.js vs client-side
    {
      zero_parts: extract_zero_compatible_conditions(scope),
      client_parts: extract_client_side_requirements(scope),
      relationships: analyze_relationship_complexity(scope),
      aggregates: extract_aggregates(scope)
    }
  end

  def generate_reactive_query_class(model, scopes)
    scopes.each do |scope|
      template = erb_template('reactive_query_class.ts.erb')
      
      output = template.result(binding).gsub(/\n\s*\n/, "\n") # Clean up whitespace
      
      write_file("#{@types_path}/queries/#{model[:table_name]}-queries.ts", output)
    end
  end
end
```

### Generated ReactiveQuery Classes
```typescript
// Auto-generated: frontend/src/lib/queries/job-queries.ts
// DO NOT EDIT - Generated from Rails Job model scopes

import { ReactiveQuery } from '$lib/models/base/reactive-query';
import { ReactiveJob } from '$lib/models/reactive-job';
import { ReactiveJobAssignment } from '$lib/models/reactive-job-assignment';
import { ReactiveTask } from '$lib/models/reactive-task';
import type { JobData } from '$lib/models/types/job-data';

/**
 * Generated from Rails scope: scope :active_with_tasks, -> { joins(:tasks).where(status: 'active').group(:id).having('COUNT(tasks.id) > 3') }
 */
export class ActiveJobsWithTasksQuery extends ReactiveQuery<JobData[]> {
  constructor(private filters: { userId?: string } = {}) {
    super();
  }

  scope() {
    return this.model(ReactiveJob)
      .includes('client', 'tasks', 'assignments.user')  // Auto-split: complex includes
      .where({ status: 'active' })                      // → Zero.js simple condition
      .where('assignments.user_id', this.filters.userId) // → Client-side cross-table
      .having('COUNT(tasks.id) > 3')                    // → Client-side aggregate
      .orderBy('client.name', 'created_at DESC');      // → Client-side cross-table order
  }

  emptyMessage(): string {
    return this.filters.userId 
      ? "No jobs assigned to this user with sufficient tasks"
      : "No active jobs with multiple tasks found";
  }

  filteredEmptyMessage(): string {
    return "No jobs match your current filters";
  }
}

/**
 * Generated from Rails scope: scope :recent_for_client, ->(client_id) { where(client_id: client_id, created_at: 1.week.ago..) }
 */
export class RecentClientJobsQuery extends ReactiveQuery<JobData[]> {
  constructor(private clientId: string, private weekOffset: number = 1) {
    super();
  }

  scope() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - (this.weekOffset * 7));

    return this.model(ReactiveJob)
      .includes('client')                               // → Zero.js single-level include
      .where({ 
        client_id: this.clientId,                      // → Zero.js simple condition
        created_at: { '>=': oneWeekAgo.toISOString() } // → Zero.js simple condition
      })
      .orderBy('created_at DESC');                     // → Zero.js single-table order
  }

  emptyMessage(): string {
    return `No recent jobs found for this client`;
  }
}

// Auto-generated query registry
export const JobQueries = {
  ActiveWithTasks: ActiveJobsWithTasksQuery,
  RecentForClient: RecentClientJobsQuery,
  // ... other generated queries
} as const;
```

## ReactiveView Integration

### Enhanced ReactiveView for Multi-Query Coordination
```svelte
<!-- frontend/src/lib/components/data/ReactiveView.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import LoadingSkeleton from '$lib/components/ui/LoadingSkeleton.svelte';
  import type { ReactiveQuery } from '$lib/models/base/reactive-query';

  interface Props<T> {
    query: ReactiveQuery<T>;
    content: Snippet<[{ data: T; state: DataState; isEmpty: boolean }]>;
    loading?: Snippet;
    error?: Snippet<[Error]>;
    empty?: Snippet;
    emptyMessage?: string;
    filteredEmptyMessage?: string;
  }

  let {
    query,
    content,
    loading,
    error: errorSnippet,
    empty,
    emptyMessage,
    filteredEmptyMessage,
  }: Props<unknown> = $props();

  // ReactiveQuery handles all state management internally
  const data = $derived(query.data);
  const resultType = $derived(query.resultType);
  const error = $derived(query.error);

  // 5-state model detection
  const dataState = $derived.by((): DataState => {
    if (resultType === 'error') return 'Error';
    if (resultType === 'loading' || resultType === 'unknown') return 'NotYetLoaded';
    if (resultType === 'complete') {
      if (data === null || (Array.isArray(data) && data.length === 0)) {
        // Use ReactiveQuery's built-in empty state logic
        return query.isFilteredEmpty?.() ? 'CompleteButFilteredBlank' : 'CompleteAndEmpty';
      }
      return 'Complete';
    }
    return 'PartiallyLoaded';
  });

  const isEmpty = $derived(dataState === 'CompleteAndEmpty' || dataState === 'CompleteButFilteredBlank');
  const isLoading = $derived(dataState === 'NotYetLoaded' || dataState === 'PartiallyLoaded');

  // Context-aware messaging
  const contextualEmptyMessage = $derived(() => {
    if (dataState === 'CompleteButFilteredBlank') {
      return filteredEmptyMessage || query.filteredEmptyMessage?.() || 'No items match your filters';
    }
    return emptyMessage || query.emptyMessage?.() || 'No items found';
  });
</script>

<!-- Loading State -->
{#if isLoading}
  {#if loading}
    {@render loading()}
  {:else}
    <LoadingSkeleton />
  {/if}

<!-- Error State -->
{:else if dataState === 'Error' && error}
  {#if errorSnippet}
    {@render errorSnippet(error)}
  {:else}
    <div class="error-state">
      <h2>Unable to load data</h2>
      <p>ReactiveQuery will automatically retry. Error: {error.message}</p>
    </div>
  {/if}

<!-- Empty States -->
{:else if isEmpty}
  {#if empty}
    {@render empty()}
  {:else}
    <div class="empty-state {dataState === 'CompleteButFilteredBlank' ? 'filtered-empty' : ''}">
      <div class="empty-state-icon">
        {dataState === 'CompleteButFilteredBlank' ? '🔍' : '📋'}
      </div>
      <h2>{contextualEmptyMessage}</h2>
      {#if dataState === 'CompleteButFilteredBlank'}
        <p>Try adjusting your filters or search criteria.</p>
      {/if}
    </div>
  {/if}

<!-- Success State -->
{:else if data}
  {@render content({ data, state: dataState, isEmpty: false })}

<!-- Fallback -->
{:else}
  <div class="unknown-state">
    <p>Waiting for ReactiveQuery data...</p>
  </div>
{/if}
```

## Implementation Phases

### Phase 1: Core ReactiveQuery Infrastructure (Week 1-2)
1. **Build ReactiveQuery base class** with Rails-familiar DSL
2. **Create ReactiveQueryCompiler** for automatic optimization
3. **Implement CompiledReactiveQuery** execution engine
4. **Add comprehensive TypeScript interfaces** for type safety

### Phase 2: Rails Generator Integration (Week 2-3)
1. **Extend existing zero_schema_generator.rb** with ReactiveQuery generation
2. **Build scope analysis engine** to detect Zero.js compatibility
3. **Create TypeScript code generation** for optimized query classes
4. **Add Rails rake task** (`rails zero:generate_reactive_queries`)

### Phase 3: ReactiveView Enhancement (Week 3)
1. **Update ReactiveView component** for multi-query coordination  
2. **Implement 5-state data model** with automatic state detection
3. **Add context-aware empty state messaging** based on query complexity
4. **Create debugging tools** to visualize query compilation

### Phase 4: Migration and Testing (Week 4-5)
1. **Migrate existing manual queries** to ReactiveQuery pattern
2. **Replace component-level state management** with ReactiveView
3. **Add comprehensive test suite** for query compilation accuracy
4. **Performance testing** for client-side processing overhead

### Phase 5: Advanced Features (Week 6+)
1. **Add query result caching** for expensive client-side operations
2. **Implement query dependency tracking** for optimal reactivity
3. **Create performance monitoring** and optimization suggestions
4. **Build developer tools** for query debugging and profiling

## Success Metrics

### Developer Experience
1. **Zero Manual State Management**: Components contain no loading/error/empty state logic
2. **Rails Familiarity**: Developers can write `.includes('client', 'tasks', 'assignments.user')` and get optimal execution
3. **Automatic Optimization**: Complex queries automatically split between Zero.js and client-side processing
4. **Generator Sync**: Rails model changes automatically create optimized TypeScript queries

### Performance
1. **Optimal Zero.js Usage**: All queries respect Zero.js constraints while maximizing its capabilities
2. **Efficient Client Processing**: Complex logic runs efficiently in JavaScript without blocking UI
3. **Minimal Network Overhead**: Smart query splitting minimizes redundant data fetching
4. **Reactive Performance**: Real-time updates work smoothly across coordinated queries

### Code Quality
1. **Eliminate Debugging Complexity**: No more 70+ line state management blocks in components
2. **Centralized Query Logic**: All data access patterns live in testable ReactiveQuery classes
3. **Type Safety**: Generated queries have full TypeScript support from Rails schema
4. **Maintainability**: Rails changes automatically propagate to frontend via generator

## Migration Strategy

### Backward Compatibility
- Existing ReactiveRecord usage continues to work unchanged
- Current ZeroDataView components can gradually migrate to ReactiveView
- Manual query construction remains available for edge cases

### Gradual Migration Path
1. **Start with new features** using ReactiveQuery pattern
2. **Migrate high-complexity components** first (biggest wins)
3. **Convert remaining components** systematically
4. **Remove deprecated patterns** only after full migration

### Developer Onboarding
1. **Documentation with Rails comparisons** showing familiar patterns
2. **Migration examples** for common existing patterns
3. **Debugging guides** for query compilation and performance
4. **Best practices** for client-side processing design

## Technical Considerations

### Zero.js Constraint Handling
- **Automatic detection** of Zero.js incompatible syntax
- **Intelligent query splitting** for complex relationships
- **Performance warnings** for expensive client-side operations
- **Fallback strategies** for edge cases

### Client-Side Processing Optimization
- **Lazy evaluation** of complex transformations
- **Memoization** of expensive computations
- **Incremental updates** for reactive data changes
- **Memory management** for large datasets

### Error Handling and Debugging
- **Compilation error reporting** with suggested fixes
- **Runtime performance monitoring** for client-side logic
- **Query execution visualization** for development
- **Automatic retry logic** for failed query coordination

This architecture provides the Rails familiarity developers want while automatically optimizing for Zero.js constraints, creating the best of both worlds: powerful query expressiveness with optimal real-time performance.