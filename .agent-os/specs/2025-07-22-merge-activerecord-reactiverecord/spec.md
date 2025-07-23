# Spec Requirements Document

> Spec: Merge ActiveRecord into ReactiveRecord
> Created: 2025-07-22
> Status: Planning

## Overview

Merge the frontend ActiveRecord model into ReactiveRecord to create a unified model that provides both reactive queries and CRUD operations with Zero.js custom mutations. This will eliminate the performance-focused separation between ActiveRecord (CRUD operations) and ReactiveRecord (reactive queries) by creating a single comprehensive model that handles both use cases efficiently.

## User Stories

### Unified Model API

As a developer, I want to use a single model class for both reactive queries and CRUD operations, so that I don't need to import different models or remember which model to use for specific scenarios.

When working with models in Svelte components, developers currently need to import ReactiveTask for reactive queries and Task for CRUD operations. After this change, ReactiveTask will provide both capabilities through a unified API that automatically chooses the optimal approach based on context.

### Seamless Mutation Integration

As a developer, I want CRUD operations on reactive models to automatically trigger Zero.js custom mutations, so that activity logging, positioning, and other business logic work consistently across all model operations.

Currently, only ActiveRecord models have mutation integration via `executeMutatorWithTracking`, while ReactiveRecord models lack CRUD methods entirely. The unified model will ensure all mutations (create, update, delete) go through the proper mutator pipeline for comprehensive audit trails and business logic execution.

### Performance-Optimized Reactive Operations

As a developer, I want reactive queries to remain lightweight and performant, so that UI updates stay fast even when the unified model includes additional CRUD capabilities.

The merged implementation will maintain ReactiveRecord's current reactive query performance while adding CRUD methods that delegate to the existing mutator infrastructure without impacting query responsiveness.

## Spec Scope

1. **CRUD Methods Integration** - Add create(), update(), destroy(), discard(), and undiscard() methods to ReactiveRecord with full mutator pipeline support
2. **Zero.js Custom Mutations** - Ensure all CRUD operations trigger appropriate mutators for activity logging, positioning, and business logic
3. **Unified API Surface** - Provide single import path for both reactive queries and CRUD operations
4. **Performance Preservation** - Maintain current ReactiveRecord query performance without degradation
5. **Migration Path** - Update all existing ActiveRecord usages to use the enhanced ReactiveRecord

## Out of Scope

- Changes to Zero.js custom mutation framework itself
- Modifications to existing mutator implementations
- Database schema changes or Rails backend modifications
- Changes to reactive query caching or TTL behavior

## Expected Deliverable

1. ReactiveRecord class enhanced with CRUD methods that integrate with Zero.js custom mutations and maintain reactive query performance
2. All existing ActiveRecord imports updated to use ReactiveRecord with comprehensive test coverage
3. Zero.js custom mutations working seamlessly with the unified model for complete activity logging and business logic execution

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-22-merge-activerecord-reactiverecord/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-22-merge-activerecord-reactiverecord/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-07-22-merge-activerecord-reactiverecord/sub-specs/tests.md