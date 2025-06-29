import { createQuery } from '@tanstack/svelte-query';
import { jobsService } from '$lib/api/jobs';
import type { PageLoad } from './$types';
import type { JobStatus, JobPriority } from '$lib/types/job';

export const load: PageLoad = async ({ url }) => {
  // Extract query parameters for future filtering support
  const scope = url.searchParams.get('scope') || 'all';
  const status = url.searchParams.get('status') as JobStatus | undefined;
  const priority = url.searchParams.get('priority') as JobPriority | undefined;
  const page = parseInt(url.searchParams.get('page') || '1');
  const per_page = parseInt(url.searchParams.get('per_page') || '20');

  // Create query factory function
  const createJobsQuery = () => createQuery({
    queryKey: ['jobs', { scope, status, priority, page, per_page }],
    queryFn: async () => {
      const response = await jobsService.getJobsWithScope({
        scope: scope as 'all' | 'mine',
        status,
        priority,
        page,
        per_page,
        include: 'client,technicians,tasks' // Include related data
      });
      
      // Populate the jobs with relationship data
      const populatedJobs = jobsService.populateJobs(response);
      
      return {
        jobs: populatedJobs,
        meta: response.meta,
        links: response.links
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });

  return {
    queryFactory: createJobsQuery,
    params: {
      scope,
      status,
      priority,
      page,
      per_page
    }
  };
};