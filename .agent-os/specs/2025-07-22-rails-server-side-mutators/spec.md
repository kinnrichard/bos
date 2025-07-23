# Spec Requirements Document

> Spec: Rails Server-Side Custom Mutators
> Created: 2025-07-22
> Status: Planning

## Overview

Implement secure server-side custom mutators in Rails to validate all client mutations, enforce user attribution security, and ensure client-server calculation consistency. This addresses the critical security vulnerability where malicious clients can forge user attribution in activity logs by implementing JWT-based validation and server-side business logic enforcement.

## User Stories

### Secure User Attribution

As a system administrator, I want all activity logs to reflect the actual authenticated user, so that audit trails cannot be forged by malicious clients.

When a user performs actions like creating tasks or updating job statuses, the server validates the JWT token to determine the real authenticated user and enforces that user ID in activity logs, preventing client-side manipulation of user attribution.

### Consistent Business Logic Execution

As a developer, I want business logic calculations (positioning, validation, normalization) to be identical between client and server, so that optimistic updates match server results exactly.

The server implements identical versions of all client-side mutators (positioning algorithms, activity logging, field validation) with comprehensive testing to ensure mathematical consistency between client predictions and server authoritative results.

### Protection Against Client Tampering

As a security-conscious organization, I want the server to validate and authorize every mutation, so that malicious or compromised clients cannot perform unauthorized operations or data manipulation.

All mutations go through Rails controllers that validate JWT tokens, check user permissions, apply server-side business logic, and return authoritative results that become the source of truth for Zero.js synchronization.

## Spec Scope

1. **Rails Mutation Controllers** - API endpoints that receive, validate, and process all Zero.js mutations with JWT authentication
2. **Server-Side Mutator Implementation** - Rails equivalents of all frontend mutators (positioning, activity logging, field validation, normalization)
3. **JWT Validation & User Attribution** - Secure extraction of user identity from JWT tokens with proper error handling for invalid/expired tokens
4. **Client-Server Consistency Testing** - Comprehensive test framework that verifies identical results between client-side predictions and server-side authoritative calculations
5. **Zero.js Integration** - Seamless integration with existing Zero.js infrastructure while adding security layer

## Out of Scope

- Changes to Zero.js core functionality or schema
- Modification of existing client-side mutator interfaces
- Real-time conflict resolution beyond current Zero.js capabilities
- Performance optimizations for high-throughput scenarios
- UI changes or user-facing features

## Expected Deliverable

1. Rails API controllers that securely validate and process all custom mutations with proper JWT-based user authentication
2. Server-side implementations of all client mutators with mathematical consistency guaranteed through extensive automated testing
3. Comprehensive security layer that prevents user attribution forgery and unauthorized mutations while maintaining real-time collaboration capabilities

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-22-rails-server-side-mutators/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-22-rails-server-side-mutators/sub-specs/technical-spec.md
- API Specification: @.agent-os/specs/2025-07-22-rails-server-side-mutators/sub-specs/api-spec.md
- Tests Specification: @.agent-os/specs/2025-07-22-rails-server-side-mutators/sub-specs/tests.md