/**
 * ReactiveScheduledDateTimeUser - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for scheduled_date_time_users table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use ScheduledDateTimeUser instead:
 * ```typescript
 * import { ScheduledDateTimeUser } from './scheduled-date-time-user';
 * ```
 * 
 * Generated: 2025-07-14 23:41:09 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { ScheduledDateTimeUserData, CreateScheduledDateTimeUserData, UpdateScheduledDateTimeUserData } from './types/scheduled-date-time-user-data';

/**
 * ReactiveRecord configuration for ScheduledDateTimeUser
 */
const ReactiveScheduledDateTimeUserConfig = {
  tableName: 'scheduled_date_time_users',
  className: 'ReactiveScheduledDateTimeUser',
  primaryKey: 'id'
};

/**
 * ReactiveScheduledDateTimeUser ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveScheduledDateTimeUser } from '$lib/models/reactive-scheduled-date-time-user';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const scheduled_date_time_userQuery = ReactiveScheduledDateTimeUser.find('123');
 *   
 *   // Access reactive data
 *   $: scheduled_date_time_user = scheduled_date_time_userQuery.data;
 *   $: isLoading = scheduled_date_time_userQuery.isLoading;
 *   $: error = scheduled_date_time_userQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if scheduled_date_time_user}
 *   <p>{scheduled_date_time_user.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newScheduledDateTimeUser = await ReactiveScheduledDateTimeUser.create({ title: 'New Task' });
 * await ReactiveScheduledDateTimeUser.update('123', { title: 'Updated' });
 * await ReactiveScheduledDateTimeUser.discard('123');
 * 
 * // Reactive queries
 * const allScheduledDateTimeUsersQuery = ReactiveScheduledDateTimeUser.all().all();
 * const activeScheduledDateTimeUsersQuery = ReactiveScheduledDateTimeUser.kept().all();
 * ```
 */
export const ReactiveScheduledDateTimeUser = createReactiveRecord<ScheduledDateTimeUserData>(ReactiveScheduledDateTimeUserConfig);

/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveScheduledDateTimeUser as ScheduledDateTimeUser } from './reactive-scheduled-date-time-user';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const scheduled_date_time_userQuery = ScheduledDateTimeUser.find('123');
 * ```
 */
export { ReactiveScheduledDateTimeUser as ScheduledDateTimeUser };

// Export types for convenience
export type { ScheduledDateTimeUserData, CreateScheduledDateTimeUserData, UpdateScheduledDateTimeUserData };

// Default export
export default ReactiveScheduledDateTimeUser;
