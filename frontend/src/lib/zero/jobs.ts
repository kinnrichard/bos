import { useQuery } from 'zero-svelte-query';
import { getZero } from './client';

/**
 * Zero query hook for fetching jobs list with filters
 * Replaces: useJobsQuery()
 */
export function useJobsQuery(params: {
  status?: string;
  client_id?: string;
  technician_id?: string;
} = {}) {
  const { status, client_id, technician_id } = params;

  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { value: [], current: [] };
  }
  let query = zero.query.jobs
        .where('deleted_at', 'IS', null)
        .related('client')
        .related('jobAssignments', (assignments) => 
          assignments.related('user')
        )
        .related('tasks', (tasks) => 
          tasks.where('deleted_at', 'IS', null)
               .orderBy('position', 'asc')
        )
        .orderBy('created_at', 'desc');

      // Apply filters
      if (status) {
        query = query.where('status', status);
      }
      if (client_id) {
        query = query.where('client_id', client_id);
      }
      if (technician_id) {
        // Filter by technician assignment
        query = query.related('jobAssignments', (assignments) => 
          assignments.where('user_id', technician_id).related('user')
        );
      }

  // Return all results - no pagination
  return useQuery(query);
}

/**
 * Zero query hook for a single job with all relationships
 * Replaces: useJobQuery()
 */
export function useJobQuery(id: string, enabled: boolean = true) {
  if (!enabled || !id) {
    return { current: null, value: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: null, value: null, resultType: 'loading' as const };
  }
  return useQuery(zero.query.jobs
    .where('id', id)
    .where('deleted_at', 'IS', null)
    .related('client')
    .related('jobAssignments', (assignments) => 
      assignments.related('user')
    )
    .related('tasks', (tasks) => 
      tasks.where('deleted_at', 'IS', null)
           .related('parent')
           .related('children')
           .orderBy('position', 'asc')
    )
    .related('notes', (notes) => 
      notes.related('user').orderBy('created_at', 'desc')
    )
    .related('scheduledDateTimes', (schedules) => 
      schedules.orderBy('scheduled_at', 'asc')
    )
    .one());
}

/**
 * Zero query hook for jobs by client
 */
export function useJobsByClientQuery(clientId: string, enabled: boolean = true) {
  if (!enabled || !clientId) {
    return { current: [], value: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.jobs
    .where('client_id', clientId)
    .where('deleted_at', 'IS', null)
    .related('client')
    .related('jobAssignments', (assignments) => 
      assignments.related('user')
    )
    .orderBy('created_at', 'desc'));
}

/**
 * Zero query hook for jobs by technician
 */
export function useJobsByTechnicianQuery(technicianId: string, enabled: boolean = true) {
  return subscriber(
    () => enabled && technicianId ? getZero() : null,
    (z) => z?.query.job_assignments
      .where('user_id', technicianId)
      .related('job', (job) => 
        job.where('deleted_at', 'IS', null)
           .related('client')
           .related('tasks', (tasks) => 
             tasks.where('deleted_at', 'IS', null)
           )
      )
      .related('user')
  );
}

/**
 * Zero query hook for jobs by status
 */
export function useJobsByStatusQuery(status: string, enabled: boolean = true) {
  return subscriber(
    () => enabled && status ? getZero() : null,
    (z) => z?.query.jobs
      .where('status', status)
      .where('deleted_at', 'IS', null)
      .related('client')
      .related('jobAssignments', (assignments) => 
        assignments.related('user')
      )
      .orderBy('created_at', 'desc')
  );
}

/**
 * Zero query hook for job statistics/counts
 */
export function useJobStatsQuery() {
  return subscriber(
    () => getZero(),
    (z) => z.query.jobs
      .where('deleted_at', 'IS', null)
      .related('tasks', (tasks) => 
        tasks.where('deleted_at', 'IS', null)
      )
  );
}

/**
 * Zero query hook for recent jobs
 */
export function useRecentJobsQuery(limit: number = 10) {
  return subscriber(
    () => getZero(),
    (z) => z.query.jobs
      .where('deleted_at', 'IS', null)
      .related('client')
      .related('jobAssignments', (assignments) => 
        assignments.related('user')
      )
      .orderBy('updated_at', 'desc')
      .limit(limit)
  );
}

// Zero mutations for job operations

/**
 * Create a new job
 * Replaces: useCreateJobMutation()
 */
export async function createJob(jobData: {
  client_id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  start_date?: string;
}) {
  const zero = getZero();
  if (!zero) {
    throw new Error('Zero client not initialized. Please wait for initialization to complete.');
  }
  const id = crypto.randomUUID();
  const uuid = crypto.randomUUID();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.jobs.insert({
    id,
    uuid,
    client_id: jobData.client_id,
    title: jobData.title,
    description: jobData.description || '',
    status: jobData.status || 'draft',
    priority: jobData.priority || 'medium',
    due_date: jobData.due_date || null,
    start_date: jobData.start_date || null,
    lock_version: 0,
    created_at: now,
    updated_at: now,
  });

  return { id, uuid };
}

/**
 * Update a job
 * Replaces: useUpdateJobMutation()
 */
export async function updateJob(id: string, data: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  start_date: string;
  client_id: string;
}>) {
  const zero = getZero();
  if (!zero) {
    throw new Error('Zero client not initialized. Please wait for initialization to complete.');
  }
  const now = Date.now(); // Unix timestamp in milliseconds

  // Get current lock version for optimistic locking
  const currentJob = await zero.query.jobs.where('id', id).one();
  if (!currentJob) {
    throw new Error('Job not found');
  }

  await zero.mutate.jobs.update({
    id,
    ...data,
    lock_version: currentJob.lock_version + 1,
    updated_at: now,
  });

  return { id, ...data };
}

/**
 * Delete a job (soft delete)
 */
export async function deleteJob(id: string) {
  const zero = getZero();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.jobs.update({
    id,
    deleted_at: now,
    updated_at: now,
  });
}

/**
 * Restore a deleted job
 */
export async function restoreJob(id: string) {
  const zero = getZero();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.jobs.update({
    id,
    deleted_at: null,
    updated_at: now,
  });
}

/**
 * Update job status
 * This is a common operation that deserves its own function
 */
export async function updateJobStatus(id: string, status: string) {
  const zero = getZero();
  if (!zero) {
    throw new Error('Zero client not initialized. Please wait for initialization to complete.');
  }
  return updateJob(id, { status });
}

/**
 * Update job priority
 */
export async function updateJobPriority(id: string, priority: string) {
  return updateJob(id, { priority });
}

/**
 * Assign technicians to a job
 * This replaces the TanStack technician assignment mutation
 */
export async function assignTechniciansToJob(jobId: string, technicianIds: string[]) {
  const zero = getZero();
  
  // Get current assignments
  const currentAssignments = await zero.query.job_assignments
    .where('job_id', jobId);

  // Remove assignments that are no longer needed
  const currentUserIds = currentAssignments.map(a => a.user_id);
  for (const assignment of currentAssignments) {
    if (!technicianIds.includes(assignment.user_id)) {
      await zero.mutate.job_assignments.delete({ id: assignment.id });
    }
  }

  // Add new assignments
  for (const userId of technicianIds) {
    if (!currentUserIds.includes(userId)) {
      const id = crypto.randomUUID();
      const uuid = crypto.randomUUID();
      const now = Date.now(); // Unix timestamp in milliseconds
      
      await zero.mutate.job_assignments.insert({
        id,
        uuid,
        job_id: jobId,
        user_id: userId,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return { jobId, technicianIds };
}

/**
 * Remove technician from job
 */
export async function removeTechnicianFromJob(jobId: string, userId: string) {
  const zero = getZero();
  
  const assignments = await zero.query.job_assignments
    .where('job_id', jobId)
    .where('user_id', userId);

  for (const assignment of assignments) {
    await zero.mutate.job_assignments.delete({ id: assignment.id });
  }

  return { jobId, userId };
}

/**
 * Duplicate a job (create a copy)
 */
export async function duplicateJob(sourceJobId: string, updates?: Partial<{
  title: string;
  client_id: string;
  status: string;
}>) {
  const zero = getZero();
  
  // Get the source job
  const sourceJob = await zero.query.jobs
    .where('id', sourceJobId)
    .where('deleted_at', 'IS', null)
    .related('tasks', (tasks) => 
      tasks.where('deleted_at', 'IS', null)
    )
    .one();

  if (!sourceJob) {
    throw new Error('Source job not found');
  }

  // Create new job
  const newJobId = crypto.randomUUID();
  const newJobUuid = crypto.randomUUID();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.jobs.insert({
    id: newJobId,
    uuid: newJobUuid,
    client_id: updates?.client_id || sourceJob.client_id,
    title: updates?.title || `${sourceJob.title} (Copy)`,
    description: sourceJob.description,
    status: updates?.status || 'draft',
    priority: sourceJob.priority,
    due_date: null, // Don't copy dates
    start_date: null,
    lock_version: 0,
    created_at: now,
    updated_at: now,
  });

  // Copy tasks if they exist
  if (sourceJob.tasks && sourceJob.tasks.length > 0) {
    for (const task of sourceJob.tasks) {
      const taskId = crypto.randomUUID();
      const taskUuid = crypto.randomUUID();
      
      await zero.mutate.tasks.insert({
        id: taskId,
        uuid: taskUuid,
        job_id: newJobId,
        parent_id: null, // Simplified - would need to handle hierarchy
        title: task.title,
        description: task.description,
        status: 'pending',
        position: task.position,
        due_date: null,
        lock_version: 0,
        created_at: now,
        updated_at: now,
      });
    }
  }

  return { id: newJobId, uuid: newJobUuid };
}

/**
 * Bulk update jobs
 */
export async function bulkUpdateJobs(jobIds: string[], updates: Partial<{
  status: string;
  priority: string;
}>) {
  const zero = getZero();
  const now = Date.now(); // Unix timestamp in milliseconds

  for (const jobId of jobIds) {
    await zero.mutate.jobs.update({
      id: jobId,
      ...updates,
      updated_at: now,
    });
  }

  return { jobIds, updates };
}

/**
 * Get job lookup functionality
 */
export function useJobLookup() {
  const jobsQuery = useJobsQuery();
  
  return {
    data: jobsQuery,
    isLoading: !jobsQuery,
    error: null,
    getJobById: (id: string) => {
      if (!jobsQuery.value) return undefined;
      return jobsQuery.value.find((j: any) => j.id === id);
    },
    getJobsByClient: (clientId: string) => {
      if (!jobsQuery.value) return [];
      return jobsQuery.value.filter((j: any) => j.client_id === clientId);
    },
    getJobsByStatus: (status: string) => {
      if (!jobsQuery.value) return [];
      return jobsQuery.value.filter((j: any) => j.status === status);
    },
    getJobStats: () => {
      if (!jobsQuery.value) return { total: 0, byStatus: {} };
      
      const total = jobsQuery.value.length;
      const byStatus: Record<string, number> = {};
      
      jobsQuery.value.forEach((job: any) => {
        byStatus[job.status] = (byStatus[job.status] || 0) + 1;
      });
      
      return { total, byStatus };
    }
  };
}