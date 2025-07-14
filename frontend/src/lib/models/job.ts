/**
 * Job - ActiveRecord model (non-reactive)
 * 
 * Promise-based Rails-compatible model for jobs table.
 * Use this for server-side code, Node.js scripts, or non-reactive contexts.
 * 
 * For reactive Svelte components, use ReactiveJob instead:
 * ```typescript
 * import { ReactiveJob as Job } from './reactive-job';
 * ```
 * 
 * Generated: 2025-07-14 23:41:09 UTC
 */

import { createActiveRecord } from './base/active-record';
import type { JobData, CreateJobData, UpdateJobData } from './types/job-data';

/**
 * ActiveRecord configuration for Job
 */
const JobConfig = {
  tableName: 'jobs',
  className: 'Job',
  primaryKey: 'id'
};

/**
 * Job ActiveRecord instance
 * 
 * @example
 * ```typescript
 * // Find by ID (throws if not found)
 * const job = await Job.find('123');
 * 
 * // Find by conditions (returns null if not found)
 * const job = await Job.findBy({ title: 'Test' });
 * 
 * // Create new record
 * const newJob = await Job.create({ title: 'New Task' });
 * 
 * // Update existing record
 * const updatedJob = await Job.update('123', { title: 'Updated' });
 * 
 * // Soft delete (discard gem)
 * await Job.discard('123');
 * 
 * // Restore discarded
 * await Job.undiscard('123');
 * 
 * // Query with scopes
 * const allJobs = await Job.all().all();
 * const activeJobs = await Job.kept().all();
 * ```
 */
export const Job = createActiveRecord<JobData>(JobConfig);

// Export types for convenience
export type { JobData, CreateJobData, UpdateJobData };

// Default export
export default Job;
