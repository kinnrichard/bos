# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-21-zero-custom-mutations/spec.md

> Created: 2025-07-21
> Version: 1.0.0

## Test Coverage

### Unit Tests

**Name Normalizer (Ruby)**
- Removes accents from names (é → e, ñ → n)
- Converts to uppercase
- Removes special characters and spaces
- Handles nil and empty strings
- Preserves original name while creating normalized version

**Name Normalizer (TypeScript)**
- Identical test cases to Ruby version
- Ensures client/server parity
- Tests Unicode normalization edge cases
- Verifies immutability of input data

**Unique Name Validator (Ruby)**
- Validates uniqueness of normalized_name
- Allows same display name with different normalizations
- Handles case sensitivity correctly
- Works with scoped uniqueness (per client_type)

**Unique Name Validator (TypeScript)**
- Queries local Zero.js database for duplicates
- Handles offline validation correctly
- Provides meaningful error messages

**User Attribution Mutator**
- Sets created_by_id and updated_by_id correctly
- Throws error when no authenticated user
- Updates only updated_by on existing records
- Preserves created_by on updates
- Handles offline user context

**Positioning Mutator**
- Calculates correct position for move to start
- Calculates correct position for move to end
- Calculates fractional position between items
- Handles empty lists
- Adds timestamp component for conflict avoidance
- Respects scope field constraints

**Activity Logger**
- Creates activity log entries for all mutations
- Sanitizes sensitive fields from metadata
- Includes offline status in metadata
- Tracks user agent and timestamp
- Links to correct record type and ID

### Integration Tests

**ReactiveRecord Mutator Hooks**
- beforeSave hooks execute in correct order
- beforeCreate only runs on new records
- beforeUpdate only runs on existing records
- Validators prevent invalid saves
- Async mutators handle properly
- Error propagation works correctly

**Client Model with Mutators**
- Creating client normalizes name automatically
- Updating client name re-normalizes
- Duplicate normalized names are rejected
- Validation errors surface to UI properly
- Bulk operations apply mutators

**Offline Functionality**
- Mutators work when offline
- Validation uses local database
- Sync properly handles conflicts
- Queue correctly replays mutations

**User Attribution Security**
- Server rejects falsified created_by values
- Server rejects falsified updated_by values
- Server validates user matches JWT token
- Attribution works across offline/online transition

**Positioning Conflict Resolution**
- Concurrent moves by different users merge correctly
- Timestamp component prevents exact position conflicts
- Server-side rebalancing maintains list integrity
- Scoped lists maintain independent positioning

**Activity Logging Integration**
- All mutations generate activity logs
- Logs sync correctly from offline state
- Server validates log authenticity
- Metadata includes all required fields

### End-to-End Tests

**Client Creation Flow**
- User enters "Café René" as client name
- System saves with normalized_name "CAFERENE"
- Attempting duplicate shows validation error
- Real-time sync updates other users

**Bulk Update Operations**
- Select multiple clients
- Bulk update triggers mutators for each
- Validation failures rollback entire operation
- UI shows progress and results

### Mocking Requirements

**Zero.js Client Mock**
- Mock mutation responses
- Simulate offline state
- Control sync timing
- Inject validation failures

**Database Queries**
- Mock uniqueness check queries
- Control query response timing
- Simulate index lookups

**Time-based Tests**
- Mock for consistent timestamps
- Test stale data scenarios
- Verify cache invalidation

## Test Implementation Examples

### Ruby Normalizer Test
```ruby
# spec/lib/shared/normalizers/name_normalizer_spec.rb
RSpec.describe Shared::Normalizers::NameNormalizer do
  describe '.normalize' do
    it 'removes accents' do
      expect(described_class.normalize('Café')).to eq('CAFE')
    end
    
    it 'handles complex Unicode' do
      expect(described_class.normalize('Zürich')).to eq('ZURICH')
    end
    
    it 'removes special characters' do
      expect(described_class.normalize('ABC & Co.')).to eq('ABCCO')
    end
  end
end
```

### TypeScript Mutator Test
```typescript
// frontend/src/lib/models/base/__tests__/mutator-hooks.test.ts
describe('ReactiveRecord Mutator Hooks', () => {
  it('runs beforeSave hooks on create', async () => {
    const mockMutator = vi.fn((data) => ({
      ...data,
      normalized_name: 'TEST'
    }));
    
    Client.mutatorHooks.beforeSave = [mockMutator];
    
    await Client.create({ name: 'Test Client' });
    
    expect(mockMutator).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Client' }),
      expect.any(Object)
    );
  });
});
```

### User Attribution Test
```typescript
// frontend/src/lib/shared/mutators/__tests__/user-attribution.test.ts
describe('User Attribution Mutator', () => {
  it('adds created_by and updated_by for new records', () => {
    const context = { user: { id: 'user-123' } };
    const data = { name: 'Test Client' };
    
    const result = addUserAttribution(data, context);
    
    expect(result.created_by_id).toBe('user-123');
    expect(result.updated_by_id).toBe('user-123');
    expect(result.created_at).toBeDefined();
  });
  
  it('prevents falsification server-side', async () => {
    // Attempt to create with wrong user ID
    const response = await api.post('/clients', {
      name: 'Test',
      created_by_id: 'fake-user-id'
    });
    
    expect(response.status).toBe(422);
    expect(response.data.errors.created_by_id).toContain('must match authenticated user');
  });
});
```

### Positioning Test
```typescript
// frontend/src/lib/shared/mutators/__tests__/positioning.test.ts
describe('Positioning Mutator', () => {
  it('handles concurrent offline moves', async () => {
    const tasks = [
      { id: '1', position: 1 },
      { id: '2', position: 2 },
      { id: '3', position: 3 }
    ];
    
    // User A moves task 3 to position 1 offline
    const positionA = await userAOffline.moveTask('3', 0);
    
    // User B moves task 2 to position 1 offline
    const positionB = await userBOffline.moveTask('2', 0);
    
    // Both positions should be different due to timestamp
    expect(positionA).not.toBe(positionB);
    
    // After sync, order should be deterministic
    await syncBothUsers();
    const finalOrder = await getTasks();
    expect(finalOrder[0].id).toBeDefined(); // One will win
  });
});
```

### E2E Test
```typescript
// tests/e2e/client-normalization.spec.ts
test('client name normalization flow', async ({ page }) => {
  await page.goto('/clients/new');
  
  // Enter client name with accents
  await page.fill('[name="client[name]"]', 'Café René');
  await page.click('button[type="submit"]');
  
  // Verify saved with normalized name
  await expect(page).toHaveURL(/\/clients\/\d+/);
  
  // Check database has normalized value
  const client = await getClientFromDB();
  expect(client.normalized_name).toBe('CAFERENE');
});

// tests/e2e/offline-task-reordering.spec.ts
test('offline task reordering', async ({ page, context }) => {
  // Go offline
  await context.setOffline(true);
  
  // Drag task to new position
  await page.dragAndDrop('[data-task-id="task-1"]', '[data-task-id="task-3"]');
  
  // Verify immediate UI update
  const tasks = await page.locator('[data-task-id]').all();
  expect(await tasks[1].getAttribute('data-task-id')).toBe('task-1');
  
  // Go online and verify sync
  await context.setOffline(false);
  await page.waitForTimeout(1000); // Wait for sync
  
  // Verify position persisted
  await page.reload();
  const tasksAfterReload = await page.locator('[data-task-id]').all();
  expect(await tasksAfterReload[1].getAttribute('data-task-id')).toBe('task-1');
});
```

## Testing Strategy

1. **Parallel Testing**: Run Ruby and TypeScript normalizer tests with identical inputs
2. **Parity Verification**: Automated test to ensure Ruby/TS implementations match
3. **Performance Testing**: Benchmark mutator overhead (should be <5ms)
4. **Chaos Testing**: Random input generation to find edge cases
5. **Integration Coverage**: Test with real Zero.js and Rails backend