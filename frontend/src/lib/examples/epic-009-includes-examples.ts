/**
 * Epic-009 Rails-Style includes() Usage Examples
 * 
 * Demonstrates the complete includes() functionality implemented in Epic-009.
 * These examples show Rails-familiar API usage for both ActiveRecord and ReactiveRecord.
 * 
 * Generated: 2025-07-14 Epic-009 Implementation Complete
 */

import { Job } from '../models/job';
import { ReactiveJob } from '../models/reactive-job';

/**
 * ActiveRecord Examples (Promise-based)
 * Use these patterns for server-side code, Node.js scripts, or non-reactive contexts
 */
export class ActiveRecordIncludesExamples {
  
  /**
   * Basic includes() usage - single relationship
   */
  static async singleRelationship() {
    // Rails-style: Job.includes(:client).find(id)
    const job = await Job.includes('client').find('job-123');
    
    // TypeScript knows job.client is loaded
    console.log('Client name:', job?.client?.name);
  }
  
  /**
   * Multiple relationships in one includes() call
   */
  static async multipleRelationships() {
    // Rails-style: Job.includes(:client, :tasks, :job_assignments).where(status: 'open')
    const jobs = await Job.includes('client', 'tasks', 'jobAssignments')
      .where({ status: 'open' })
      .all();
    
    jobs.forEach(job => {
      console.log('Job:', job.title);
      console.log('Client:', job.client.name);
      console.log('Tasks:', job.tasks.length);
      console.log('Assignments:', job.jobAssignments.length);
    });
  }
  
  /**
   * Complex method chaining with includes()
   */
  static async complexChaining() {
    // Rails-style method chaining
    const jobs = await Job.includes('client', 'tasks')
      .where({ status: 'open' })
      .orderBy('created_at', 'desc')
      .limit(10);
    
    return jobs;
  }
  
  /**
   * Using includes() with find - Rails Job.includes(:client).find(id)
   */
  static async includesWithFind() {
    const job = await Job.includes('client', 'createdBy').find('job-123');
    
    if (job) {
      console.log(`Job: ${job.title}`);
      console.log(`Client: ${job.client.name}`);
      console.log(`Created by: ${job.createdBy.email}`);
    }
  }
  
  /**
   * Performance comparison: includes() vs N+1 queries
   */
  static async performanceComparison() {
    // ❌ Bad: N+1 queries (1 query for jobs + N queries for clients)
    const jobsWithoutIncludes = await Job.where({ status: 'open' });
    for (const job of jobsWithoutIncludes) {
      // This triggers a separate query for each job
      const client = await Job.find(job.client_id);
      console.log(`Job ${job.title} - Client: ${client?.name}`);
    }
    
    // ✅ Good: Single query with includes() (1 query total)
    const jobsWithIncludes = await Job.includes('client')
      .where({ status: 'open' });
    
    jobsWithIncludes.forEach(job => {
      // No additional queries - client data already loaded
      console.log(`Job ${job.title} - Client: ${job.client.name}`);
    });
  }
  
  /**
   * Error handling with relationship validation
   */
  static async errorHandling() {
    try {
      // This will throw RelationshipError for invalid relationship
      await Job.includes('invalidRelationship').all();
    } catch (error) {
      if (error.name === 'RelationshipError') {
        console.error('Invalid relationship:', error.message);
        console.error('Valid relationships:', ['client', 'tasks', 'jobAssignments', 'createdBy']);
      }
    }
  }
}

/**
 * ReactiveRecord Examples (Reactive, for Svelte components)
 * Use these patterns in Svelte components for automatic UI updates
 */
export class ReactiveRecordIncludesExamples {
  
  /**
   * Basic reactive includes() usage
   */
  static singleRelationshipReactive() {
    // Returns ReactiveQuery that automatically updates UI
    const jobQuery = ReactiveJob.includes('client').find('job-123');
    
    // In Svelte component:
    // $: job = jobQuery.data;
    // $: isLoading = jobQuery.isLoading;
    // $: if (job) console.log('Client:', job.client.name);
    
    return jobQuery;
  }
  
  /**
   * Multiple relationships with reactive updates
   */
  static multipleRelationshipsReactive() {
    const jobsQuery = ReactiveJob.includes('client', 'tasks', 'jobAssignments')
      .where({ status: 'open' })
      .all();
    
    // In Svelte component:
    // $: jobs = jobsQuery.data;
    // $: jobs.forEach(job => {
    //   console.log('Job:', job.title);
    //   console.log('Client:', job.client.name);
    //   console.log('Task count:', job.tasks.length);
    // });
    
    return jobsQuery;
  }
  
  /**
   * Svelte component integration example
   */
  static svelteComponentExample() {
    // This would be used in a .svelte file like this:
    /*
    <script>
      import { ReactiveJob } from '$lib/models/reactive-job';
      
      export let jobId;
      
      // Reactive query with relationships
      const jobQuery = ReactiveJob.includes('client', 'tasks', 'jobAssignments').find(jobId);
      
      // Reactive derived state
      $: job = jobQuery.data;
      $: isLoading = jobQuery.isLoading;
      $: error = jobQuery.error;
      $: hasClient = job?.client != null;
      $: taskCount = job?.tasks?.length || 0;
    </script>
    
    {#if isLoading}
      <p>Loading job...</p>
    {:else if error}
      <p>Error: {error.message}</p>
    {:else if job}
      <div>
        <h1>{job.title}</h1>
        {#if hasClient}
          <p>Client: {job.client.name}</p>
        {/if}
        <p>Tasks: {taskCount}</p>
        
        {#if job.tasks.length > 0}
          <ul>
            {#each job.tasks as task}
              <li>{task.title}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
    */
  }
}

/**
 * Advanced Usage Patterns
 */
export class AdvancedIncludesPatterns {
  
  /**
   * Conditional relationship loading based on user permissions
   */
  static async conditionalIncludes(userRole: string) {
    let query = Job.where({ status: 'open' });
    
    // Always include client
    query = query.includes('client');
    
    // Include sensitive relationships only for admin users
    if (userRole === 'admin') {
      query = query.includes('jobAssignments', 'activityLogs');
    }
    
    return await query.all();
  }
  
  /**
   * Pagination with includes()
   */
  static async paginatedIncludes(page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    
    return await Job.includes('client', 'tasks')
      .where({ status: 'open' })
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);
  }
  
  /**
   * Search with includes()
   */
  static async searchWithIncludes(searchTerm: string) {
    // Note: This is a simplified example
    // Real implementation would use proper text search
    return await Job.includes('client')
      .where({ title: searchTerm }) // Simplified - would use LIKE or full-text search
      .orderBy('updated_at', 'desc');
  }
  
  /**
   * Dashboard data loading with multiple includes() queries
   */
  static async dashboardData() {
    // Load all dashboard data with relationships in parallel
    const [
      openJobs,
      recentJobs,
      activeClients
    ] = await Promise.all([
      Job.includes('client').where({ status: 'open' }),
      Job.includes('client', 'createdBy').orderBy('created_at', 'desc').limit(5),
      // Note: Client model would need similar includes() implementation
      // Client.includes('jobs').where({ active: true })
    ]);
    
    return {
      openJobs,
      recentJobs,
      activeClients
    };
  }
}

/**
 * Migration Examples - Moving from model-queries.ts to includes()
 */
export class MigrationExamples {
  
  /**
   * Before: Using model-queries.ts (deprecated pattern)
   */
  static beforeMigration() {
    // Old pattern (still works but deprecated):
    // import { queryJobs } from '$lib/zero/model-queries';
    // const jobQuery = queryJobs().includes('client', 'tasks').where('id', jobId).one();
  }
  
  /**
   * After: Using Job.includes() (new pattern)
   */
  static afterMigration() {
    // New Rails-familiar pattern:
    const jobQuery = ReactiveJob.includes('client', 'tasks').find('job-123');
    return jobQuery;
  }
  
  /**
   * Migration checklist for existing components
   */
  static migrationChecklist() {
    /*
    Migration Checklist:
    
    1. ✅ Replace queryJobs() with Job or ReactiveJob
    2. ✅ Replace .includes() chaining with direct .includes() on model
    3. ✅ Replace .where('id', value).one() with .find(value)
    4. ✅ Update imports from model-queries to specific models
    5. ✅ Test that relationships still load correctly
    6. ✅ Verify TypeScript types work with new includes()
    7. ✅ Update tests to use new API patterns
    
    Before:
    import { queryJobs } from '$lib/zero/model-queries';
    const jobQuery = queryJobs().includes('client').where('id', jobId).one();
    
    After:
    import { ReactiveJob } from '$lib/models/reactive-job';
    const jobQuery = ReactiveJob.includes('client').find(jobId);
    */
  }
}

/**
 * Type Safety Examples
 */
export class TypeSafetyExamples {
  
  /**
   * TypeScript autocomplete for relationship names
   */
  static typeSafeRelationships() {
    // TypeScript provides autocomplete for valid relationship names:
    // 'client', 'createdBy', 'jobAssignments', 'tasks', 'activityLogs', 
    // 'jobTargets', 'scheduledDateTimes', 'jobPeople'
    
    const job = Job.includes('client', 'tasks'); // ✅ Valid relationships
    // const job = Job.includes('invalid'); // ❌ TypeScript error
    
    return job;
  }
  
  /**
   * Type-safe access to loaded relationship data
   */
  static async typeSafeAccess() {
    const job = await Job.includes('client', 'tasks').find('job-123');
    
    if (job) {
      // TypeScript knows these relationships are loaded
      const clientName: string = job.client.name;
      const taskCount: number = job.tasks.length;
      const firstTask = job.tasks[0]; // TypeScript knows this is TaskData
      
      return { clientName, taskCount, firstTask };
    }
  }
}

/**
 * Performance Best Practices
 */
export class PerformanceBestPractices {
  
  /**
   * ✅ Good: Load only needed relationships
   */
  static async goodPractice() {
    // Only load relationships you actually use
    const jobs = await Job.includes('client').where({ status: 'open' });
    
    jobs.forEach(job => {
      console.log(`${job.title} - ${job.client.name}`);
    });
  }
  
  /**
   * ❌ Bad: Loading unnecessary relationships
   */
  static async badPractice() {
    // Don't load relationships you don't use
    const jobs = await Job.includes('client', 'tasks', 'jobAssignments', 'activityLogs')
      .where({ status: 'open' });
    
    jobs.forEach(job => {
      // Only using title - other relationships loaded for nothing
      console.log(job.title);
    });
  }
  
  /**
   * ✅ Good: Paginate large relationship collections
   */
  static async paginateLargeCollections() {
    // For models with many relationships, use pagination
    const jobs = await Job.includes('client')
      .where({ status: 'open' })
      .limit(20)
      .offset(0);
    
    return jobs;
  }
  
  /**
   * Memory management: Trust Zero.js
   */
  static memoryManagement() {
    /*
    Epic-009 delegates all memory management to Zero.js:
    
    ✅ Zero.js handles:
    - 20MB memory limit with LRU eviction
    - TTL-based cache cleanup  
    - Automatic garbage collection
    - Query result deduplication
    
    ❌ We don't implement:
    - Custom memory management
    - Manual cache cleanup
    - Complex memory strategies
    
    This keeps the implementation simple and reliable.
    */
  }
}

export default {
  ActiveRecordIncludesExamples,
  ReactiveRecordIncludesExamples,
  AdvancedIncludesPatterns,
  MigrationExamples,
  TypeSafetyExamples,
  PerformanceBestPractices
};