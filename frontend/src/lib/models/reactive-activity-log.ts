/**
 * ReactiveActivityLog - ReactiveRecord model (Svelte 5 reactive)
 *
 * Reactive Rails-compatible model for activity_logs table.
 * Automatically updates Svelte components when data changes.
 *
 * For non-reactive contexts, use ActivityLog instead:
 * ```typescript
 * import { ActivityLog } from './activity-log';
 * ```
 *
 * Generated: 2025-07-26 11:37:59 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  ActivityLogData,
  CreateActivityLogData,
  UpdateActivityLogData,
} from './types/activity-log-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for ActivityLog
 */
const ReactiveActivityLogConfig = {
  tableName: 'activity_logs',
  className: 'ReactiveActivityLog',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveActivityLog ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveActivityLog } from '$lib/models/reactive-activity-log';
 *
 *   // Reactive query - automatically updates when data changes
 *   const activity_logQuery = ReactiveActivityLog.find('123');
 *
 *   // Access reactive data
 *   $: activity_log = activity_logQuery.data;
 *   $: isLoading = activity_logQuery.isLoading;
 *   $: error = activity_logQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if activity_log}
 *   <p>{activity_log.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newActivityLog = await ReactiveActivityLog.create({ title: 'New Task' });
 * await ReactiveActivityLog.update('123', { title: 'Updated' });
 * await ReactiveActivityLog.discard('123');
 *
 * // Reactive queries
 * const allActivityLogsQuery = ReactiveActivityLog.all().all();
 * const activeActivityLogsQuery = ReactiveActivityLog.kept().all();
 * ```
 */
export const ReactiveActivityLog = createReactiveRecord<ActivityLogData>(ReactiveActivityLogConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('activity_logs', {
  user: { type: 'belongsTo', model: 'User' },
  client: { type: 'belongsTo', model: 'Client' },
  job: { type: 'belongsTo', model: 'Job' },
});

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveActivityLog as ActivityLog } from './reactive-activity-log';
 *
 * // Use like ActiveRecord but with reactive queries
 * const activity_logQuery = ActivityLog.find('123');
 * ```
 */
export { ReactiveActivityLog as ActivityLog };

// Export types for convenience
export type { ActivityLogData, CreateActivityLogData, UpdateActivityLogData };

// Default export
export default ReactiveActivityLog;
