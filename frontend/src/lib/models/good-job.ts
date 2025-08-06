/**
 * GoodJob - ActiveRecord model (non-reactive)
 *
 * Promise-based Rails-compatible model for good_jobs table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 *
 * For reactive Svelte components, use ReactiveGoodJob instead:
 * ```typescript
 * import { ReactiveGoodJob as GoodJob } from './reactive-good-job';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { GoodJobData, CreateGoodJobData, UpdateGoodJobData } from './types/good-job-data';

/**
 * ActiveRecord configuration for GoodJob
 */
const GoodJobConfig = {
  tableName: 'good_jobs',
  className: 'GoodJob',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * GoodJob ActiveRecord instance
 *
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const good_job = await GoodJob.find('123');
 *
 * // Find by conditions (returns null if not found)
 * const good_job = await GoodJob.findBy({ title: 'Test' });
 *
 * // Create new record
 * const newGoodJob = await GoodJob.create({ title: 'New Task' });
 *
 * // Update existing record
 * const updatedGoodJob = await GoodJob.update('123', { title: 'Updated' });
 *
 * // Soft delete (discard gem)
 * await GoodJob.discard('123');
 *
 * // Restore discarded
 * await GoodJob.undiscard('123');
 *
 * // Query with scopes
 * const allGoodJobs = await GoodJob.all().all();
 * const activeGoodJobs = await GoodJob.kept().all();
 * ```
 */
export const GoodJob = createActiveRecord<GoodJobData>(GoodJobConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type { GoodJobData, CreateGoodJobData, UpdateGoodJobData };

// Default export
export default GoodJob;
