/**
 * ReactiveJobTarget - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for job_targets table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use JobTarget instead:
 * ```typescript
 * import { JobTarget } from './job-target';
 * ```
 * 
 * Generated: 2025-07-15 02:54:59 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { JobTargetData, CreateJobTargetData, UpdateJobTargetData } from './types/job-target-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for JobTarget
 */
const ReactiveJobTargetConfig = {
  tableName: 'job_targets',
  className: 'ReactiveJobTarget',
  primaryKey: 'id',
  supportsDiscard: false
};

/**
 * ReactiveJobTarget ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveJobTarget } from '$lib/models/reactive-job-target';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const job_targetQuery = ReactiveJobTarget.find('123');
 *   
 *   // Access reactive data
 *   $: job_target = job_targetQuery.data;
 *   $: isLoading = job_targetQuery.isLoading;
 *   $: error = job_targetQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if job_target}
 *   <p>{job_target.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newJobTarget = await ReactiveJobTarget.create({ title: 'New Task' });
 * await ReactiveJobTarget.update('123', { title: 'Updated' });
 * await ReactiveJobTarget.discard('123');
 * 
 * // Reactive queries
 * const allJobTargetsQuery = ReactiveJobTarget.all().all();
 * const activeJobTargetsQuery = ReactiveJobTarget.kept().all();
 * ```
 */
export const ReactiveJobTarget = createReactiveRecord<JobTargetData>(ReactiveJobTargetConfig);

// Epic-009: Register model relationships for includes() functionality
// No relationships defined for this model

/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveJobTarget as JobTarget } from './reactive-job-target';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const job_targetQuery = JobTarget.find('123');
 * ```
 */
export { ReactiveJobTarget as JobTarget };

// Export types for convenience
export type { JobTargetData, CreateJobTargetData, UpdateJobTargetData };

// Default export
export default ReactiveJobTarget;
