/**
 * ReactiveGoodJob - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for good_jobs table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use GoodJob instead:
 * ```typescript
 * import { GoodJob } from './good-job';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { GoodJobData, CreateGoodJobData, UpdateGoodJobData } from './types/good-job-data';

/**
 * ReactiveRecord configuration for GoodJob
 */
const ReactiveGoodJobConfig = {
  tableName: 'good_jobs',
  className: 'ReactiveGoodJob',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveGoodJob ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveGoodJob } from '$lib/models/reactive-good-job';
 *
 *   // Reactive query - automatically updates when data changes
 *   const good_jobQuery = ReactiveGoodJob.find('123');
 *
 *   // Access reactive data
 *   $: good_job = good_jobQuery.data;
 *   $: isLoading = good_jobQuery.isLoading;
 *   $: error = good_jobQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if good_job}
 *   <p>{good_job.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allGoodJobsQuery = ReactiveGoodJob.all().all();
 * const activeGoodJobsQuery = ReactiveGoodJob.kept().all();
 * const singleGoodJobQuery = ReactiveGoodJob.find('123');
 *
 * // With relationships
 * const good_jobWithRelationsQuery = ReactiveGoodJob
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredGoodJobsQuery = ReactiveGoodJob
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * ```
 */
export const ReactiveGoodJob = createReactiveRecord<GoodJobData>(ReactiveGoodJobConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveGoodJob as GoodJob } from './reactive-good-job';
 *
 * // Use like ActiveRecord but with reactive queries
 * const good_jobQuery = GoodJob.find('123');
 * ```
 */
export { ReactiveGoodJob as GoodJob };

// Export types for convenience
export type { GoodJobData, CreateGoodJobData, UpdateGoodJobData };

// Default export
export default ReactiveGoodJob;
