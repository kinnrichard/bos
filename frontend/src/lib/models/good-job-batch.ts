/**
 * GoodJobBatch - ActiveRecord model (non-reactive)
 *
 * Promise-based Rails-compatible model for good_job_batches table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 *
 * For reactive Svelte components, use ReactiveGoodJobBatch instead:
 * ```typescript
 * import { ReactiveGoodJobBatch as GoodJobBatch } from './reactive-good-job-batch';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createActiveRecord } from './base/active-record';
import type {
  GoodJobBatchData,
  CreateGoodJobBatchData,
  UpdateGoodJobBatchData,
} from './types/good-job-batch-data';

/**
 * ActiveRecord configuration for GoodJobBatch
 */
const GoodJobBatchConfig = {
  tableName: 'good_job_batches',
  className: 'GoodJobBatch',
  primaryKey: 'id',
  supportsDiscard: true,
};

/**
 * GoodJobBatch ActiveRecord instance
 *
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const good_job_batch = await GoodJobBatch.find('123');
 *
 * // Find by conditions (returns null if not found)
 * const good_job_batch = await GoodJobBatch.findBy({ title: 'Test' });
 *
 * // Create new record
 * const newGoodJobBatch = await GoodJobBatch.create({ title: 'New Task' });
 *
 * // Update existing record
 * const updatedGoodJobBatch = await GoodJobBatch.update('123', { title: 'Updated' });
 *
 * // Soft delete (discard gem)
 * await GoodJobBatch.discard('123');
 *
 * // Restore discarded
 * await GoodJobBatch.undiscard('123');
 *
 * // Query with scopes
 * const allGoodJobBatchs = await GoodJobBatch.all().all();
 * const activeGoodJobBatchs = await GoodJobBatch.kept().all();
 * const discardedGoodJobBatchs = await GoodJobBatch.discarded().all();
 * ```
 */
export const GoodJobBatch = createActiveRecord<GoodJobBatchData>(GoodJobBatchConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

// Export types for convenience
export type { GoodJobBatchData, CreateGoodJobBatchData, UpdateGoodJobBatchData };

// Default export
export default GoodJobBatch;
