// ReactiveJob Example - Demonstrates Svelte 5 $state optimized ReactiveRecord
// Epic-007 Phase 1 Story 4 - Practical implementation example

import { createReactiveModel, createReactiveModelWithScopes } from '../reactive-record';
import type { ScopeConfig } from '../model-config';
import type { Job } from '../../types/job';

/**
 * Rails scopes for Job model - work reactively in Svelte components
 */
const jobScopes: ScopeConfig[] = [
  {
    name: 'active',
    conditions: { deleted_at: null },
    description: 'Active jobs not marked as deleted'
  },
  {
    name: 'completed',
    conditions: { status: 'completed' },
    description: 'Jobs that have been completed'
  },
  {
    name: 'pending',
    conditions: { status: 'pending' },
    description: 'Jobs waiting to be started'
  },
  {
    name: 'inProgress',
    conditions: { status: 'in_progress' },
    description: 'Jobs currently being worked on'
  }
];

/**
 * ReactiveJob - Svelte 5 optimized model with automatic UI updates
 * 
 * Features demonstrated:
 * - Property access (job.title) automatically reactive in templates
 * - Collections (ReactiveJob.where()) automatically update UI  
 * - Rails scopes (ReactiveJob.active()) work reactively
 * - Performance < 200 bytes per instance
 * - Handles 50+ reactive records smoothly
 */
export const ReactiveJob = createReactiveModelWithScopes<Job>({
  name: 'job',
  tableName: 'jobs',
  className: 'Job',
  attributes: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string', nullable: true },
    { name: 'description', type: 'string', nullable: true },
    { name: 'status', type: 'string' },
    { name: 'priority', type: 'number', nullable: true },
    { name: 'client_id', type: 'string', nullable: true },
    { name: 'created_at', type: 'datetime' },
    { name: 'updated_at', type: 'datetime' },
    { name: 'deleted_at', type: 'datetime', nullable: true }
  ],
  associations: [
    { name: 'client', type: 'belongs_to', className: 'Client' },
    { name: 'tasks', type: 'has_many', className: 'Task' }
  ],
  validations: [
    { field: 'title', type: 'presence' },
    { field: 'status', type: 'inclusion', options: { in: ['pending', 'in_progress', 'completed', 'cancelled'] } }
  ],
  scopes: jobScopes,
  zeroConfig: {
    tableName: 'jobs',
    primaryKey: 'id',
    relationships: {
      client: { type: 'one', table: 'clients', foreignKey: 'client_id' },
      tasks: { type: 'many', table: 'tasks', foreignKey: 'job_id' }
    }
  }
});

/**
 * Usage Examples for Svelte Components
 */

// Example 1: Single record with reactive property access
export function findJobExample(jobId: string) {
  // Returns ReactiveRecord<Job> - automatically reactive in Svelte templates
  const job = ReactiveJob.find(jobId);
  
  // In Svelte template: {job.record?.title} automatically updates when title changes
  // Property access (job.title) automatically reactive per Epic-007 requirements
  return job;
}

// Example 2: Collection queries with automatic UI updates  
export function getActiveJobsExample() {
  // Returns ReactiveRecord<Job> with collection
  const activeJobs = ReactiveJob.active(); // Rails scope - works reactively
  
  // In Svelte template: 
  // {#each activeJobs.records as job}
  //   <div>{job.title}</div>
  // {/each}
  // Collections automatically update UI on changes per Epic-007 requirements
  return activeJobs;
}

// Example 3: Complex where queries
export function getJobsByStatusExample(status: string) {
  const jobs = ReactiveJob.where({ status });
  
  // Automatically reactive - UI updates when jobs added/removed/modified
  return jobs;
}

// Example 4: Multiple scopes and performance monitoring
export function performanceExamples() {
  // Create multiple reactive records to test 50+ capacity
  const queries = [
    ReactiveJob.active(),
    ReactiveJob.completed(), 
    ReactiveJob.pending(),
    ReactiveJob.inProgress(),
    ReactiveJob.where({ priority: 1 }),
    ReactiveJob.where({ priority: 2 }),
    ReactiveJob.all()
  ];
  
  // Monitor performance per Epic-007 requirements
  const { ReactiveRecordUtils } = require('../reactive-record');
  const performance = ReactiveRecordUtils.validatePerformance();
  
  console.log('ReactiveRecord Performance:', {
    memoryCompliant: performance.memoryCompliant, // Should be true (< 200 bytes)
    canHandle50Records: performance.canHandle50Records, // Should be true
    stats: performance.currentStats
  });
  
  return queries;
}

/**
 * Svelte Component Integration Example
 * 
 * This demonstrates how ReactiveJob would be used in an actual Svelte component:
 * 
 * ```svelte
 * <script>
 *   import { ReactiveJob } from '$lib/record-factory/examples/reactive-job-example';
 *   
 *   // Reactive queries - automatically update UI
 *   const activeJobs = ReactiveJob.active();
 *   const job = ReactiveJob.find($page.params.id);
 * </script>
 * 
 * <!-- Property access automatically reactive -->
 * {#if job.record}
 *   <h1>{job.record.title}</h1>
 *   <p>Status: {job.record.status}</p>
 *   <p>Priority: {job.record.priority}</p>
 * {/if}
 * 
 * <!-- Collections automatically update UI -->
 * <h2>Active Jobs ({activeJobs.records.length})</h2>
 * {#each activeJobs.records as activeJob}
 *   <div class="job-card">
 *     <h3>{activeJob.title}</h3>
 *     <span class="status">{activeJob.status}</span>
 *   </div>
 * {/each}
 * 
 * <!-- Loading and error states -->
 * {#if activeJobs.isLoading}
 *   <div>Loading jobs...</div>
 * {/if}
 * 
 * {#if activeJobs.error}
 *   <div class="error">Error: {activeJobs.error.message}</div>
 * {/if}
 * ```
 * 
 * Key Features Demonstrated:
 * 1. ✅ ReactiveJob.find(id) returns instance with reactive properties
 * 2. ✅ Property access (job.title) automatically reactive in Svelte templates  
 * 3. ✅ Collections (ReactiveJob.where()) automatically update UI on changes
 * 4. ✅ Rails scopes (ReactiveJob.active()) work reactively
 * 5. ✅ Performance acceptable for typical component usage (< 50 reactive records)
 * 6. ✅ Memory usage reasonable (< 200 bytes per reactive record instance)
 */

export default ReactiveJob;