/**
 * Test Data Factories
 * 
 * Utilities for creating and managing test data via Rails API
 */

import { Page } from '@playwright/test';
import { testDb } from './database';

export interface JobData {
  id?: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'paused' | 'waiting_for_customer' | 'waiting_for_scheduled_appointment' | 'successfully_completed' | 'cancelled';
  priority: 'critical' | 'high' | 'normal' | 'low' | 'proactive_followup';
  due_on?: string;
  due_time?: string;
  client_id?: string;
  created_by_id?: string;
  technician_ids?: string[];
}

export interface TaskData {
  id?: string;
  title: string;
  description?: string;
  status: 'new_task' | 'in_progress' | 'paused' | 'successfully_completed' | 'cancelled' | 'failed';
  position?: number;
  job_id: string;
  parent_id?: string;
  estimated_minutes?: number;
}

export interface ClientData {
  id?: string;
  name: string;
  client_type: 'residential' | 'business';
  created_at?: string;
  updated_at?: string;
}

export interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: 'owner' | 'admin' | 'technician' | 'technician_lead';
}

/**
 * Data factory for creating test entities via Rails API
 */
export class DataFactory {
  private page: Page;
  private baseUrl: string;
  private isAuthenticated: boolean = false;
  private csrfToken: string | null = null;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = testDb.getApiUrl();
  }

  /**
   * Get CSRF token for API calls using production endpoint
   */
  private async getCsrfToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    const csrfResponse = await this.page.request.get(`${this.baseUrl}/health`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!csrfResponse.ok()) {
      throw new Error(`Failed to get CSRF token: ${csrfResponse.status()}`);
    }

    // Extract CSRF token from response headers (same as production)
    const headers = csrfResponse.headers();
    const csrfToken = headers['x-csrf-token'] || headers['X-CSRF-Token'];
    if (!csrfToken) {
      console.error('Available headers:', Object.keys(headers));
      throw new Error('CSRF token not found in health response headers');
    }

    this.csrfToken = csrfToken;
    return this.csrfToken;
  }

  /**
   * Ensure user is authenticated before making API calls
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.isAuthenticated) {
      return;
    }

    // Import auth helper to set up authenticated session
    const { AuthHelper } = await import('./auth');
    const auth = new AuthHelper(this.page);
    
    try {
      await auth.setupAuthenticatedSession('admin');
      this.isAuthenticated = true;
    } catch (error) {
      throw new Error(`Failed to authenticate for API calls: ${error}`);
    }
  }

  /**
   * Get an existing test client from the database setup
   * Since there's no client creation API, we use the pre-seeded test clients
   */
  async getTestClient(index: number = 0): Promise<ClientData> {
    await this.ensureAuthenticated();
    
    // Use the test database verification endpoint to get client info
    const response = await this.page.request.get(`${this.baseUrl}/test/verify_data`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok()) {
      throw new Error(`Failed to get test data info: ${response.status()}`);
    }

    const result = await response.json();
    const clientCount = result.data?.attributes?.counts?.clients || 0;
    
    if (clientCount === 0) {
      throw new Error('No test clients available. Run database seed first.');
    }

    // Return a mock client data based on the test environment setup
    // The actual IDs will be determined by the Rails backend
    return {
      id: `test-client-${index + 1}`,
      name: `Test Client ${index + 1}`,
      client_type: index % 2 === 0 ? 'residential' : 'business'
    };
  }

  /**
   * Create a client via API (if API endpoint becomes available)
   * Currently not implemented - use getTestClient() instead
   */
  async createClient(data: Partial<ClientData> = {}): Promise<ClientData> {
    // For now, return a test client since there's no client creation API
    console.warn('Client creation API not available, using test client instead');
    return this.getTestClient(0);
  }

  /**
   * Get an existing test user from the database setup
   * Since there's no user creation API, we use the pre-seeded test users
   */
  async getTestUser(role: 'owner' | 'admin' | 'technician' | 'technician_lead' = 'technician'): Promise<UserData> {
    await this.ensureAuthenticated();
    
    // Return user data based on the test environment setup
    const testUsers = {
      owner: { 
        id: 'test-owner',
        name: 'Test Owner', 
        email: 'owner@bos-test.local', 
        role: 'owner' as const 
      },
      admin: { 
        id: 'test-admin', 
        name: 'Test Admin', 
        email: 'admin@bos-test.local', 
        role: 'admin' as const 
      },
      technician: { 
        id: 'test-tech', 
        name: 'Test Tech', 
        email: 'tech@bos-test.local', 
        role: 'technician' as const 
      },
      technician_lead: { 
        id: 'test-tech-lead', 
        name: 'Test Tech Lead', 
        email: 'techlead@bos-test.local', 
        role: 'technician_lead' as const 
      }
    };

    return testUsers[role] || testUsers.technician;
  }

  /**
   * Create a user via API (if API endpoint becomes available)
   * Currently not implemented - use getTestUser() instead
   */
  async createUser(data: Partial<UserData> = {}): Promise<UserData> {
    // For now, return a test user since there's no user creation API
    console.warn('User creation API not available, using test user instead');
    const role = (data.role as keyof typeof this.getTestUser) || 'technician';
    return this.getTestUser(role);
  }

  /**
   * Get a real client ID from existing jobs in the test database
   */
  private async getTestClientId(index: number = 0): Promise<string> {
    // Query existing jobs to get their client IDs
    const response = await this.page.request.get(`${this.baseUrl}/jobs`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok()) {
      throw new Error(`Failed to get jobs for client ID: ${response.status()}`);
    }

    const result = await response.json();
    const jobs = result.data || [];
    
    if (jobs.length === 0) {
      throw new Error('No test jobs available to get client ID. Run database seed first.');
    }

    // Get client ID from existing job
    const job = jobs[index] || jobs[0]; // Use specified index or first job
    const clientId = job.attributes?.client_id || job.relationships?.client?.data?.id;
    
    if (!clientId) {
      throw new Error('Could not find client ID in existing jobs');
    }

    return String(clientId);
  }

  /**
   * Create a job via API using real production endpoint
   */
  async createJob(data: Partial<JobData> = {}): Promise<JobData> {
    await this.ensureAuthenticated();

    // Ensure we have a client ID
    let clientId = data.client_id;
    if (!clientId) {
      clientId = await this.getTestClientId(0);
    }

    // Note: created_by_id is set automatically by the API based on current_user
    const { created_by_id, ...cleanData } = data; // Remove created_by_id if provided

    const jobData = {
      title: `Test Job ${Date.now()}`,
      description: 'Test job description',
      status: 'open' as const,
      priority: 'normal' as const,
      client_id: clientId,
      ...cleanData
    };

    const csrfToken = await this.getCsrfToken();
    const response = await this.page.request.post(`${this.baseUrl}/jobs`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      data: { job: jobData }
    });

    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({}));
      const errorDetail = errorData.errors?.[0]?.detail || errorData.message || 'Unknown error';
      throw new Error(`Failed to create job: ${response.status()} - ${errorDetail}`);
    }

    const result = await response.json();
    const jobResult = {
      id: result.data.id,
      ...result.data.attributes
    };
    return jobResult;
  }

  /**
   * Create a task via API
   */
  async createTask(data: Partial<TaskData>): Promise<TaskData> {
    await this.ensureAuthenticated();
    
    if (!data.job_id) {
      throw new Error('job_id is required to create a task');
    }

    // Remove job_id and description from the data sent to API since they're not permitted
    const { job_id, description, ...cleanData } = data;
    
    const taskData = {
      title: `Test Task ${Date.now()}`,
      status: 'new_task',
      ...cleanData
    };

    const csrfToken = await this.getCsrfToken();
    const response = await this.page.request.post(`${this.baseUrl}/jobs/${data.job_id}/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      data: { task: taskData }
    });

    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({}));
      const errorDetail = errorData.errors?.[0]?.detail || errorData.message || 'Unknown error';
      throw new Error(`Failed to create task: ${response.status()} - ${errorDetail}`);
    }

    const result = await response.json();
    
    // Handle different possible response structures
    if (result.data) {
      const taskResult = {
        id: result.data.id,
        ...result.data.attributes,
        job_id: data.job_id // Add back the job_id for consistency
      };
      return taskResult;
    } else {
      // Fallback for simpler response structure
      const taskResult = {
        ...result,
        job_id: data.job_id
      };
      return taskResult;
    }
  }

  /**
   * Create multiple tasks for a job
   */
  async createTasks(jobId: string, count: number, taskData: Partial<TaskData> = {}): Promise<TaskData[]> {
    const tasks: TaskData[] = [];
    
    for (let i = 0; i < count; i++) {
      const task = await this.createTask({
        ...taskData,
        job_id: jobId,
        title: taskData.title || `Test Task ${i + 1}`,
        position: (i + 1) * 10
      });
      tasks.push(task);
    }
    
    return tasks;
  }

  /**
   * Create a hierarchical task structure
   */
  async createTaskHierarchy(jobId: string): Promise<{ parent: TaskData; children: TaskData[] }> {
    // Create parent task
    const parent = await this.createTask({
      job_id: jobId,
      title: 'Parent Task',
      description: 'Main task with subtasks'
    });

    // Create child tasks
    const children: TaskData[] = [];
    for (let i = 0; i < 3; i++) {
      const child = await this.createTask({
        job_id: jobId,
        title: `Subtask ${i + 1}`,
        parent_id: parent.id,
        position: (i + 1) * 10
      });
      children.push(child);
    }

    return { parent, children };
  }

  /**
   * Create a complete job with tasks
   */
  async createJobWithTasks(jobData: Partial<JobData> = {}, taskCount: number = 5): Promise<{
    job: JobData;
    tasks: TaskData[];
  }> {
    const job = await this.createJob(jobData);
    const tasks = await this.createTasks(job.id!, taskCount);
    
    return { job, tasks };
  }

  /**
   * Create mixed status tasks for testing
   */
  async createMixedStatusTasks(jobId: string): Promise<TaskData[]> {
    const statuses: TaskData['status'][] = [
      'new_task',
      'in_progress', 
      'paused',
      'successfully_completed',
      'failed'
    ];

    const tasks: TaskData[] = [];
    
    for (const status of statuses) {
      const task = await this.createTask({
        job_id: jobId,
        title: `Task - ${status.replace('_', ' ')}`,
        status: status
      });
      tasks.push(task);
    }
    
    return tasks;
  }

  /**
   * Delete test entity by ID
   */
  async deleteEntity(entityType: 'jobs' | 'tasks' | 'clients' | 'users', id: string): Promise<void> {
    const response = await this.page.request.delete(`${this.baseUrl}/${entityType}/${id}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok() && response.status() !== 404) {
      console.warn(`Failed to delete ${entityType}/${id}: ${response.status()}`);
    }
  }

  /**
   * Cleanup created test data
   */
  async cleanup(entities: Array<{ type: 'jobs' | 'tasks' | 'clients' | 'users'; id: string }>): Promise<void> {
    for (const entity of entities) {
      await this.deleteEntity(entity.type, entity.id);
    }
  }
}

/**
 * Predefined test scenarios
 */
export class TestScenarios {
  private factory: DataFactory;

  constructor(page: Page) {
    this.factory = new DataFactory(page);
  }

  /**
   * Simple job scenario - basic job with a few tasks
   */
  async createSimpleJobScenario(): Promise<{
    job: JobData;
    tasks: TaskData[];
    cleanup: () => Promise<void>;
  }> {
    const { job, tasks } = await this.factory.createJobWithTasks({
      title: 'Simple Installation Job',
      priority: 'normal',
      status: 'open'
    }, 3);

    const cleanup = async () => {
      for (const task of tasks) {
        await this.factory.deleteEntity('tasks', task.id!);
      }
      await this.factory.deleteEntity('jobs', job.id!);
    };

    return { job, tasks, cleanup };
  }

  /**
   * Complex job scenario - job with hierarchical tasks and mixed statuses
   */
  async createComplexJobScenario(): Promise<{
    job: JobData;
    tasks: TaskData[];
    hierarchy: { parent: TaskData; children: TaskData[] };
    cleanup: () => Promise<void>;
  }> {
    const job = await this.factory.createJob({
      title: 'Complex Network Installation',
      priority: 'high',
      status: 'in_progress'
    });

    const tasks = await this.factory.createMixedStatusTasks(job.id!);
    const hierarchy = await this.factory.createTaskHierarchy(job.id!);

    const cleanup = async () => {
      // Delete all tasks
      for (const task of [...tasks, hierarchy.parent, ...hierarchy.children]) {
        await this.factory.deleteEntity('tasks', task.id!);
      }
      await this.factory.deleteEntity('jobs', job.id!);
    };

    return { job, tasks, hierarchy, cleanup };
  }

  /**
   * Multi-user scenario - multiple technicians assigned to jobs
   */
  async createMultiUserScenario(): Promise<{
    users: UserData[];
    job: JobData;
    tasks: TaskData[];
    cleanup: () => Promise<void>;
  }> {
    // Create technicians
    const users = await Promise.all([
      this.factory.createUser({ role: 'technician', name: 'Tech User 1' }),
      this.factory.createUser({ role: 'technician', name: 'Tech User 2' }),
      this.factory.createUser({ role: 'technician_lead', name: 'Lead Tech' })
    ]);

    const { job, tasks } = await this.factory.createJobWithTasks({
      title: 'Multi-Technician Project',
      priority: 'high',
      technician_ids: users.map(u => u.id!).slice(0, 2) // Assign first 2 techs
    }, 6);

    const cleanup = async () => {
      for (const task of tasks) {
        await this.factory.deleteEntity('tasks', task.id!);
      }
      await this.factory.deleteEntity('jobs', job.id!);
      for (const user of users) {
        await this.factory.deleteEntity('users', user.id!);
      }
    };

    return { users, job, tasks, cleanup };
  }

  /**
   * Empty job scenario - job with no tasks for testing task creation
   */
  async createEmptyJobScenario(): Promise<{
    job: JobData;
    cleanup: () => Promise<void>;
  }> {
    const job = await this.factory.createJob({
      title: 'Empty Project Template',
      status: 'open'
    });

    const cleanup = async () => {
      await this.factory.deleteEntity('jobs', job.id!);
    };

    return { job, cleanup };
  }
}

/**
 * Test data utilities for common patterns
 */
export class TestDataUtils {
  /**
   * Wait for entity to exist via API
   */
  static async waitForEntity(
    page: Page, 
    entityType: string, 
    entityId: string, 
    timeoutMs: number = 5000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await page.request.get(`${testDb.getApiUrl()}/${entityType}/${entityId}`, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok()) {
          return true;
        }
      } catch {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }

  /**
   * Verify entity data via API
   */
  static async verifyEntityData(
    page: Page,
    entityType: string,
    entityId: string,
    expectedData: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await page.request.get(`${testDb.getApiUrl()}/${entityType}/${entityId}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok()) {
        return false;
      }

      const data = await response.json();
      const attributes = data.data?.attributes || {};

      // Check all expected keys exist and match
      for (const [key, expectedValue] of Object.entries(expectedData)) {
        if (attributes[key] !== expectedValue) {
          console.warn(`Mismatch for ${key}: expected ${expectedValue}, got ${attributes[key]}`);
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get entity count via API
   */
  static async getEntityCount(page: Page, entityType: string): Promise<number> {
    try {
      const response = await page.request.get(`${testDb.getApiUrl()}/${entityType}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok()) {
        return 0;
      }

      const data = await response.json();
      return data.data?.length || 0;
    } catch {
      return 0;
    }
  }
}