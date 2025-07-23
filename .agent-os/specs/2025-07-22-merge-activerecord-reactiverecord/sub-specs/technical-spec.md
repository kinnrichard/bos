# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-22-merge-activerecord-reactiverecord/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Technical Requirements

- Add CRUD methods (create, update, destroy, discard, undiscard, upsert) to ReactiveRecord class
- Integrate executeMutatorWithTracking from model-mutators.ts for all CRUD operations
- Maintain existing reactive query performance and behavior unchanged
- Preserve all current ReactiveRecord features (includes, scoped queries, TTL)
- Ensure proper user attribution and activity logging through mutation pipeline
- Support both Promise-based and reactive query patterns in unified API
- Maintain backwards compatibility with existing ReactiveRecord usage

## Approach Options

**Option A: Copy CRUD Methods from ActiveRecord**
- Pros: Fastest implementation, proven code patterns, minimal risk
- Cons: Code duplication, potential maintenance overhead, mixed paradigms

**Option B: Create Shared Base Class with CRUD Methods** (Selected)
- Pros: Eliminates duplication, single source of truth, clean architecture
- Cons: Requires refactoring both classes, more complex initial implementation

**Option C: Composition-Based Approach**
- Pros: Clear separation of concerns, testable components
- Cons: More complex API surface, potential performance overhead

**Rationale:** Option B provides the best long-term solution by creating a shared base class that both ActiveRecord and ReactiveRecord can extend. However, since we're merging into ReactiveRecord, we'll directly add CRUD methods to ReactiveRecord while maintaining its reactive query capabilities.

## Implementation Details

### CRUD Method Integration

```typescript
export class ReactiveRecord<T extends BaseRecord> {
  // Existing reactive query methods remain unchanged
  
  // New CRUD methods added:
  async create(data: CreateData<T>, options: QueryOptions = {}): Promise<T>
  async update(id: string, data: UpdateData<T>, options: QueryOptions = {}): Promise<T>
  async destroy(id: string, options: QueryOptions = {}): Promise<CrudResult>
  async discard(id: string, options: QueryOptions = {}): Promise<T>
  async undiscard(id: string, options: QueryOptions = {}): Promise<T>
  async upsert(data: CreateData<T> | UpdateData<T>, options: QueryOptions = {}): Promise<T>
}
```

### Mutator Integration Pattern

```typescript
// In CRUD methods, integrate with mutator pipeline:
const context: MutatorContext = {
  action: 'create' | 'update',
  user: getCurrentUser(),
  offline: !navigator.onLine,
  environment: import.meta.env?.MODE || 'development'
};

const mutatedData = await executeMutatorWithTracking(
  this.config.tableName,
  baseData,
  originalData, // null for creates
  context,
  { trackChanges: action === 'update' }
);
```

### Performance Considerations

- CRUD methods operate independently of reactive query system
- No impact on ReactiveQuery caching or subscription behavior
- Maintain existing TTL and refresh patterns
- Zero overhead for existing reactive-only usage patterns

## External Dependencies

No new external dependencies required. The implementation will use existing infrastructure:

- **executeMutatorWithTracking** - Already available in model-mutators.ts
- **getCurrentUser** - Already available in auth/current-user
- **Zero.js mutations** - Already configured for all model types
- **MutatorContext** - Already defined in base-mutator.ts

## Migration Strategy

1. **Phase 1**: Add CRUD methods to ReactiveRecord without breaking changes
2. **Phase 2**: Update imports gradually from ActiveRecord to ReactiveRecord
3. **Phase 3**: Remove ActiveRecord class and update remaining references
4. **Phase 4**: Clean up type exports and documentation