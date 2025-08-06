/**
 * GoodJobProcess - ActiveRecord model (non-reactive)
 *
 * Promise-based Rails-compatible model for good_job_processes table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 *
 * For reactive Svelte components, use ReactiveGoodJobProcess instead:
 * ```typescript
 * import { ReactiveGoodJobProcess as GoodJobProcess } from './reactive-good-job-process';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createActiveRecord } from './base/active-record';
import type {
  GoodJobProcessData,
  CreateGoodJobProcessData,
  UpdateGoodJobProcessData,
} from './types/good-job-process-data';

/**
 * ActiveRecord configuration for GoodJobProcess
 */
const GoodJobProcessConfig = {
  tableName: 'good_job_processes',
  className: 'GoodJobProcess',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * GoodJobProcess ActiveRecord instance
 *
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const good_job_process = await GoodJobProcess.find('123');
 *
 * // Find by conditions (returns null if not found)
 * const good_job_process = await GoodJobProcess.findBy({ title: 'Test' });
 *
 * // Create new record
 * const newGoodJobProcess = await GoodJobProcess.create({ title: 'New Task' });
 *
 * // Update existing record
 * const updatedGoodJobProcess = await GoodJobProcess.update('123', { title: 'Updated' });
 *
 * // Soft delete (discard gem)
 * await GoodJobProcess.discard('123');
 *
 * // Restore discarded
 * await GoodJobProcess.undiscard('123');
 *
 * // Query with scopes
 * const allGoodJobProcesss = await GoodJobProcess.all().all();
 * const activeGoodJobProcesss = await GoodJobProcess.kept().all();
 * ```
 */
export const GoodJobProcess = createActiveRecord<GoodJobProcessData>(GoodJobProcessConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type { GoodJobProcessData, CreateGoodJobProcessData, UpdateGoodJobProcessData };

// Default export
export default GoodJobProcess;
