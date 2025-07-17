/**
 * ReactiveJob - ReactiveRecord model (Svelte 5 reactive)
 * 
 * Reactive Rails-compatible model for jobs table.
 * Automatically updates Svelte components when data changes.
 * 
 * For non-reactive contexts, use Job instead:
 * ```typescript
 * import { Job } from './job';
 * ```
 * 
 * Generated: 2025-07-17 12:55:51 UTC
 */

import { createReactiveRecord } from './base/reactive-record';
import type { JobData, CreateJobData, UpdateJobData } from './types/job-data';
import { registerModelRelationships } from './base/scoped-query-base';

/**
 * ReactiveRecord configuration for Job
 */
const ReactiveJobConfig = {
  tableName: 'jobs',
  className: 'ReactiveJob',
  primaryKey: 'id',
  supportsDiscard: false
};

/**
 * ReactiveJob ReactiveRecord instance
 * 
 * @example
 * ```svelte
 * <!-- In Svelte component -->
 * <script>
 *   import { ReactiveJob } from '$lib/models/reactive-job';
 *   
 *   // Reactive query - automatically updates when data changes
 *   const jobQuery = ReactiveJob.find('123');
 *   
 *   // Access reactive data
 *   $: job = jobQuery.data;
 *   $: isLoading = jobQuery.isLoading;
 *   $: error = jobQuery.error;
 * </script>
 * 
 * {#if isLoading}
 *   Loading...
 * {:else if error}
 *   Error: {error.message}
 * {:else if job}
 *   <p>{job.title}</p>
 * {/if}
 * ```
 * 
 * @example
 * ```typescript
 * // Mutation operations (still async)
 * const newJob = await ReactiveJob.create({ title: 'New Task' });
 * await ReactiveJob.update('123', { title: 'Updated' });
 * await ReactiveJob.discard('123');
 * 
 * // Reactive queries
 * const allJobsQuery = ReactiveJob.all().all();
 * const activeJobsQuery = ReactiveJob.kept().all();
 * ```
 */
export const ReactiveJob = createReactiveRecord<JobData>(ReactiveJobConfig);

// Epic-009: Register model relationships for includes() functionality
registerModelRelationships('jobs', {
  client: { type: 'belongsTo', model: 'Client' },
  createdBy: { type: 'belongsTo', model: 'User' },
  activityLogs: { type: 'hasMany', model: 'ActivityLog' },
  jobAssignments: { type: 'hasMany', model: 'JobAssignment' },
  technicians: { type: 'hasMany', model: 'User' },
  jobPeople: { type: 'hasMany', model: 'JobPerson' },
  people: { type: 'hasMany', model: 'Person' },
  tasks: { type: 'hasMany', model: 'Task' },
  allTasks: { type: 'hasMany', model: 'Task' },
  notes: { type: 'hasMany', model: 'Note' },
  scheduledDateTimes: { type: 'hasMany', model: 'ScheduledDateTime' }
});


/**
 * Import alias for easy switching between reactive/non-reactive
 * 
 * @example
 * ```typescript
 * // Use reactive model in Svelte components
 * import { ReactiveJob as Job } from './reactive-job';
 * 
 * // Use like ActiveRecord but with reactive queries
 * const jobQuery = Job.find('123');
 * ```
 */
export { ReactiveJob as Job };

// Export types for convenience
export type { JobData, CreateJobData, UpdateJobData };

// Default export
export default ReactiveJob;
