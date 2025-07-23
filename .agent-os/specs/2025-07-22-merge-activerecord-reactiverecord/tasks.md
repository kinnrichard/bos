# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-22-merge-activerecord-reactiverecord/spec.md

> Created: 2025-07-22
> Status: Ready for Implementation

## Tasks

- [ ] 1. Add CRUD methods to ReactiveRecord class
  - [ ] 1.1 Write tests for ReactiveRecord CRUD methods with mutator integration
  - [ ] 1.2 Add create() method with executeMutatorWithTracking integration
  - [ ] 1.3 Add update() method with change tracking and mutation pipeline
  - [ ] 1.4 Add destroy() method for hard delete operations
  - [ ] 1.5 Add discard() and undiscard() methods for soft delete functionality
  - [ ] 1.6 Add upsert() method for create-or-update scenarios
  - [ ] 1.7 Verify all CRUD methods integrate with Zero.js mutations
  - [ ] 1.8 Verify all tests pass for new CRUD functionality

- [ ] 2. Ensure mutator pipeline integration
  - [ ] 2.1 Write tests for MutatorContext construction in CRUD operations
  - [ ] 2.2 Verify executeMutatorWithTracking called with correct parameters
  - [ ] 2.3 Test user attribution through getCurrentUser() integration
  - [ ] 2.4 Test change tracking for update operations
  - [ ] 2.5 Verify activity logging mutators receive proper context
  - [ ] 2.6 Test positioning mutators execute for applicable models
  - [ ] 2.7 Verify all mutator integration tests pass

- [ ] 3. Preserve reactive query performance and functionality
  - [ ] 3.1 Write performance tests for existing ReactiveRecord query methods
  - [ ] 3.2 Verify find(), findBy(), where(), all() methods unchanged
  - [ ] 3.3 Test includes() relationship loading still works
  - [ ] 3.4 Test TTL and caching behavior preserved
  - [ ] 3.5 Test subscribe() and refresh() methods unaffected
  - [ ] 3.6 Benchmark performance to ensure no regression
  - [ ] 3.7 Verify all reactive functionality tests pass

- [ ] 4. Update model imports and remove ActiveRecord
  - [ ] 4.1 Write migration tests for ActiveRecord to ReactiveRecord transition
  - [ ] 4.2 Update Task model to use enhanced ReactiveRecord
  - [ ] 4.3 Update Job model to use enhanced ReactiveRecord  
  - [ ] 4.4 Update Client model to use enhanced ReactiveRecord
  - [ ] 4.5 Update User model to use enhanced ReactiveRecord
  - [ ] 4.6 Update any remaining ActiveRecord imports
  - [ ] 4.7 Remove ActiveRecord class and related files
  - [ ] 4.8 Verify all model migration tests pass

- [ ] 5. End-to-end integration testing
  - [ ] 5.1 Write E2E tests for unified model usage in Svelte components
  - [ ] 5.2 Test CRUD operations trigger reactive query updates
  - [ ] 5.3 Test activity logging works consistently across all operations
  - [ ] 5.4 Test Zero.js custom mutations execute properly end-to-end
  - [ ] 5.5 Test model relationships work correctly with unified model
  - [ ] 5.6 Test performance acceptable for mixed reactive/CRUD usage
  - [ ] 5.7 Verify all E2E integration tests pass