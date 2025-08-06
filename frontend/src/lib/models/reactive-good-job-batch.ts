/**
 * ReactiveGoodJobBatch - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for good_job_batches table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use GoodJobBatch instead:
 * ```typescript
 * import { GoodJobBatch } from './good-job-batch';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  GoodJobBatchData,
  CreateGoodJobBatchData,
  UpdateGoodJobBatchData,
} from './types/good-job-batch-data';

/**
 * ReactiveRecord configuration for GoodJobBatch
 */
const ReactiveGoodJobBatchConfig = {
  tableName: 'good_job_batches',
  className: 'ReactiveGoodJobBatch',
  primaryKey: 'id',
  supportsDiscard: true,
};

/**
 * ReactiveGoodJobBatch ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveGoodJobBatch } from '$lib/models/reactive-good-job-batch';
 *
 *   // Reactive query - automatically updates when data changes
 *   const good_job_batchQuery = ReactiveGoodJobBatch.find('123');
 *
 *   // Access reactive data
 *   $: good_job_batch = good_job_batchQuery.data;
 *   $: isLoading = good_job_batchQuery.isLoading;
 *   $: error = good_job_batchQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if good_job_batch}
 *   <p>{good_job_batch.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allGoodJobBatchsQuery = ReactiveGoodJobBatch.all().all();
 * const activeGoodJobBatchsQuery = ReactiveGoodJobBatch.kept().all();
 * const singleGoodJobBatchQuery = ReactiveGoodJobBatch.find('123');
 *
 * // With relationships
 * const good_job_batchWithRelationsQuery = ReactiveGoodJobBatch
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredGoodJobBatchsQuery = ReactiveGoodJobBatch
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * const discardedGoodJobBatchs = await GoodJobBatch.discarded().all();
 * ```
 */
export const ReactiveGoodJobBatch = createReactiveRecord<GoodJobBatchData>(
  ReactiveGoodJobBatchConfig
);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveGoodJobBatch as GoodJobBatch } from './reactive-good-job-batch';
 *
 * // Use like ActiveRecord but with reactive queries
 * const good_job_batchQuery = GoodJobBatch.find('123');
 * ```
 */
export { ReactiveGoodJobBatch as GoodJobBatch };

// Export types for convenience
export type { GoodJobBatchData, CreateGoodJobBatchData, UpdateGoodJobBatchData };

// Default export
export default ReactiveGoodJobBatch;
