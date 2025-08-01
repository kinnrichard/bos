/**
 * Display filter utilities for jobs
 * EP-0018: DRY Jobs Pages with Composable Architecture
 *
 * These filters operate on loaded data for client-side filtering
 * providing instant feedback and search-as-you-type functionality
 */

import type { JobData } from '$lib/models/types/job-data';
import type { JobStatus, JobPriority } from '$lib/types/job';

/**
 * Filter options for jobs display
 */
export interface JobFilterOptions {
  search?: string;
  status?: JobStatus;
  priority?: JobPriority;
  technicianId?: string;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  scope?: 'all' | 'mine';
  currentUserId?: string;
}

/**
 * Checks if a job matches the search query
 * Searches in job title and client name
 */
export function matchesSearchQuery(job: JobData, search: string): boolean {
  if (!search || !search.trim()) return true;

  const query = search.toLowerCase().trim();

  // Search in job title
  if (job.title && job.title.toLowerCase().includes(query)) {
    return true;
  }

  // Search in client name (if client is loaded)
  if (job.client && job.client.name && job.client.name.toLowerCase().includes(query)) {
    return true;
  }

  // Could extend to search in description, notes, etc.

  return false;
}

/**
 * Checks if a job is assigned to a specific technician
 */
export function isAssignedToTechnician(job: JobData, technicianId: string): boolean {
  if (!technicianId) return true;

  return job.jobAssignments?.some((assignment) => assignment.user?.id === technicianId) ?? false;
}

/**
 * Checks if a job is assigned to the current user
 */
export function isAssignedToUser(job: JobData, userId: string): boolean {
  if (!userId) return false;

  return job.jobAssignments?.some((assignment) => assignment.user?.id === userId) ?? false;
}

/**
 * Checks if a job falls within a date range
 */
export function isWithinDateRange(job: JobData, dateFrom?: string, dateTo?: string): boolean {
  if (!dateFrom && !dateTo) return true;

  const jobDate = new Date(job.created_at);

  if (dateFrom && jobDate < new Date(dateFrom)) {
    return false;
  }

  if (dateTo && jobDate > new Date(dateTo)) {
    return false;
  }

  return true;
}

/**
 * Creates a composable filter function for jobs
 * This is the main entry point for creating job filters
 */
export function createJobsFilter(options: JobFilterOptions) {
  return (jobs: JobData[]): JobData[] => {
    if (!jobs) return [];

    return jobs.filter((job: JobData) => {
      // Apply search filter
      if (options.search && !matchesSearchQuery(job, options.search)) {
        return false;
      }

      // Apply status filter
      if (options.status && job.status !== options.status) {
        return false;
      }

      // Apply priority filter
      if (options.priority && job.priority !== options.priority) {
        return false;
      }

      // Apply technician filter
      if (options.technicianId && !isAssignedToTechnician(job, options.technicianId)) {
        return false;
      }

      // Apply client filter (redundant if already filtered at query level)
      if (options.clientId && job.client_id !== options.clientId) {
        return false;
      }

      // Apply date range filter
      if (!isWithinDateRange(job, options.dateFrom, options.dateTo)) {
        return false;
      }

      // Apply scope filter
      if (options.scope === 'mine' && options.currentUserId) {
        if (!isAssignedToUser(job, options.currentUserId)) {
          return false;
        }
      }

      return true;
    });
  };
}

/**
 * Utility to create a filter from URL search params
 */
export function createFilterFromSearchParams(
  searchParams: URLSearchParams,
  additionalOptions?: Partial<JobFilterOptions>
): JobFilterOptions {
  return {
    status: searchParams.get('status') as JobStatus | undefined,
    priority: searchParams.get('priority') as JobPriority | undefined,
    technicianId: searchParams.get('technician_id') || undefined,
    clientId: searchParams.get('client_id') || undefined,
    dateFrom: searchParams.get('date_from') || undefined,
    dateTo: searchParams.get('date_to') || undefined,
    scope: (searchParams.get('scope') || 'all') as 'all' | 'mine',
    ...additionalOptions,
  };
}

/**
 * Higher-order function to combine multiple filters
 */
export function combineFilters<T>(...filters: Array<(items: T[]) => T[]>) {
  return (items: T[]): T[] => {
    return filters.reduce((result, filter) => filter(result), items);
  };
}

/**
 * Export the original shouldShowJob function for backwards compatibility
 * This will be deprecated in favor of createJobsFilter
 */
export { shouldShowJob } from '$lib/stores/jobsSearch.svelte';
