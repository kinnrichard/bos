/**
 * ReactiveJobPerson - ReactiveRecord model (Svelte 5 reactive)
 *
 * Reactive Rails-compatible model for job_people table.
 * Automatically updates Svelte components when data changes.
 *
 * For non-reactive contexts, use JobPerson instead:
 * ```typescript
 * import { JobPerson } from './job-person';
 * ```
 *
 * Generated: 2025-07-27 19:25:41 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type {
  JobPersonData,
  CreateJobPersonData,
  UpdateJobPersonData,
} from './types/job-person-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for JobPerson
 */
const ReactiveJobPersonConfig = {
  tableName: 'job_people',
  className: 'ReactiveJobPerson',
  primaryKey: 'id',
  supportsDiscard: false,
};

/**
 * ReactiveJobPerson ReactiveRecord instance
 *
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveJobPerson } from '$lib/models/reactive-job-person';
 *
 *   // Reactive query - automatically updates when data changes
 *   const job_personQuery = ReactiveJobPerson.find('123');
 *
 *   // Access reactive data
 *   $: job_person = job_personQuery.data;
 *   $: isLoading = job_personQuery.isLoading;
 *   $: error = job_personQuery.error;
 * </script>
 *
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if job_person}
 *   <p>{job_person.title}</p>
 * {/if}
 * ```
 *
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newJobPerson = await ReactiveJobPerson.create({ title: 'New Task' });
 * await ReactiveJobPerson.update('123', { title: 'Updated' });
 * await ReactiveJobPerson.discard('123');
 *
 * // Reactive queries
 * const allJobPersonsQuery = ReactiveJobPerson.all().all();
 * const activeJobPersonsQuery = ReactiveJobPerson.kept().all();
 * ```
 */
export const ReactiveJobPerson = createReactiveRecord<JobPersonData>(ReactiveJobPersonConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('job_people', {
  job: { type: 'belongsTo', model: 'Job' },
  person: { type: 'belongsTo', model: 'Person' },
});

/**
 * Import alias for easy switching between reactive/non-reactive
 *
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveJobPerson as JobPerson } from './reactive-job-person';
 *
 * // Use like ActiveRecord but with reactive queries
 * const job_personQuery = JobPerson.find('123');
 * ```
 */
export { ReactiveJobPerson as JobPerson };

// Export types for convenience
export type { JobPersonData, CreateJobPersonData, UpdateJobPersonData };

// Default export
export default ReactiveJobPerson;
