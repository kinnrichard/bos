// Zero - Complete export file
// All Zero mutations, queries, and client functionality

// Zero client initialization and management
export { initZero, getZero, getZeroAsync, getZeroState, closeZero, reinitializeZero } from './zero-client';

// Zero schema types
export { schema, type ZeroClient } from './generated-schema';

// All model mutations and ActiveRecord-style queries
// Includes: User, Client, Job, Task, ActivityLog, ContactMethod, JobTarget, Note, ScheduledDateTime
// Each with: create*, update*, delete*, *.find(), *.all(), *.where(), etc.
export * from './models';

// Re-export Zero library types
export type { Zero } from '@rocicorp/zero';