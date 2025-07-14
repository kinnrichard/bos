/**
 * ReactiveJobAssignment - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for job_assignments table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use JobAssignment instead:
 * ```typescript
 * import { JobAssignment } from './job-assignment';
 * ```
 * 
 * Generated: 2025-07-14 15:18:58 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { JobAssignmentData, CreateJobAssignmentData, UpdateJobAssignmentData } from './types/job-assignment-data';

/**
 * ReactiveRecord configuration for JobAssignment
 */
const ReactiveJobAssignmentConfig = {
  tableName: 'job_assignments',
  className: 'ReactiveJobAssignment',
  primaryKey: 'id'
};

/**
 * ReactiveJobAssignment ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveJobAssignment } from '$lib/models/reactive-job-assignment';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const job_assignmentQuery = ReactiveJobAssignment.find('123');
 *   
 *   // Access reactive data
 *   $: job_assignment = job_assignmentQuery.data;
 *   $: isLoading = job_assignmentQuery.isLoading;
 *   $: error = job_assignmentQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if job_assignment}
 *   <p>{job_assignment.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newJobAssignment = await ReactiveJobAssignment.create({ title: 'New Task' });
 * await ReactiveJobAssignment.update('123', { title: 'Updated' });
 * await ReactiveJobAssignment.discard('123');
 * 
 * // Reactive queries
 * const allJobAssignmentsQuery = ReactiveJobAssignment.all().all();
 * const activeJobAssignmentsQuery = ReactiveJobAssignment.kept().all();
 * ```
 */
export const ReactiveJobAssignment = createReactiveRecord<JobAssignmentData>(ReactiveJobAssignmentConfig);

/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveJobAssignment as JobAssignment } from './reactive-job-assignment';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const job_assignmentQuery = JobAssignment.find('123');
 * ```
 */
export { ReactiveJobAssignment as JobAssignment };

// Export types for convenience
export type { JobAssignmentData, CreateJobAssignmentData, UpdateJobAssignmentData };

// Default export
export default ReactiveJobAssignment;
