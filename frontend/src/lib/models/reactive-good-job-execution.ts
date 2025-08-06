/**
 * ReactiveGoodJobExecution - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for good_job_executions table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use GoodJobExecution instead:
 * ```typescript
 * import { GoodJobExecution } from './good-job-execution';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  GoodJobExecutionData,
  CreateGoodJobExecutionData,
  UpdateGoodJobExecutionData,
} from './types/good-job-execution-data';

/**
 * ReactiveRecord configuration for GoodJobExecution
 */
const ReactiveGoodJobExecutionConfig = {
  tableName: 'good_job_executions',
  className: 'ReactiveGoodJobExecution',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveGoodJobExecution ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveGoodJobExecution } from '$lib/models/reactive-good-job-execution';
 *
 *   // Reactive query - automatically updates when data changes
 *   const good_job_executionQuery = ReactiveGoodJobExecution.find('123');
 *
 *   // Access reactive data
 *   $: good_job_execution = good_job_executionQuery.data;
 *   $: isLoading = good_job_executionQuery.isLoading;
 *   $: error = good_job_executionQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if good_job_execution}
 *   <p>{good_job_execution.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allGoodJobExecutionsQuery = ReactiveGoodJobExecution.all().all();
 * const activeGoodJobExecutionsQuery = ReactiveGoodJobExecution.kept().all();
 * const singleGoodJobExecutionQuery = ReactiveGoodJobExecution.find('123');
 *
 * // With relationships
 * const good_job_executionWithRelationsQuery = ReactiveGoodJobExecution
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredGoodJobExecutionsQuery = ReactiveGoodJobExecution
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * ```
 */
export const ReactiveGoodJobExecution = createReactiveRecord<GoodJobExecutionData>(
  ReactiveGoodJobExecutionConfig
);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveGoodJobExecution as GoodJobExecution } from './reactive-good-job-execution';
 *
 * // Use like ActiveRecord but with reactive queries
 * const good_job_executionQuery = GoodJobExecution.find('123');
 * ```
 */
export { ReactiveGoodJobExecution as GoodJobExecution };

// Export types for convenience
export type { GoodJobExecutionData, CreateGoodJobExecutionData, UpdateGoodJobExecutionData };

// Default export
export default ReactiveGoodJobExecution;
