/**
 * GoodJobExecution - ActiveRecord model (non-reactive)
 *
 * Promise-based Rails-compatible model for good_job_executions table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 *
 * For reactive Svelte components, use ReactiveGoodJobExecution instead:
 * ```typescript
 * import { ReactiveGoodJobExecution as GoodJobExecution } from './reactive-good-job-execution';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createActiveRecord } from './base/active-record';
import type {
  GoodJobExecutionData,
  CreateGoodJobExecutionData,
  UpdateGoodJobExecutionData,
} from './types/good-job-execution-data';

/**
 * ActiveRecord configuration for GoodJobExecution
 */
const GoodJobExecutionConfig = {
  tableName: 'good_job_executions',
  className: 'GoodJobExecution',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * GoodJobExecution ActiveRecord instance
 *
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const good_job_execution = await GoodJobExecution.find('123');
 *
 * // Find by conditions (returns null if not found)
 * const good_job_execution = await GoodJobExecution.findBy({ title: 'Test' });
 *
 * // Create new record
 * const newGoodJobExecution = await GoodJobExecution.create({ title: 'New Task' });
 *
 * // Update existing record
 * const updatedGoodJobExecution = await GoodJobExecution.update('123', { title: 'Updated' });
 *
 * // Soft delete (discard gem)
 * await GoodJobExecution.discard('123');
 *
 * // Restore discarded
 * await GoodJobExecution.undiscard('123');
 *
 * // Query with scopes
 * const allGoodJobExecutions = await GoodJobExecution.all().all();
 * const activeGoodJobExecutions = await GoodJobExecution.kept().all();
 * ```
 */
export const GoodJobExecution = createActiveRecord<GoodJobExecutionData>(GoodJobExecutionConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type { GoodJobExecutionData, CreateGoodJobExecutionData, UpdateGoodJobExecutionData };

// Default export
export default GoodJobExecution;
