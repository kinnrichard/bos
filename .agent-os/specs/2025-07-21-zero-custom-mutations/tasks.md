# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-07-21-zero-custom-mutations/spec.md

> Created: 2025-07-21
> Status: Ready for Implementation

## Tasks

- [ ] 1. Create Shared Logic Infrastructure
  - [ ] 1.1 Write tests for directory structure and module loading
  - [ ] 1.2 Create lib/shared/normalizers/ and lib/shared/validators/ directories
  - [ ] 1.3 Create lib/shared/mutators/ for user attribution, positioning, and logging
  - [ ] 1.4 Create frontend/src/lib/shared/ directory structure
  - [ ] 1.5 Implement base normalizer classes in Ruby and TypeScript
  - [ ] 1.6 Implement base validator classes in Ruby and TypeScript
  - [ ] 1.7 Implement base mutator classes in Ruby and TypeScript
  - [ ] 1.8 Create index files for TypeScript exports
  - [ ] 1.9 Verify all tests pass

- [ ] 2. Implement Mutator Hook System
  - [ ] 2.1 Write tests for mutator hooks in ReactiveRecord
  - [ ] 2.2 Create mutator-hooks.ts with interfaces and types
  - [ ] 2.3 Update ReactiveRecord base class to support hooks
  - [ ] 2.4 Implement runHooks method for executing mutator chains
  - [ ] 2.5 Implement runValidators method with error handling
  - [ ] 2.6 Update ActiveRecord create/update methods to use hooks
  - [ ] 2.7 Add hook registration to model configuration
  - [ ] 2.8 Add support for afterCreate and afterUpdate hooks
  - [ ] 2.9 Verify all tests pass

- [ ] 3. Implement Name Normalizer
  - [ ] 3.1 Write identical test suites for Ruby and TypeScript normalizers
  - [ ] 3.2 Implement name_normalizer.rb with Unicode handling
  - [ ] 3.3 Implement name-normalizer.ts with matching logic
  - [ ] 3.4 Create parity test to ensure implementations match
  - [ ] 3.5 Add performance benchmarks for both implementations
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Implement User Attribution System
  - [ ] 4.1 Write tests for user attribution mutator
  - [ ] 4.2 Implement user-attribution.ts mutator
  - [ ] 4.3 Create UserTrackable concern for Rails models
  - [ ] 4.4 Add server-side validation for user attribution
  - [ ] 4.5 Test offline user context handling
  - [ ] 4.6 Implement getCurrentUser helper function
  - [ ] 4.7 Add security tests for falsification prevention
  - [ ] 4.8 Verify all tests pass

- [ ] 5. Implement Client-Side Positioning
  - [ ] 5.1 Write tests for positioning mutator
  - [ ] 5.2 Implement PositioningMutator class
  - [ ] 5.3 Add fractional positioning with timestamp components
  - [ ] 5.4 Implement scope-aware positioning
  - [ ] 5.5 Create conflict resolution logic
  - [ ] 5.6 Test concurrent offline moves
  - [ ] 5.7 Add server-side rebalancing hook
  - [ ] 5.8 Verify all tests pass

- [ ] 6. Implement Activity Logging System
  - [ ] 6.1 Write tests for activity logger
  - [ ] 6.2 Implement ActivityLogger class
  - [ ] 6.3 Add metadata sanitization
  - [ ] 6.4 Create offline-aware logging
  - [ ] 6.5 Implement server-side log validation
  - [ ] 6.6 Test activity log syncing
  - [ ] 6.7 Add performance monitoring
  - [ ] 6.8 Verify all tests pass

- [ ] 7. Implement Validators
  - [ ] 7.1 Write tests for unique name validation
  - [ ] 7.2 Implement unique_name_validator.rb using ActiveRecord
  - [ ] 7.3 Implement unique-name-validator.ts using Zero queries
  - [ ] 7.4 Add offline support to TypeScript validator
  - [ ] 7.5 Test validation with scoped uniqueness
  - [ ] 7.6 Verify all tests pass

- [ ] 8. Update Client Model Integration
  - [ ] 8.1 Write integration tests for Client model with all mutators
  - [ ] 8.2 Update Client TypeScript model to use mutator hooks
  - [ ] 8.3 Add user attribution to Client model
  - [ ] 8.4 Verify Ruby Client model callbacks work correctly
  - [ ] 8.5 Test offline client creation with all features
  - [ ] 8.6 Test real-time sync of all mutator results
  - [ ] 8.7 Verify all tests pass

- [ ] 9. Update Task Model for Positioning
  - [ ] 9.1 Write integration tests for Task positioning
  - [ ] 9.2 Update Task TypeScript model with positioning mutator
  - [ ] 9.3 Integrate with existing drag-and-drop UI
  - [ ] 9.4 Test offline drag-and-drop functionality
  - [ ] 9.5 Verify positioning gem compatibility
  - [ ] 9.6 Test concurrent user scenarios
  - [ ] 9.7 Verify all tests pass

- [ ] 10. Enhance Ruby Generator
  - [ ] 10.1 Write tests for enhanced generator features
  - [ ] 10.2 Update generator to detect before_validation callbacks
  - [ ] 10.3 Add detection for created_by/updated_by columns
  - [ ] 10.4 Add detection for positioning usage
  - [ ] 10.5 Generate appropriate mutator imports
  - [ ] 10.6 Generate mutator configurations
  - [ ] 10.7 Test generator with various model configurations
  - [ ] 10.8 Regenerate existing models to verify compatibility
  - [ ] 10.9 Verify all tests pass

- [ ] 11. End-to-End Testing and Documentation
  - [ ] 11.1 Write E2E tests for complete client creation flow
  - [ ] 11.2 Write E2E tests for offline task reordering
  - [ ] 11.3 Write E2E tests for user attribution security
  - [ ] 11.4 Test bulk operations with all mutators
  - [ ] 11.5 Test complex offline/online sync scenarios
  - [ ] 11.6 Create developer documentation for custom mutators
  - [ ] 11.7 Add examples for common mutator patterns
  - [ ] 11.8 Document positioning conflict resolution strategies
  - [ ] 11.9 Update Agent OS documentation with mutator info
  - [ ] 11.10 Verify all tests pass