/**
 * ActivityLog - ActiveRecord model (non-reactive)
 * 
 * Promise-based Rails-compatible model for activity_logs table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 * 
 * For reactive Svelte components, use ReactiveActivityLog instead:
 * ```typescript
 * import { ReactiveActivityLog as ActivityLog } from './reactive-activity-log';
 * ```
 * 
 * Generated: 2025-07-14 15:18:58 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { ActivityLogData, CreateActivityLogData, UpdateActivityLogData } from './types/activity-log-data';

/**
 * ActiveRecord configuration for ActivityLog
 */
const ActivityLogConfig = {
  tableName: 'activity_logs',
  className: 'ActivityLog',
  primaryKey: 'id'
};

/**
 * ActivityLog ActiveRecord instance
 * 
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const activity_log = await ActivityLog.find('123');
 * 
 * // Find by conditions (returns null if not found)
 * const activity_log = await ActivityLog.findBy({ title: 'Test' });
 * 
 * // Create new record
 * const newActivityLog = await ActivityLog.create({ title: 'New Task' });
 * 
 * // Update existing record
 * const updatedActivityLog = await ActivityLog.update('123', { title: 'Updated' });
 * 
 * // Soft delete (discard gem)
 * await ActivityLog.discard('123');
 * 
 * // Restore discarded
 * await ActivityLog.undiscard('123');
 * 
 * // Query with scopes
 * const allActivityLogs = await ActivityLog.all().all();
 * const activeActivityLogs = await ActivityLog.kept().all();
 * ```
 */
export const ActivityLog = createActiveRecord<ActivityLogData>(ActivityLogConfig);

// Export types for convenience
export type { ActivityLogData, CreateActivityLogData, UpdateActivityLogData };

// Default export
export default ActivityLog;
