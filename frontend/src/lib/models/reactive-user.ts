/**
 * ReactiveUser - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for users table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use User instead:
 * ```typescript
 * import { User } from './user';
 * ```
 * 
 * Generated: 2025-07-16 12:57:13 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { UserData, CreateUserData, UpdateUserData } from './types/user-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for User
 */
const ReactiveUserConfig = {
  tableName: 'users',
  className: 'ReactiveUser',
  primaryKey: 'id',
  supportsDiscard: false
};

/**
 * ReactiveUser ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveUser } from '$lib/models/reactive-user';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const userQuery = ReactiveUser.find('123');
 *   
 *   // Access reactive data
 *   $: user = userQuery.data;
 *   $: isLoading = userQuery.isLoading;
 *   $: error = userQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if user}
 *   <p>{user.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newUser = await ReactiveUser.create({ title: 'New Task' });
 * await ReactiveUser.update('123', { title: 'Updated' });
 * await ReactiveUser.discard('123');
 * 
 * // Reactive queries
 * const allUsersQuery = ReactiveUser.all().all();
 * const activeUsersQuery = ReactiveUser.kept().all();
 * ```
 */
export const ReactiveUser = createReactiveRecord<UserData>(ReactiveUserConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('users', {
  activityLogs: { type: 'hasMany', model: 'ActivityLog' },
  assignedJobs: { type: 'hasMany', model: 'Job' },
  assignedTasks: { type: 'hasMany', model: 'Task' },
  jobAssignments: { type: 'hasMany', model: 'JobAssignment' },
  technicianJobs: { type: 'hasMany', model: 'Job' },
  scheduledDateTimeUsers: { type: 'hasMany', model: 'ScheduledDateTimeUser' },
  scheduledDateTimes: { type: 'hasMany', model: 'ScheduledDateTime' },
  notes: { type: 'hasMany', model: 'Note' },
  createdJobs: { type: 'hasMany', model: 'Job' },
  refreshTokens: { type: 'hasMany', model: 'RefreshToken' },
  revokedTokens: { type: 'hasMany', model: 'RevokedToken' }
});


/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveUser as User } from './reactive-user';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const userQuery = User.find('123');
 * ```
 */
export { ReactiveUser as User };

// Export types for convenience
export type { UserData, CreateUserData, UpdateUserData };

// Default export
export default ReactiveUser;
