# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-21-zero-custom-mutations/spec.md

> Created: 2025-07-21
> Version: 1.0.0

## Technical Requirements

- Implement mutator hooks in ReactiveRecord/ActiveRecord base classes that intercept create/update operations
- Create a registration system for models to declare their custom mutators and validators
- Support asynchronous mutators for operations that may need to check external state
- Ensure mutators work with both online Zero.js mutations and offline ReactiveQuery operations
- Maintain TypeScript type safety throughout the mutator chain
- Support both synchronous and asynchronous validation with proper error handling
- Implement automatic user attribution (created_by/updated_by) with server-side validation
- Create client-side positioning logic compatible with Rails positioning gem
- Build activity logging system that tracks all mutations with user and metadata
- Ensure all user-attributed data is tamper-proof through server validation
- Handle position conflict resolution for concurrent offline reordering
- Implement server time synchronization that handles incorrect client clocks
- Ensure timezone safety by normalizing all timestamps to UTC
- Piggyback time sync on existing HTTP requests to minimize overhead

## Approach Options

**Option A:** Inline mutator functions in model files
- Pros: Simple, keeps logic close to models, easy to understand
- Cons: Harder to share between Ruby/TypeScript, less DRY

**Option B:** Shared mutator modules with parallel implementations (Selected)
- Pros: True DRY principle, testable in isolation, consistent behavior
- Cons: Requires discipline to keep Ruby/TS versions in sync

**Option C:** Code generation from Ruby to TypeScript
- Pros: Single source of truth, automatic synchronization
- Cons: Complex transpilation, limited by language differences

**Rationale:** Option B provides the best balance of maintainability and consistency while allowing for language-specific optimizations when needed.

## External Dependencies

No new external dependencies required. The implementation will use:
- Existing Zero.js client and mutation APIs
- ReactiveRecord framework already in place
- TypeScript built-in types and interfaces
- Ruby standard library for server-side implementation

## Implementation Details

### Mutator Hook System

```typescript
// frontend/src/lib/models/base/mutator-hooks.ts
export interface MutatorHooks<T> {
  beforeCreate?: MutatorFunction<T>[];
  beforeUpdate?: MutatorFunction<T>[];
  beforeSave?: MutatorFunction<T>[];
  afterCreate?: MutatorFunction<T>[];
  afterUpdate?: MutatorFunction<T>[];
  validators?: ValidatorFunction<T>[];
}

export type MutatorFunction<T> = (
  data: Partial<T>,
  context: MutatorContext
) => Promise<Partial<T>> | Partial<T>;

export type ValidatorFunction<T> = (
  data: Partial<T>,
  context: MutatorContext
) => Promise<ValidationResult> | ValidationResult;

export interface MutatorContext {
  tx?: Transaction;
  user?: User;
  offline?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string[]>;
}
```

### ReactiveRecord Integration

```typescript
// Extend ReactiveRecord.create() method
async create(data: Partial<T>): Promise<T> {
  // Run beforeSave hooks
  let processedData = await this.runHooks('beforeSave', data);
  
  // Run beforeCreate hooks
  processedData = await this.runHooks('beforeCreate', processedData);
  
  // Run validators
  const validation = await this.runValidators(processedData);
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }
  
  // Perform actual Zero.js mutation
  const result = await zero.mutate[this.tableName].insert(processedData);
  
  // Run afterCreate hooks
  await this.runHooks('afterCreate', result);
  
  return result;
}
```

### Shared Logic Structure

```
lib/shared/
├── normalizers/
│   ├── base_normalizer.rb
│   ├── name_normalizer.rb
│   └── README.md
└── validators/
    ├── base_validator.rb
    ├── unique_name_validator.rb
    └── README.md

frontend/src/lib/shared/
├── normalizers/
│   ├── base-normalizer.ts
│   ├── name-normalizer.ts
│   └── index.ts
└── validators/
    ├── base-validator.ts
    ├── unique-name-validator.ts
    └── index.ts
```

### Name Normalizer Implementation

```typescript
// frontend/src/lib/shared/normalizers/name-normalizer.ts
export function normalizeClientName(data: Partial<Client>): Partial<Client> {
  if (!data.name) return data;
  
  // Remove accents using normalize and regex
  let normalized = data.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Convert to uppercase and remove non-alphanumeric
  normalized = normalized.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  return {
    ...data,
    name: data.name,
    normalized_name: normalized
  };
}
```

```ruby
# lib/shared/normalizers/name_normalizer.rb
module Shared
  module Normalizers
    class NameNormalizer
      def self.normalize(name)
        return nil if name.blank?
        
        # Remove accents using Unicode normalization
        normalized = name.unicode_normalize(:nfd).gsub(/\p{Mn}/, '')
        
        # Convert to uppercase and remove non-alphanumeric
        normalized.upcase.gsub(/[^A-Z0-9]/, '')
      end
    end
  end
end
```

### Server Time Synchronization

```typescript
// frontend/src/lib/shared/services/server-time.ts
class ServerTimeSync {
  private offset: number = 0; // milliseconds difference: server - client
  
  constructor() {
    // Load saved offset from localStorage immediately
    this.loadFromStorage();
  }
  
  private loadFromStorage(): void {
    const saved = localStorage.getItem('serverTimeOffset');
    if (saved) {
      this.offset = parseInt(saved, 10) || 0;
    }
  }
  
  private saveToStorage(): void {
    localStorage.setItem('serverTimeOffset', this.offset.toString());
  }
  
  // Called by response interceptor - no dedicated HTTP requests
  syncFromResponse(serverTimeISO: string): void {
    if (!serverTimeISO) return;
    
    // Always work in UTC milliseconds to avoid timezone issues
    const serverMs = new Date(serverTimeISO).getTime();
    const clientMs = Date.now();
    this.offset = serverMs - clientMs;
    this.saveToStorage();
  }
  
  // Always returns UTC ISO string (ends with 'Z')
  nowISO(): string {
    const serverMs = Date.now() + this.offset;
    return new Date(serverMs).toISOString();
  }
  
  // Get server time as Date object (for calculations)
  now(): Date {
    return new Date(Date.now() + this.offset);
  }
  
  // Get server time as epoch milliseconds
  nowMs(): number {
    return Date.now() + this.offset;
  }
}

export const serverTime = new ServerTimeSync();

// Axios interceptor to piggyback on existing requests
axios.interceptors.response.use((response) => {
  // Check for server time in headers or response body
  const headerTime = response.headers['x-server-time'];
  const bodyTime = response.data?.server_time;
  
  if (headerTime) {
    serverTime.syncFromResponse(headerTime);
  } else if (bodyTime) {
    serverTime.syncFromResponse(bodyTime);
  }
  
  return response;
});
```

### Timestamp Mutator with Server Time

```typescript
// frontend/src/lib/shared/mutators/timestamps.ts
import { serverTime } from '../services/server-time';

export function addTimestamps(data: any, context: MutatorContext): any {
  // Always use server time in UTC
  const now = serverTime.nowISO();
  
  // For new records
  if (!data.id) {
    return {
      ...data,
      created_at: data.created_at || now,
      updated_at: now
    };
  }
  
  // For updates - never modify created_at
  const { created_at, ...updateData } = data;
  return {
    ...updateData,
    updated_at: now
  };
}

// frontend/src/lib/shared/mutators/user-attribution.ts
export function addUserAttribution(data: any, context: MutatorContext): any {
  const currentUser = context.user || getCurrentUser();
  
  if (!currentUser) {
    throw new Error('No authenticated user for attribution');
  }
  
  // For new records
  if (!data.id) {
    return {
      ...data,
      created_by_id: currentUser.id,
      updated_by_id: currentUser.id
    };
  }
  
  // For updates - never modify created_by_id
  const { created_by_id, ...updateData } = data;
  return {
    ...updateData,
    updated_by_id: currentUser.id
  };
}

// frontend/src/lib/shared/mutators/soft-delete.ts
import { serverTime } from '../services/server-time';

export function addSoftDelete(data: any, context: MutatorContext): any {
  // Support soft deletes using discard gem pattern
  if (context.action === 'destroy') {
    return {
      ...data,
      discarded_at: serverTime.nowISO(),
      updated_at: serverTime.nowISO(),
      updated_by_id: context.user?.id
    };
  }
  
  // Filter out discarded_at on create/update to prevent accidental restoration
  const { discarded_at, ...cleanData } = data;
  return cleanData;
}
```

Server-side validation ensures client can't falsify:
```ruby
# app/models/concerns/user_trackable.rb
module UserTrackable
  extend ActiveSupport::Concern
  
  included do
    before_create :validate_created_by
    before_update :validate_updated_by
  end
  
  private
  
  def validate_created_by
    if created_by_id != Current.user&.id
      errors.add(:created_by_id, "must match authenticated user")
    end
  end
end
```

### Client-Side Positioning

```typescript
// frontend/src/lib/shared/mutators/positioning.ts
import { serverTime } from '../services/server-time';

export class PositioningMutator<T extends { id: string; position: number }> {
  constructor(
    private tableName: string,
    private scopeField?: string
  ) {}
  
  // Rails-like API: move item before another
  async moveBefore(
    itemId: string, 
    beforeId: string,
    context: MutatorContext
  ): Promise<void> {
    const items = await this.getScopedItems(context);
    const item = items.find(i => i.id === itemId);
    const before = items.find(i => i.id === beforeId);
    
    if (!item || !before) throw new Error('Item not found');
    
    const sorted = this.getSortedWithout(items, itemId);
    const beforeIndex = sorted.findIndex(i => i.id === beforeId);
    
    const position = this.calculatePositionBefore(sorted, beforeIndex);
    await this.updatePosition(itemId, position, context);
  }
  
  // Rails-like API: move item after another
  async moveAfter(
    itemId: string, 
    afterId: string,
    context: MutatorContext
  ): Promise<void> {
    const items = await this.getScopedItems(context);
    const item = items.find(i => i.id === itemId);
    const after = items.find(i => i.id === afterId);
    
    if (!item || !after) throw new Error('Item not found');
    
    const sorted = this.getSortedWithout(items, itemId);
    const afterIndex = sorted.findIndex(i => i.id === afterId);
    
    const position = this.calculatePositionAfter(sorted, afterIndex);
    await this.updatePosition(itemId, position, context);
  }
  
  // Rails-like API: move to top
  async moveToTop(itemId: string, context: MutatorContext): Promise<void> {
    const items = await this.getScopedItems(context);
    const sorted = this.getSortedWithout(items, itemId);
    
    const position = sorted.length > 0 
      ? sorted[0].position - 1 
      : 0;
      
    await this.updatePosition(itemId, position, context);
  }
  
  // Rails-like API: move to bottom
  async moveToBottom(itemId: string, context: MutatorContext): Promise<void> {
    const items = await this.getScopedItems(context);
    const sorted = this.getSortedWithout(items, itemId);
    
    const position = sorted.length > 0 
      ? sorted[sorted.length - 1].position + 1 
      : 0;
      
    await this.updatePosition(itemId, position, context);
  }
  
  // Support for drag-drop with index
  async moveToIndex(
    itemId: string, 
    targetIndex: number,
    context: MutatorContext
  ): Promise<void> {
    const items = await this.getScopedItems(context);
    const sorted = this.getSortedWithout(items, itemId);
    
    let position: number;
    if (targetIndex <= 0) {
      position = sorted[0]?.position - 1 || 0;
    } else if (targetIndex >= sorted.length) {
      position = sorted[sorted.length - 1]?.position + 1 || 0;
    } else {
      // Insert between items
      const prev = sorted[targetIndex - 1];
      const next = sorted[targetIndex];
      position = (prev.position + next.position) / 2;
    }
    
    await this.updatePosition(itemId, position, context);
  }
  
  private async updatePosition(
    itemId: string, 
    basePosition: number, 
    context: MutatorContext
  ): Promise<void> {
    // Add microsecond timestamp to prevent exact collisions
    const position = basePosition + (serverTime.nowMs() % 1000) / 1000000;
    
    await context.tx.update(this.tableName, {
      id: itemId,
      position,
      updated_at: serverTime.nowISO(),
      updated_by_id: context.user?.id
    });
  }
  
  private getSortedWithout(items: T[], excludeId: string): T[] {
    return items
      .filter(i => i.id !== excludeId)
      .sort((a, b) => a.position - b.position);
  }
  
  private calculatePositionBefore(sorted: T[], beforeIndex: number): number {
    if (beforeIndex === 0) {
      return sorted[0].position - 1;
    }
    const prev = sorted[beforeIndex - 1];
    const next = sorted[beforeIndex];
    return (prev.position + next.position) / 2;
  }
  
  private calculatePositionAfter(sorted: T[], afterIndex: number): number {
    if (afterIndex === sorted.length - 1) {
      return sorted[afterIndex].position + 1;
    }
    const prev = sorted[afterIndex];
    const next = sorted[afterIndex + 1];
    return (prev.position + next.position) / 2;
  }
  
  private async getScopedItems(context: MutatorContext): Promise<T[]> {
    // Implementation depends on Zero.js query API
    // This would query items with matching scope field
    return [];
  }
}

// Usage example in a model:
export class Task extends ReactiveRecord<TaskData> {
  static positioning = new PositioningMutator('tasks', 'job_id');
  
  // Convenient instance methods matching Rails API
  async moveBefore(otherId: string): Promise<void> {
    await Task.positioning.moveBefore(this.id, otherId, this.getContext());
  }
  
  async moveAfter(otherId: string): Promise<void> {
    await Task.positioning.moveAfter(this.id, otherId, this.getContext());
  }
  
  async moveToTop(): Promise<void> {
    await Task.positioning.moveToTop(this.id, this.getContext());
  }
  
  async moveToBottom(): Promise<void> {
    await Task.positioning.moveToBottom(this.id, this.getContext());
  }
}
```

### Activity Logging

```typescript
// frontend/src/lib/shared/mutators/activity-logger.ts
import { serverTime } from '../services/server-time';

export class ActivityLogger {
  async logMutation(
    action: string,
    tableName: string,
    recordId: string,
    changes: Record<string, any>,
    context: MutatorContext
  ): Promise<void> {
    const metadata = {
      user_id: context.user?.id,
      user_agent: navigator.userAgent,
      offline: context.offline || false,
      timestamp: serverTime.nowISO(),
      changes: this.sanitizeChanges(changes)
    };
    
    await context.tx.insert('activity_logs', {
      action,
      loggable_type: tableName,
      loggable_id: recordId,
      user_id: context.user?.id,
      metadata: JSON.stringify(metadata),
      created_at: metadata.timestamp
    });
  }
  
  private sanitizeChanges(changes: any): any {
    // Remove sensitive fields
    const { password, token, ...safe } = changes;
    return safe;
  }
}
```

### Generator Enhancement

The Ruby generator will be updated to:
1. Detect `before_validation`, `before_create`, `before_update` callbacks
2. Map Rails callbacks to TypeScript mutator hooks
3. Generate import statements for shared logic
4. Create mutator configuration in generated models
5. Auto-include user attribution for models with created_by/updated_by
6. Detect positioning usage and generate positioning mutators
7. Configure activity logging based on model settings
8. Skip generating optimistic locking code (lock_version) as Zero.js handles conflicts
9. Detect discard gem usage and generate soft delete mutators

Example generated output:
```typescript
// Auto-generated Task model with all mutators
import { normalizeClientName } from '$lib/shared/normalizers/name-normalizer';
import { validateUniqueName } from '$lib/shared/validators/unique-name-validator';
import { addUserAttribution } from '$lib/shared/mutators/user-attribution';
import { PositioningMutator } from '$lib/shared/mutators/positioning';
import { ActivityLogger } from '$lib/shared/mutators/activity-logger';

export class Task extends ReactiveRecord<TaskData> {
  static positioning = new PositioningMutator('tasks', 'job_id');
  static activityLogger = new ActivityLogger();
  
  static mutatorHooks: MutatorHooks<TaskData> = {
    beforeSave: [addUserAttribution],
    beforeCreate: [normalizeClientName],
    afterCreate: [(data, ctx) => this.activityLogger.logMutation('create', 'tasks', data.id, data, ctx)],
    afterUpdate: [(data, ctx) => this.activityLogger.logMutation('update', 'tasks', data.id, data, ctx)],
    validators: [validateUniqueName]
  };
  
  // ... rest of model implementation
}
```

### Positioning Gem Limitations & Solutions

The Rails positioning gem has some limitations for offline sync:

1. **Gap Management**: Positioning gem rebalances positions to maintain gaps. Offline, we can't rebalance without conflicts.
   - **Solution**: Use fractional positioning with timestamp components to avoid conflicts

2. **Scoped Positioning**: Different scopes may have position conflicts when syncing.
   - **Solution**: Include scope in conflict resolution logic

3. **Concurrent Reordering**: Two users moving same item offline creates conflicts.
   - **Solution**: Last-write-wins with activity log for audit trail

4. **Position Integer Overflow**: Continuous fractional positioning can exceed number precision.
   - **Solution**: Server-side rebalancing during quiet periods

### Optimistic Locking Removal

With Zero.js's CRDT-based approach, traditional optimistic locking (lock_version) is no longer necessary:

1. **Zero.js Handles Conflicts**: The CRDT merge semantics automatically resolve concurrent updates
2. **Positioning Uses Timestamps**: Our fractional positioning with server timestamps prevents exact collisions
3. **Last-Write-Wins**: For business logic conflicts, we rely on activity logs for audit trails
4. **Removed from Models**: The `locking_column = nil` in Task model disables Rails optimistic locking

This simplifies the architecture and prevents confusing lock version conflicts when Zero.js already handles sync.