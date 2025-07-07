import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { usersService } from '../users';
import type { User } from '$lib/types/job';
import { debugTechAssignment, debugAPI } from '$lib/utils/debug';

/**
 * Query hook for fetching all users
 */
export function useUsersQuery() {
  return createQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
    staleTime: 10 * 60 * 1000, // 10 minutes - users don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      debugAPI('Users query failed, attempt %d: %o', failureCount + 1, error);
      return failureCount < 2; // Conservative retry approach
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Query hook for fetching technicians specifically
 */
export function useTechniciansQuery() {
  return createQuery({
    queryKey: ['users', 'technicians'],
    queryFn: () => usersService.getTechnicians(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      debugAPI('Technicians query failed, attempt %d: %o', failureCount + 1, error);
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for getting a specific user by ID from cache
 * Falls back to server if not in cache
 */
export function useUserQuery(id: string, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  return createQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      // First try to get from users cache
      const usersData = queryClient.getQueryData<User[]>(['users']);
      if (usersData) {
        const user = usersData.find(u => u.id === id);
        if (user) {
          debugAPI('Found user %s in cache', id);
          return user;
        }
      }
      
      // Fallback: if we have technicians cache, try that
      const techniciansData = queryClient.getQueryData<User[]>(['users', 'technicians']);
      if (techniciansData) {
        const user = techniciansData.find(u => u.id === id);
        if (user) {
          debugAPI('Found user %s in technicians cache', id);
          return user;
        }
      }
      
      // If not in cache, we need a proper user endpoint - for now return null
      // This could be extended if you add a single user API endpoint
      debugAPI('User %s not found in any cache', id);
      return null;
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
    retry: false, // Don't retry since this is cache-based
  });
}

/**
 * Derived hook that provides a lookup function for users
 * More efficient than individual useUserQuery calls
 */
export function useUserLookup() {
  const usersQuery = useUsersQuery();
  const data = (usersQuery as any).data;
  
  return {
    ...usersQuery,
    getUserById: (id: string): User | undefined => {
      if (!data) return undefined;
      return data.find((u: User) => u.id === id);
    },
    getUsersByIds: (ids: string[]): User[] => {
      if (!data) return [];
      return ids.map(id => data.find((u: User) => u.id === id)).filter(Boolean) as User[];
    },
    isUserLoaded: (id: string): boolean => {
      if (!data) return false;
      return data.some((u: User) => u.id === id);
    }
  };
}

/**
 * Mutation hook for updating job technicians
 * Integrates with jobs service but provides optimistic updates for user cache
 */
export function useUpdateJobTechniciansMutation() {
  const queryClient = useQueryClient();

  return createMutation({
    mutationFn: async ({ jobId, technicianIds }: { jobId: string; technicianIds: string[] }) => {
      debugTechAssignment('API call: Updating job %s technicians to: %o', jobId, technicianIds);
      
      // Use jobs service for the actual API call
      const { jobsService } = await import('../jobs');
      return jobsService.updateJobTechnicians(jobId, technicianIds);
    },
    onSuccess: (data, { jobId }) => {
      debugTechAssignment('API success: Job %s technicians updated: %o', jobId, data);
      
      // Invalidate relevant caches to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: unknown, { jobId }) => {
      debugTechAssignment('API error: Job %s technicians update failed: %o', jobId, error);
    },
    retry: (failureCount: number, error: unknown) => {
      // Don't retry on authentication or validation errors
      if ((error as any)?.code === 'INVALID_CSRF_TOKEN' || (error as any)?.status === 422) {
        return false;
      }
      return failureCount < 1; // Conservative retry - only once
    },
    retryDelay: 1000, // 1 second delay before retry
  });
}

// Note: Don't use useQueryClient() at module level - only in hooks/components