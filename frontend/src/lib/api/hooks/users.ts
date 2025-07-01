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
  const data = usersQuery.data;
  
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
      debugTechAssignment('Updating job %s technicians to: %o', jobId, technicianIds);
      
      // Use jobs service for the actual API call
      const { jobsService } = await import('../jobs');
      return jobsService.updateJobTechnicians(jobId, technicianIds);
    },
    onMutate: async ({ jobId, technicianIds }) => {
      // Cancel outgoing refetches for this job
      await queryClient.cancelQueries({ queryKey: ['job', jobId] });
      
      // Snapshot previous job data
      const previousJob = queryClient.getQueryData(['job', jobId]);
      
      // Optimistically update job technicians in cache
      queryClient.setQueryData(['job', jobId], (old: any) => {
        if (!old?.data) return old;
        
        // Get user data for the new technicians
        const usersData = queryClient.getQueryData<User[]>(['users']);
        const updatedTechnicians = technicianIds
          .map(id => usersData?.find(u => u.id === id))
          .filter(Boolean)
          .map(user => ({
            id: user!.id,
            ...user!.attributes
          }));
        
        debugTechAssignment('Optimistically updating job %s technicians cache: %o', jobId, updatedTechnicians);
        
        return {
          ...old,
          data: {
            ...old.data,
            attributes: {
              ...old.data.attributes,
              technicians: updatedTechnicians
            }
          }
        };
      });
      
      return { previousJob };
    },
    onError: (error: unknown, { jobId }: { jobId: string; technicianIds: string[] }, context: any) => {
      // Rollback on error
      if (context?.previousJob) {
        debugTechAssignment('Rolling back job %s technicians due to error: %o', jobId, error);
        queryClient.setQueryData(['job', jobId], context.previousJob);
      } else {
        // If no previous data, invalidate to refetch
        queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      }
    },
    onSuccess: (data, { jobId }) => {
      debugTechAssignment('Job %s technicians updated successfully: %o', jobId, data);
      
      // The response is the technician data, not the full job
      // We need to invalidate the job cache to get the updated job data
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
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