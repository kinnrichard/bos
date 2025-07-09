import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { jobsService } from '../jobs';
import { createJobTechniciansMutation, createJobStatusMutation } from './mutation-factories';
import type {
  JobResource,
  JobCreateRequest,
  JobUpdateRequest,
  PaginatedResponse,
  JsonApiResponse
} from '$lib/types/api';
import type { PopulatedJob } from '$lib/types/job';

/**
 * Query hook for fetching jobs list
 */
export function useJobsQuery(params: {
  page?: number;
  per_page?: number;
  status?: string;
  client_id?: string;
  technician_id?: string;
} = {}) {
  return createQuery(() => ({
    queryKey: ['jobs', params],
    queryFn: () => jobsService.getJobs(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  }));
}

/**
 * Query hook for fetching single job with populated relationships
 */
export function useJobQuery(id: string, enabled: boolean = true) {
  return createQuery(() => ({
    queryKey: ['job', id],
    queryFn: () => jobsService.getJobWithDetails(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }));
}

/**
 * Mutation hook for creating jobs
 */
export function useCreateJobMutation() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: (jobData: JobCreateRequest) => jobsService.createJob(jobData),
    onSuccess: (data: JsonApiResponse<JobResource>) => {
      // Invalidate and refetch jobs list
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      // Add the new job to the cache
      queryClient.setQueryData(['job', data.data.id], data);
    },
    onError: (error) => {
      console.error('Failed to create job:', error);
    }
  }));
}

/**
 * Mutation hook for updating jobs
 */
export function useUpdateJobMutation() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ id, data }: { id: string; data: JobUpdateRequest }) => 
      jobsService.updateJob(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['job', id] });
      
      // Snapshot previous value
      const previousJob = queryClient.getQueryData(['job', id]);
      
      // Optimistically update job
      queryClient.setQueryData(['job', id], (old: JsonApiResponse<JobResource> | undefined) => {
        if (!old) return old;
        
        return {
          ...old,
          data: {
            ...old.data,
            attributes: {
              ...old.data.attributes,
              ...data
            }
          }
        };
      });
      
      return { previousJob };
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(['job', id], context.previousJob);
      }
      console.error('Failed to update job:', error);
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  }));
}

/**
 * Mutation hook for deleting jobs
 */
export function useDeleteJobMutation() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: (id: string) => jobsService.deleteJob(id),
    onSuccess: (_, id) => {
      // Remove job from cache
      queryClient.removeQueries({ queryKey: ['job', id] });
      
      // Invalidate jobs list
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error) => {
      console.error('Failed to delete job:', error);
    }
  }));
}

/**
 * Mutation hook for updating job technician assignments with optimistic updates
 * Now uses the standardized mutation factory pattern
 */
export function useUpdateJobTechniciansMutation() {
  const mutationFactory = createJobTechniciansMutation(
    (jobId: string, technicianIds: string[]) => jobsService.updateJobTechnicians(jobId, technicianIds)
  );
  
  return mutationFactory();
}

/**
 * Mutation hook for updating job status with optimistic updates
 * Uses the standardized mutation factory pattern
 */
export function useUpdateJobStatusMutation() {
  const mutationFactory = createJobStatusMutation(
    (jobId: string, status: string) => jobsService.updateJobStatus(jobId, status)
  );
  
  return mutationFactory();
}

/**
 * Mutation hook for bulk status updates
 */
export function useBulkUpdateJobStatusMutation() {
  const queryClient = useQueryClient();

  return createMutation(() => ({
    mutationFn: ({ 
      jobIds, 
      status 
    }: { 
      jobIds: string[]; 
      status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' 
    }) => 
      jobsService.bulkUpdateJobStatus(jobIds, status),
    onSuccess: () => {
      // Invalidate all job-related queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
    onError: (error) => {
      console.error('Failed to bulk update jobs:', error);
    }
  }));
}