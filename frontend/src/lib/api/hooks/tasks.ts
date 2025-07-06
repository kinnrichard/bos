import { createQuery } from '@tanstack/svelte-query';
import { tasksService } from '../tasks';

/**
 * Query hook for fetching batch task details for all tasks in a job
 * This fetches detailed information (notes, activity logs, etc.) for all tasks
 * in a single request to eliminate N+1 queries
 */
export function useTaskBatchDetailsQuery(jobId: string, enabled: boolean = true) {
  return createQuery({
    queryKey: ['tasks', 'batch-details', jobId],
    queryFn: () => tasksService.getBatchTaskDetails(jobId),
    enabled: enabled && !!jobId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
  });
}