// Zero - Complete export file
// All Zero mutations, queries, and client functionality

// Zero client initialization and management
export { initZero, getZero, getZeroAsync, getZeroState, closeZero, reinitializeZero } from './zero-client';

// Zero schema types
export { schema, type ZeroClient } from './generated-schema';

// Epic-008 models now live in /lib/models/ instead of legacy .generated files
// Use the Epic-008 models directly:
// import { User, ReactiveUser } from '$lib/models/user';
// import { Task, ReactiveTask } from '$lib/models/reactive-task';
// 
// Legacy .generated.ts files have been removed as part of Epic-008 cleanup

// Re-export Zero library types
export type { Zero } from '@rocicorp/zero';