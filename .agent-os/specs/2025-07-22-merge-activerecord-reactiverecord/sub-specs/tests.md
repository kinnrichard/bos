# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-22-merge-activerecord-reactiverecord/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Test Coverage

### Unit Tests

**ReactiveRecord CRUD Methods**
- create() method integrates with mutator pipeline
- update() method tracks changes and applies mutations
- destroy() method performs hard delete via Zero.js
- discard() method applies soft delete with discarded_at timestamp
- undiscard() method restores discarded records
- upsert() method handles both create and update scenarios
- All CRUD methods properly set created_at/updated_at timestamps
- All CRUD methods integrate with getCurrentUser() for attribution

**Mutator Integration**
- executeMutatorWithTracking called with correct parameters
- MutatorContext includes proper action, user, and environment
- Change tracking works correctly for update operations
- Activity logging mutators receive proper context
- Positioning mutators execute for models that require it

**Reactive Query Compatibility**
- Existing reactive query methods unchanged
- find(), findBy(), where(), all() continue to work
- includes() method maintains relationship loading
- TTL and caching behavior preserved
- subscribe() and refresh() methods unaffected

### Integration Tests

**CRUD and Reactive Query Interaction**
- Creating record via CRUD updates reactive queries automatically
- Updating record via CRUD triggers reactive subscribers
- Deleting record removes it from reactive query results
- Discarding record excludes it from kept() queries but includes in withDiscarded()
- Reactive queries reflect mutations immediately

**Zero.js Custom Mutations End-to-End**
- Task creation triggers positioning and activity logging
- Job updates create proper activity log entries
- Client modifications track user attribution correctly
- All mutations execute in proper sequence without conflicts

**Model-Specific Mutation Pipelines**
- Task model executes taskPositioningMutator and taskActivityLoggingMutator
- Job model executes jobActivityLoggingMutator
- Client model executes clientActivityLoggingMutator
- User model executes userActivityLoggingMutator with privacy considerations

### Feature Tests

**Unified Model Usage Scenarios**
- Import ReactiveRecord and use both reactive queries and CRUD operations
- Svelte component uses reactive queries for display and CRUD for modifications
- Activity logging works consistently across all model operations
- Performance remains acceptable for high-frequency reactive updates

**Migration Scenarios**
- Replace ActiveRecord imports with ReactiveRecord
- Existing ActiveRecord usage patterns work with ReactiveRecord
- No breaking changes to current reactive query usage
- All model relationships continue to work via includes()

### Mocking Requirements

**Zero.js Client**
- Mock getZero() to return test-configured Zero instance
- Mock zero.mutate operations for CRUD method testing
- Mock zero.query operations for reactive query testing
- Simulate offline/online state changes for context testing

**User Authentication**
- Mock getCurrentUser() to return test user for attribution
- Test scenarios with null user (unauthenticated)
- Verify user ID properly included in activity logs

**Mutator Pipeline**
- Mock executeMutatorWithTracking to verify it's called correctly
- Test mutator pipeline execution without actual mutation side effects
- Verify proper MutatorContext construction

**Time-based Tests**
- Mock Date.now() for consistent timestamp testing
- Test created_at and updated_at field setting
- Verify discard() sets discarded_at to current timestamp

## Performance Tests

**Reactive Query Performance**
- Benchmark existing ReactiveRecord query performance as baseline
- Verify no performance regression after adding CRUD methods
- Test memory usage with mixed reactive/CRUD usage patterns

**Mutation Performance**
- Benchmark CRUD operations with full mutator pipeline
- Compare performance to existing ActiveRecord implementation
- Ensure mutation pipeline doesn't block reactive updates