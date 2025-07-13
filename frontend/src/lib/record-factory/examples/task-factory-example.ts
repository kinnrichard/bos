// Example: Task Factory Implementation
// Demonstrates how to use the new factory system with existing Task model
// Shows migration path from ReactiveQuery to Factory-based architecture

import { 
  createReactiveModel, 
  createActiveModel, 
  createDualModel,
  ModelConfigBuilder 
} from '../index';
import type { Task } from '../../types/generated';

// Simple factory creation (quick migration)
export const ReactiveTask = createReactiveModel<Task>('task', 'tasks');
export const ActiveTask = createActiveModel<Task>('task', 'tasks');

// Advanced factory with full Rails configuration
const taskConfig = new ModelConfigBuilder('task', 'tasks')
  .addAttribute({ 
    name: 'title', 
    type: 'string', 
    nullable: true,
    description: 'Task title or description' 
  })
  .addAttribute({ 
    name: 'status', 
    type: 'number', 
    nullable: true,
    enum: ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'],
    description: 'Current task status' 
  })
  .addAttribute({ 
    name: 'position', 
    type: 'number', 
    nullable: true,
    description: 'Position in task list for ordering' 
  })
  .addAttribute({ 
    name: 'applies_to_all_targets', 
    type: 'boolean', 
    description: 'Whether task applies to all job targets' 
  })
  .addAssociation({ 
    name: 'job', 
    type: 'belongs_to', 
    className: 'Job',
    foreignKey: 'job_id',
    optional: true 
  })
  .addAssociation({ 
    name: 'assigned_to', 
    type: 'belongs_to', 
    className: 'User',
    foreignKey: 'assigned_to_id',
    optional: true 
  })
  .addAssociation({ 
    name: 'parent', 
    type: 'belongs_to', 
    className: 'Task',
    foreignKey: 'parent_id',
    optional: true 
  })
  .addAssociation({ 
    name: 'subtasks', 
    type: 'has_many', 
    className: 'Task',
    foreignKey: 'parent_id' 
  })
  .addValidation({ 
    field: 'title', 
    type: 'presence',
    options: { message: 'Title cannot be blank' } 
  })
  .addValidation({ 
    field: 'title', 
    type: 'length',
    options: { maximum: 255, message: 'Title too long' } 
  })
  .addValidation({ 
    field: 'status', 
    type: 'inclusion',
    options: { in: [0, 1, 2, 3, 4], message: 'Invalid status' } 
  })
  .addScope({ 
    name: 'active', 
    conditions: { deleted_at: null },
    description: 'Only non-deleted tasks' 
  })
  .addScope({ 
    name: 'completed', 
    conditions: { status: 3 },
    description: 'Successfully completed tasks' 
  })
  .addScope({ 
    name: 'in_progress', 
    conditions: { status: 1 },
    description: 'Tasks currently being worked on' 
  })
  .addScope({ 
    name: 'by_job', 
    lambda: 'lambda { |job_id| where(job_id: job_id) }',
    description: 'Tasks for specific job' 
  })
  .setZeroConfig({
    tableName: 'tasks',
    primaryKey: 'id',
    relationships: {
      job: {
        type: 'one',
        table: 'jobs',
        foreignKey: 'job_id',
        localKey: 'id'
      },
      assigned_to: {
        type: 'one',
        table: 'users',
        foreignKey: 'assigned_to_id',
        localKey: 'id'
      },
      subtasks: {
        type: 'many',
        table: 'tasks',
        foreignKey: 'parent_id',
        localKey: 'id'
      }
    },
    indexes: ['job_id', 'assigned_to_id', 'parent_id', 'status', 'position']
  })
  .setFactoryOptions({
    ttl: '5m', // Tasks change frequently, shorter TTL
    debugLogging: true,
    customMethods: ['moveToTop', 'moveAfter', 'complete', 'assign']
  })
  .build();

// Create both models from advanced configuration
const { ReactiveTaskAdvanced, ActiveTaskAdvanced } = createDualModel<Task>('task', 'tasks');

// Usage examples for Svelte components
export const SvelteTaskExamples = {
  /**
   * Example: Task list in Svelte component
   */
  activeTasksList() {
    // Reactive query - automatically updates UI
    const activeTasks = ReactiveTask.where({ 
      status: 1, // in_progress
      deleted_at: null 
    });
    
    // In Svelte template: {#each activeTasks.records as task}
    return activeTasks;
  },

  /**
   * Example: Single task view
   */
  taskDetail(taskId: string) {
    // Reactive single record - updates when task changes
    const task = ReactiveTask.find(taskId);
    
    // In Svelte template: {task.record?.title}
    // Automatically reactive, no manual subscriptions needed
    return task;
  },

  /**
   * Example: Find task by conditions
   */
  findTaskByTitle(title: string) {
    // Find first task with matching title
    const task = ReactiveTask.findBy({ title });
    
    // Returns null if not found (like Rails find_by)
    return task;
  },

  /**
   * Example: All tasks for a job
   */
  jobTasks(jobId: string) {
    const tasks = ReactiveTask.where({ 
      job_id: jobId,
      deleted_at: null 
    });
    
    return tasks;
  }
};

// Usage examples for vanilla JavaScript/testing
export const VanillaTaskExamples = {
  /**
   * Example: Task operations in tests
   */
  async testTaskOperations() {
    // Direct property access for performance
    const activeTasks = ActiveTask.where({ status: 1 });
    
    // Wait for initial load
    await new Promise(resolve => {
      if (!activeTasks.isLoading) {
        resolve(undefined);
        return;
      }
      
      const unsubscribe = activeTasks.subscribe((data, meta) => {
        if (!meta.isLoading) {
          unsubscribe();
          resolve(undefined);
        }
      });
    });
    
    console.log('Active tasks count:', activeTasks.records.length);
    return activeTasks.records;
  },

  /**
   * Example: Manual subscription for real-time updates
   */
  subscribeToTaskUpdates(callback: (tasks: Task[]) => void) {
    const allTasks = ActiveTask.all();
    
    return allTasks.subscribe((data, meta) => {
      if (!meta.isLoading && !meta.error) {
        callback(data as Task[]);
      }
    });
  },

  /**
   * Example: Performance-critical task lookup
   */
  quickTaskLookup(taskId: string): Task | null {
    const task = ActiveTask.find(taskId);
    
    // Direct property access - fastest possible
    return task.record;
  },

  /**
   * Example: Conditional task finding
   */
  findTaskWithFallback(primaryId: string, fallbackTitle: string): Task | null {
    // Try to find by ID first
    const taskById = ActiveTask.find(primaryId);
    if (taskById.record) {
      return taskById.record;
    }
    
    // Fallback to finding by title
    const taskByTitle = ActiveTask.findBy({ title: fallbackTitle });
    return taskByTitle.record;
  }
};

// Migration helper from existing ReactiveQuery usage
export const MigrationHelpers = {
  /**
   * Before: ReactiveQuery usage
   */
  beforeReactiveQuery() {
    // OLD WAY - ReactiveQuery with duplication
    /*
    import { ReactiveQuery } from '../reactive-query.svelte';
    
    const activeTasks = new ReactiveQuery<Task>(
      () => {
        const zero = getZero();
        return zero ? zero.query.tasks.where('status', 1) : null;
      },
      []
    );
    
    // Access with .current or .data
    console.log(activeTasks.current);
    */
  },

  /**
   * After: Factory pattern usage
   */
  afterFactoryPattern() {
    // NEW WAY - Factory pattern, no duplication
    const activeTasks = ReactiveTask.where({ status: 1 });
    
    // Safe property access for reactive state - use $state.snapshot() in Svelte components
    console.log('Active tasks count:', activeTasks.records.length); // Access length is safe
    
    // Or for vanilla JS
    const activeTasksJS = ActiveTask.where({ status: 1 });
    console.log(activeTasksJS.records); // Direct access
  },

  /**
   * Migration steps
   */
  migrationSteps: [
    '1. Replace ReactiveQuery imports with ReactiveTask',
    '2. Replace ReactiveQueryOne imports with ReactiveTask',
    '3. Change .current access to .record or .records',
    '4. Use ReactiveTask in Svelte, ActiveTask in vanilla JS',
    '5. Remove manual TTL and error handling - now built-in'
  ]
};

// Performance comparison
export const PerformanceComparison = {
  /**
   * Benchmark factory vs legacy performance
   */
  async benchmarkComparison() {
    console.time('Factory Pattern');
    const factoryTasks = ReactiveTask.all();
    console.timeEnd('Factory Pattern');
    
    console.time('Direct Property Access');
    const activeTasks = ActiveTask.all();
    const records = activeTasks.records;
    console.timeEnd('Direct Property Access');
    
    return {
      factory: factoryTasks,
      direct: records,
      message: 'ActiveRecord should be ~2x faster for property access'
    };
  }
};