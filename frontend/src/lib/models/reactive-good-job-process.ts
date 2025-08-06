/**
 * ReactiveGoodJobProcess - ReactiveRecord model (Svelte 5 reactive)
 *
 * Read-only reactive Rails-compatible model for good_job_processes table.
 * Automatically updates Svelte components when data changes.
 *
 * For mutations (create/update/delete) or non-reactive contexts, use GoodJobProcess instead:
 * ```typescript
 * import { GoodJobProcess } from './good-job-process';
 * ```
 *
 * Generated: 2025-08-05 22:30:27 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  GoodJobProcessData,
  CreateGoodJobProcessData,
  UpdateGoodJobProcessData,
} from './types/good-job-process-data';

/**
 * ReactiveRecord configuration for GoodJobProcess
 */
const ReactiveGoodJobProcessConfig = {
  tableName: 'good_job_processes',
  className: 'ReactiveGoodJobProcess',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveGoodJobProcess ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveGoodJobProcess } from '$lib/models/reactive-good-job-process';
 *
 *   // Reactive query - automatically updates when data changes
 *   const good_job_processQuery = ReactiveGoodJobProcess.find('123');
 *
 *   // Access reactive data
 *   $: good_job_process = good_job_processQuery.data;
 *   $: isLoading = good_job_processQuery.isLoading;
 *   $: error = good_job_processQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if good_job_process}
 *   <p>{good_job_process.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Reactive queries that automatically update
 * const allGoodJobProcesssQuery = ReactiveGoodJobProcess.all().all();
 * const activeGoodJobProcesssQuery = ReactiveGoodJobProcess.kept().all();
 * const singleGoodJobProcessQuery = ReactiveGoodJobProcess.find('123');
 *
 * // With relationships
 * const good_job_processWithRelationsQuery = ReactiveGoodJobProcess
 *   .includes('client', 'tasks')
 *   .find('123');
 *
 * // Complex queries
 * const filteredGoodJobProcesssQuery = ReactiveGoodJobProcess
 *   .where({ status: 'active' })
 *   .orderBy('created_at', 'desc')
 *   .limit(10)
 *   .all();
 * ```
 */
export const ReactiveGoodJobProcess = createReactiveRecord<GoodJobProcessData>(
  ReactiveGoodJobProcessConfig
);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveGoodJobProcess as GoodJobProcess } from './reactive-good-job-process';
 *
 * // Use like ActiveRecord but with reactive queries
 * const good_job_processQuery = GoodJobProcess.find('123');
 * ```
 */
export { ReactiveGoodJobProcess as GoodJobProcess };

// Export types for convenience
export type { GoodJobProcessData, CreateGoodJobProcessData, UpdateGoodJobProcessData };

// Default export
export default ReactiveGoodJobProcess;
