# Spec Requirements Document

> Spec: Zero.js Custom Mutations for ReactiveRecord
> Created: 2025-07-21
> Status: Planning

## Overview

Implement a DRY system for custom mutators that allows business logic (like normalize_name) to be shared between Rails and TypeScript, working seamlessly with the existing ReactiveRecord/ActiveRecord framework to enable instant execution with proper validation and conflict resolution.

## User Stories

### Developer Experience

As a developer, I want to write validation and normalization logic once and have it work on both client and server, so that I don't duplicate code and maintain consistency.

When creating or updating a client record, the system should automatically normalize the name (remove accents, standardize format) before saving, whether the operation happens online or offline. The same normalization logic should execute in Ruby on the server and TypeScript on the client, ensuring data consistency regardless of where the mutation originates.

### Real-time Collaboration

As a user working with team members, I want complex operations like bulk updates and status transitions to happen instantly with proper conflict resolution, so that everyone sees consistent data in real-time.

When multiple users are updating job statuses or reordering tasks simultaneously, the custom mutators should handle conflicts gracefully, ensuring that all changes are properly merged without data loss. The system should provide optimistic updates that feel instant while maintaining data integrity.

### Offline Capability

As a field technician, I want my changes to be queued when offline and automatically synced when I reconnect, so that I can work without interruption.

When working offline, all custom mutations (normalizations, validations, bulk operations) should continue to work using the local Zero.js database. When connectivity returns, the queued mutations should replay in the correct order with proper conflict resolution.

### Automatic User Attribution

As a business owner, I want to know who created or modified each record with tamper-proof tracking, so that I can maintain accountability and audit compliance.

When any user creates or updates a record, the system should automatically set created_by or updated_by fields based on the authenticated user. This attribution must be validated server-side to prevent client-side falsification. Even when working offline, the system should track the current user and apply attribution when syncing.

### Offline Task Reordering

As a technician, I want to reorder tasks by dragging them even when offline, so that I can prioritize my work queue without waiting for connectivity.

When dragging tasks to reorder them, the positioning logic should work identically to the server-side Rails positioning gem. Multiple users reordering tasks offline should have their changes merged intelligently when syncing, using timestamp-based conflict resolution. The system should handle edge cases like gaps in position values and maintain list integrity.

## Spec Scope

1. **Shared Logic Infrastructure** - Create directory structure and base classes for sharing normalizers and validators between Ruby and TypeScript
2. **ReactiveRecord Mutator Hooks** - Extend ReactiveRecord/ActiveRecord base classes to support beforeCreate, beforeUpdate, and validation callbacks
3. **Name Normalizer Implementation** - Implement the client name normalization logic in both Ruby and TypeScript with identical behavior
4. **Unique Name Validator** - Create validation logic that checks for unique normalized names across clients
5. **Automatic User Tracking** - Add created_by and updated_by support client-side with server validation to prevent falsification
6. **Offline Positioning** - Implement client-side positioning logic that emulates the Rails positioning gem with proper conflict resolution on sync
7. **Audit Trail System** - Create comprehensive activity logging that tracks all mutations with metadata and user attribution
8. **Generator Enhancement** - Update the Ruby model generator to automatically detect and generate TypeScript mutators from Rails callbacks

## Out of Scope

- Direct Zero.js API usage (developers continue using ReactiveRecord)
- Changing existing ReactiveRecord API patterns
- Complex multi-model transactions
- Custom UI components for mutation feedback

## Expected Deliverable

1. Developers can define mutators once and have them work identically on client and server
2. Client name normalization works offline and online with consistent results
3. The Ruby generator automatically creates TypeScript mutators from Rails model callbacks

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-21-zero-custom-mutations/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-21-zero-custom-mutations/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-07-21-zero-custom-mutations/sub-specs/api-spec.md
- Database Schema: @.agent-os/specs/2025-07-21-zero-custom-mutations/sub-specs/database-schema.md
- Tests Specification: @.agent-os/specs/2025-07-21-zero-custom-mutations/sub-specs/tests.md