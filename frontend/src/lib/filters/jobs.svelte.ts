/**
 * Display filter utilities for jobs
 * EP-0018: DRY Jobs Pages with Composable Architecture
 *
 * These filters operate on loaded data for client-side filtering
 * providing instant feedback and search-as-you-type functionality
 */

import type { JobData } from '$lib/models/types/job-data';
import type { JobStatus, JobPriority } from '$lib/types/job';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, isBefore, isAfter, isToday, isTomorrow } from 'date-fns';

/**
 * Filter options for jobs display
 */
export interface JobFilterOptions {
  search?: string;
  status?: JobStatus;
  statuses?: JobStatus[]; // Support multiple statuses
  priority?: JobPriority;
  priorities?: JobPriority[]; // Support multiple priorities
  technicianId?: string;
  technicianIds?: string[]; // Support multiple technicians
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  dueDateFilters?: string[];
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
 * Supports both user ID and short_name
 */
export function isAssignedToTechnician(job: JobData, technicianIdOrShortName: string): boolean {
  if (!technicianIdOrShortName) return true;

  return (
    job.jobAssignments?.some(
      (assignment) =>
        assignment.user?.id === technicianIdOrShortName ||
        assignment.user?.short_name === technicianIdOrShortName
    ) ?? false
  );
}

/**
 * Checks if a job matches any of the specified technician filters
 * Supports multiple technician IDs/short_names and special "not_assigned" value
 */
export function matchesTechnicianFilter(
  job: JobData,
  technicianIdsOrShortNames: string[]
): boolean {
  if (!technicianIdsOrShortNames || technicianIdsOrShortNames.length === 0) return true;

  // Check if "not_assigned" is selected and job has no assignments
  const hasNotAssignedFilter = technicianIdsOrShortNames.includes('not_assigned');
  const hasNoAssignments = !job.jobAssignments || job.jobAssignments.length === 0;

  if (hasNotAssignedFilter && hasNoAssignments) {
    return true;
  }

  // Check if job is assigned to any of the selected technicians
  const specificTechnicianIds = technicianIdsOrShortNames.filter((id) => id !== 'not_assigned');
  if (specificTechnicianIds.length > 0) {
    return specificTechnicianIds.some((technicianIdOrShortName) =>
      isAssignedToTechnician(job, technicianIdOrShortName)
    );
  }

  return false;
}

/**
 * Checks if a job matches due date filters
 * Supports multiple due date filter types: overdue, today, tomorrow, this_week, next_week, this_month, no_due_date
 */
export function matchesDueDateFilters(job: JobData, dueDateFilters: string[]): boolean {
  // Handle empty or no filters - show all jobs
  if (!dueDateFilters || dueDateFilters.length === 0) return true;

  // Since it's single select, take the first filter
  const selectedFilter = dueDateFilters[0];
  
  const jobDueDate = job.due_at ? new Date(job.due_at) : null;
  const today = new Date();

  // Handle "no_due_date" separately - only show jobs without due dates
  if (selectedFilter === 'no_due_date') {
    return !jobDueDate;
  }

  // If job has no due date and we're filtering by date ranges, exclude it
  if (!jobDueDate) {
    return false;
  }

  // Define the maximum date for each filter (cumulative logic)
  let maxDate: Date;

  switch (selectedFilter) {
    case 'overdue':
      // Only overdue (before today)
      maxDate = startOfDay(today);
      return isBefore(jobDueDate, maxDate);
      
    case 'today':
      // Overdue + due today
      maxDate = endOfDay(today);
      return !isAfter(jobDueDate, maxDate);
      
    case 'tomorrow':
      // Overdue + due today + due tomorrow
      maxDate = endOfDay(addDays(today, 1));
      return !isAfter(jobDueDate, maxDate);
      
    case 'this_week':
      // Overdue + due today + due tomorrow + due this week
      maxDate = endOfWeek(today, { weekStartsOn: 1 }); // Monday start
      return !isAfter(jobDueDate, maxDate);
      
    case 'this_month':
      // Overdue + due today + due tomorrow + due this week + due this month
      maxDate = endOfMonth(today);
      return !isAfter(jobDueDate, maxDate);
      
    default:
      return false;
  }
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

      // Apply status filter (single or multiple)
      // Only filter if we have specific statuses selected
      if (options.status && job.status !== options.status) {
        return false;
      }
      if (
        options.statuses &&
        options.statuses.length > 0 &&
        !options.statuses.includes(job.status as JobStatus)
      ) {
        return false;
      }

      // Apply priority filter (single or multiple)
      // Only filter if we have specific priorities selected
      if (options.priority && job.priority !== options.priority) {
        return false;
      }
      if (
        options.priorities &&
        options.priorities.length > 0 &&
        !options.priorities.includes(job.priority as JobPriority)
      ) {
        return false;
      }

      // Apply technician filter (single or multiple)
      if (options.technicianId && !isAssignedToTechnician(job, options.technicianId)) {
        return false;
      }
      if (options.technicianIds && !matchesTechnicianFilter(job, options.technicianIds)) {
        return false;
      }

      // Apply due date filters
      if (options.dueDateFilters && !matchesDueDateFilters(job, options.dueDateFilters)) {
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
  // Parse comma-separated values for statuses, priorities, and technicians
  const statusParam = searchParams.get('status');
  const priorityParam = searchParams.get('priority');
  const technicianIdsParam = searchParams.get('technician_ids');
  const dueDateParam = searchParams.get('due_date');

  const statuses = statusParam ? (statusParam.split(',') as JobStatus[]) : undefined;
  const priorities = priorityParam ? (priorityParam.split(',') as JobPriority[]) : undefined;
  const technicianIds = technicianIdsParam ? technicianIdsParam.split(',') : undefined;
  
  // For due date, since it's now single select, only take the first value
  const dueDateFilters = dueDateParam ? [dueDateParam.split(',')[0]] : undefined;

  return {
    status: statuses?.length === 1 ? statuses[0] : undefined,
    statuses: statuses?.length && statuses.length > 1 ? statuses : undefined,
    priority: priorities?.length === 1 ? priorities[0] : undefined,
    priorities: priorities?.length && priorities.length > 1 ? priorities : undefined,
    technicianId: searchParams.get('technician_id') || undefined,
    technicianIds: technicianIds?.length ? technicianIds : undefined,
    dueDateFilters: dueDateFilters, // Now single select array with max 1 item
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
