import { useQuery } from 'zero-svelte-query';
import { getZero } from './client';
import type { User } from '$lib/types/job';

/**
 * Zero query hook for fetching all users
 * Replaces: useUsersQuery()
 */
export function useUsersQuery() {
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.users
    .where('deleted_at', 'IS', null) // Only active users
    .orderBy('name', 'asc'));
}

/**
 * Zero query hook for fetching technicians specifically
 * Replaces: useTechniciansQuery()
 */
export function useTechniciansQuery() {
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: [], value: [], resultType: 'loading' as const };
  }
  return useQuery(zero.query.users
    .where('deleted_at', 'IS', null)
    .where('role', 'IN', ['technician', 'admin', 'owner']) // Technician roles
    .orderBy('name', 'asc'));
}

/**
 * Zero query hook for a specific user by ID
 * Replaces: useUserQuery(id)
 */
export function useUserQuery(id: string, enabled: boolean = true) {
  if (!enabled || !id) {
    return { current: null, value: null, resultType: 'unknown' as const };
  }
  
  const zero = getZero();
  if (!zero) {
    // Return empty state while Zero initializes
    return { current: null, value: null, resultType: 'loading' as const };
  }
  return useQuery(zero.query.users
    .where('id', id)
    .where('deleted_at', 'IS', null)
    .one());
}

/**
 * Derived hook that provides a lookup function for users
 * More efficient than individual useUserQuery calls
 * Replaces: useUserLookup()
 */
export function useUserLookup() {
  const usersQuery = useUsersQuery();
  
  return {
    data: usersQuery,
    isLoading: !usersQuery,
    error: null, // Zero handles errors internally
    getUserById: (id: string): User | undefined => {
      if (!usersQuery.value) return undefined;
      return usersQuery.value.find((u: any) => u.id === id);
    },
    getUsersByIds: (ids: string[]): User[] => {
      if (!usersQuery.value) return [];
      return ids.map(id => 
        usersQuery.value.find((u: any) => u.id === id)
      ).filter(Boolean) as User[];
    },
    isUserLoaded: (id: string): boolean => {
      if (!usersQuery.value) return false;
      return usersQuery.value.some((u: any) => u.id === id);
    }
  };
}

// Zero mutations for user operations

/**
 * Create a new user
 */
export async function createUser(userData: {
  email: string;
  name: string;
  role: string;
  password_digest: string;
}) {
  const zero = getZero();
  const id = crypto.randomUUID();
  const uuid = crypto.randomUUID();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.users.insert({
    id,
    uuid,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    password_digest: userData.password_digest,
    resort_tasks_on_status_change: false,
    created_at: now,
    updated_at: now,
  });

  return { id, uuid };
}

/**
 * Update a user
 */
export async function updateUser(id: string, data: Partial<{
  email: string;
  name: string;
  role: string;
  resort_tasks_on_status_change: boolean;
}>) {
  const zero = getZero();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.users.update({
    id,
    ...data,
    updated_at: now,
  });
}

/**
 * Delete a user (soft delete)
 */
export async function deleteUser(id: string) {
  const zero = getZero();
  const now = Date.now(); // Unix timestamp in milliseconds

  await zero.mutate.users.update({
    id,
    deleted_at: now,
    updated_at: now,
  });
}

/**
 * Update job technicians assignment
 * This replaces the TanStack mutation for technician assignment
 */
export async function updateJobTechnicians(jobId: string, technicianIds: string[]) {
  const zero = getZero();
  
  // First, remove existing assignments for this job
  // Note: This is a simplified approach - in production you'd want proper transaction handling
  
  // Get current assignments
  const currentAssignments = await zero.query.job_assignments
    .where('job_id', jobId);
  
  // Remove assignments that are no longer needed
  for (const assignment of currentAssignments) {
    if (!technicianIds.includes(assignment.user_id)) {
      await zero.mutate.job_assignments.delete({ id: assignment.id });
    }
  }
  
  // Add new assignments
  const existingUserIds = currentAssignments.map(a => a.user_id);
  for (const userId of technicianIds) {
    if (!existingUserIds.includes(userId)) {
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