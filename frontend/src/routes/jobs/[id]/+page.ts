import { error } from '@sveltejs/kit';
import { createQuery } from '@tanstack/svelte-query';
import { jobsService } from '$lib/api/jobs';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const jobId = params.id;

  if (!jobId) {
    throw error(400, 'Job ID is required');
  }

  // Create a query factory function that can be used in the component
  const queryFactory = () => createQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      try {
        const response = await jobsService.getJobWithDetails(jobId);
        return response;
      } catch (err: any) {
        if (err.status === 404) {
          throw error(404, 'Job not found');
        }
        if (err.status === 403) {
          throw error(403, 'You do not have permission to view this job');
        }
        throw err;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry 404s or 403s
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  });

  return {
    jobId,
    queryFactory
  };
};