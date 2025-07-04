import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { QueryClient } from '@tanstack/svelte-query';
import { getPopoverErrorMessage } from '$lib/utils/popover-utils';

/**
 * Configuration for creating optimistic mutation hooks
 */
export interface OptimisticMutationConfig<TData, TVariables, TError = Error> {
  /** The mutation function that calls the API */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Function to generate query keys for cache operations */
  queryKey: (variables: TVariables) => any[];
  /** Function to create optimistic data before API response */
  optimisticUpdate?: (variables: TVariables, previousData?: TData) => TData | undefined;
  /** Additional query keys to invalidate on success */
  invalidateKeys?: (variables: TVariables) => any[][];
  /** Custom error message handler */
  errorHandler?: (error: TError) => string;
  /** Whether to rollback optimistic updates on error (default: true) */
  rollbackOnError?: boolean;
  /** Custom success handler */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Custom error handler for side effects */
  onError?: (error: TError, variables: TVariables) => void;
}

/**
 * Factory function to create standardized optimistic mutations
 * This follows the idiomatic Svelte + TanStack Query patterns we established
 */
export function createOptimisticMutation<TData, TVariables, TError = Error>(
  config: OptimisticMutationConfig<TData, TVariables, TError>
) {
  return function useOptimisticMutation() {
    const queryClient = useQueryClient();

    return createMutation<TData, TError, TVariables>({
      mutationFn: config.mutationFn,

      onMutate: async (variables: TVariables) => {
        if (!config.optimisticUpdate) return {};

        const queryKey = config.queryKey(variables);
        
        // Cancel any outgoing refetches to prevent overwriting optimistic updates
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value for rollback
        const previousData = queryClient.getQueryData<TData>(queryKey);

        // Apply optimistic update
        const optimisticData = config.optimisticUpdate(variables, previousData);
        if (optimisticData) {
          queryClient.setQueryData(queryKey, optimisticData);
          console.log('Applied optimistic update:', { queryKey, optimisticData });
        }

        return { previousData, queryKey };
      },

      onError: (error: TError, variables: TVariables, context?: { previousData?: TData; queryKey: any[] }) => {
        // Rollback optimistic updates if enabled
        if (config.rollbackOnError !== false && context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
          console.log('Rolled back optimistic update due to error:', { queryKey: context.queryKey, error });
        }

        // Call custom error handler
        config.onError?.(error, variables);
      },

      onSuccess: (data: TData, variables: TVariables) => {
        // Defer cache invalidation to prevent hover flicker during UI interactions
        // This allows ongoing CSS transitions to complete before triggering re-renders
        requestAnimationFrame(() => {
          // Invalidate relevant queries
          const mainQueryKey = config.queryKey(variables);
          queryClient.invalidateQueries({ queryKey: mainQueryKey });

          // Invalidate additional queries if specified
          if (config.invalidateKeys) {
            const additionalKeys = config.invalidateKeys(variables);
            additionalKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }

          console.log('Mutation successful, invalidated queries:', { mainQueryKey });
        });

        // Call custom success handler immediately (not deferred)
        config.onSuccess?.(data, variables);
      }
    });
  };
}

/**
 * Factory for creating job-related mutations with standardized patterns
 */
export function createJobMutation<TVariables>(
  mutationFn: (variables: TVariables & { jobId: string }) => Promise<any>,
  optimisticUpdateFn?: (variables: TVariables & { jobId: string }, previousJob?: any) => any
) {
  return createOptimisticMutation({
    mutationFn,
    queryKey: (variables: TVariables & { jobId: string }) => ['job', variables.jobId],
    optimisticUpdate: optimisticUpdateFn,
    invalidateKeys: (variables: TVariables & { jobId: string }) => [
      ['jobs'], // Invalidate jobs list
      ['job', variables.jobId] // Invalidate specific job
    ],
    errorHandler: (error: any) => getPopoverErrorMessage(error)
  });
}

/**
 * Factory for creating user-related mutations with standardized patterns
 */
export function createUserMutation<TVariables>(
  mutationFn: (variables: TVariables & { userId: string }) => Promise<any>,
  optimisticUpdateFn?: (variables: TVariables & { userId: string }, previousUser?: any) => any
) {
  return createOptimisticMutation({
    mutationFn,
    queryKey: (variables: TVariables & { userId: string }) => ['user', variables.userId],
    optimisticUpdate: optimisticUpdateFn,
    invalidateKeys: (variables: TVariables & { userId: string }) => [
      ['users'], // Invalidate users list
      ['user', variables.userId] // Invalidate specific user
    ],
    errorHandler: (error: any) => getPopoverErrorMessage(error)
  });
}

/**
 * Factory for creating simple update mutations (status changes, etc.)
 */
export function createUpdateMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: (variables: TVariables) => any[];
    invalidateKeys?: (variables: TVariables) => any[][];
    optimisticUpdate?: (variables: TVariables, previousData?: TData) => TData | undefined;
  }
) {
  return createOptimisticMutation({
    mutationFn,
    queryKey: options.queryKey,
    optimisticUpdate: options.optimisticUpdate,
    invalidateKeys: options.invalidateKeys,
    errorHandler: (error: any) => getPopoverErrorMessage(error)
  });
}

/**
 * Common mutation patterns - ready-to-use factories
 */

// Job status update mutation factory
export const createJobStatusMutation = (updateJobStatusFn: (jobId: string, status: string) => Promise<any>) =>
  createJobMutation(
    ({ jobId, status }: { jobId: string; status: string }) => updateJobStatusFn(jobId, status),
    ({ status }, previousJob) => previousJob ? {
      ...previousJob,
      attributes: { ...previousJob.attributes, status }
    } : undefined
  );

// Job technicians assignment mutation factory  
export const createJobTechniciansMutation = (updateTechniciansFn: (jobId: string, technicianIds: string[]) => Promise<any>) =>
  createJobMutation(
    ({ jobId, technicianIds }: { jobId: string; technicianIds: string[] }) => updateTechniciansFn(jobId, technicianIds),
    ({ technicianIds }, previousJob) => previousJob ? {
      ...previousJob,
      technicians: technicianIds.map(id => ({
        id,
        attributes: previousJob.technicians?.find((t: any) => t.id === id)?.attributes || {
          name: 'Loading...',
          email: '',
          initials: '?',
          avatar_style: {}
        }
      }))
    } : undefined
  );

// Job priority update mutation factory
export const createJobPriorityMutation = (updatePriorityFn: (jobId: string, priority: string) => Promise<any>) =>
  createJobMutation(
    ({ jobId, priority }: { jobId: string; priority: string }) => updatePriorityFn(jobId, priority),
    ({ priority }, previousJob) => previousJob ? {
      ...previousJob,
      attributes: { ...previousJob.attributes, priority }
    } : undefined
  );

// Generic entity delete mutation factory
export function createDeleteMutation<TVariables>(
  deleteFn: (variables: TVariables) => Promise<any>,
  options: {
    queryKey: (variables: TVariables) => any[];
    invalidateKeys: (variables: TVariables) => any[][];
    removeFromCache?: boolean;
  }
) {
  return function useDeleteMutation() {
    const queryClient = useQueryClient();

    return createMutation<any, Error, TVariables>({
      mutationFn: deleteFn,
      onSuccess: (data, variables) => {
        const queryKey = options.queryKey(variables);
        
        // Remove from cache if requested
        if (options.removeFromCache) {
          queryClient.removeQueries({ queryKey });
        }

        // Invalidate related queries
        options.invalidateKeys(variables).forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        console.log('Delete successful, invalidated queries:', { queryKey });
      },
      onError: (error) => {
        console.error('Delete failed:', error);
      }
    });
  };
}