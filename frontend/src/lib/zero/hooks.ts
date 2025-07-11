import { useQuery } from 'zero-svelte-query';
import { getZero } from './zero-client';
import { browser } from '$app/environment';

// Reactive Zero query hooks for Svelte components

/**
 * Query hook for users
 */
export function useUsers() {
  if (!browser) {
    return { current: [], value: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.users.orderBy('name', 'asc'));
}

/**
 * Query hook for a specific user
 */
export function useUser(id: string) {
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: null, value: null, resultType: 'loading' as const };
  }
  return useQuery(zero.query.users.where('id', id).one());
}

/**
 * Query hook for clients
 */
export function useClients() {
  if (!browser) {
    return { current: [], resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  if (!zero) {
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.clients.orderBy('name', 'asc'));
}

/**
 * Query hook for a specific client with relationships
 */
export function useClient(id: string) {
  const zero = getZero();
  if (!zero) {
    return { current: null, value: null, resultType: 'loading' as const };
  }
  return useQuery(zero.query.clients
    .where('id', id)
    .related('jobs', (jobs) => jobs.orderBy('created_at', 'desc'))
    .related('people')
    .related('devices')
    .one());
}

/**
 * Query hook for jobs with filters
 */
export function useJobs(filters?: {
  status?: string;
  client_id?: string;
  technician_id?: string;
}) {
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: [], value: [], resultType: 'loading' as const };
  }
  let query = zero.query.jobs
    .related('client')
    .related('jobAssignments', (assignments) => 
      assignments.related('user')
    )
    .orderBy('created_at', 'desc');

  if (filters?.status) {
    query = query.where('status', filters.status);
  }
  if (filters?.client_id) {
    query = query.where('client_id', filters.client_id);
  }
  // Note: technician filtering would require a more complex query
  // as it involves the job_assignments relationship

  return useQuery(query);
}

/**
 * Query hook for a specific job with all relationships
 */
export function useJob(id: string) {
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: null, value: null, resultType: 'loading' as const };
  }
  return useQuery(zero.query.jobs
    .where('id', id)
    .related('client')
    .related('tasks', (tasks) => 
      tasks.orderBy('position', 'asc')
    )
    .related('jobAssignments', (assignments) => 
      assignments.related('user')
    )
    .related('notes', (notes) => 
      notes.related('user').orderBy('created_at', 'desc')
    )
    .related('scheduledDateTimes')
    .one());
}

/**
 * Query hook for tasks by job
 */
export function useTasksByJob(jobId: string) {
  const zero = getZero();
  if (!zero) {
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.tasks
    .where('job_id', jobId)
    .related('parent')
    .related('children')
    .orderBy('position', 'asc'));
}

/**
 * Query hook for a specific task
 */
export function useTask(id: string) {
  const zero = getZero();
  if (!zero) {
    return { current: null, value: null, resultType: 'loading' as const };
  }
  return useQuery(zero.query.tasks
    .where('id', id)
    .related('job', (job) => job.related('client'))
    .related('parent')
    .related('children')
    .one());
}

/**
 * Query hook for job assignments by user
 */
export function useJobAssignmentsByUser(userId: string) {
  const zero = getZero();
  if (!zero) {
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.job_assignments
    .where('user_id', userId)
    .related('job', (job) => 
      job.related('client')
    )
    .related('user'));
}

/**
 * Query hook for notes by job
 */
export function useNotesByJob(jobId: string) {
  const zero = getZero();
  if (!zero) {
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.notes
    .where('notable_id', jobId)
    .related('user')
    .orderBy('created_at', 'desc'));
}