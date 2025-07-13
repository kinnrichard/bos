// Zero - Complete export file
// All Zero mutations, queries, and client functionality

// Zero client initialization and management
export { initZero, getZero, getZeroAsync, getZeroState, closeZero, reinitializeZero } from './zero-client';

// Zero schema types
export { schema, type ZeroClient } from './generated-schema';

// All model mutations and ActiveRecord-style queries
// Includes: User, Client, Job, Task, ActivityLog, ContactMethod, JobTarget, Note, ScheduledDateTime
// Each with: create*, update*, delete*, *.find(), *.all(), *.where(), etc.
export * from './activity_log.generated';
export * from './client.generated';
export * from './contact_method.generated';
export * from './job.generated';
export * from './job_target.generated';
export * from './note.generated';
export * from './scheduled_date_time.generated';
export * from './task.generated';
export * from './user.generated';

// Re-export Zero library types
export type { Zero } from '@rocicorp/zero';