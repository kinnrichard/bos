import { api } from './client';
import type {
  JobResource,
  JobCreateRequest,
  JobUpdateRequest,
  PaginatedResponse,
  JsonApiResponse
} from '$lib/types/api';

export class JobsService {
  /**
   * Get paginated list of jobs
   */
  async getJobs(params: {
    page?: number;
    per_page?: number;
    status?: string;
    client_id?: string;
    technician_id?: string;
  } = {}): Promise<PaginatedResponse<JobResource>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/jobs${queryString ? `?${queryString}` : ''}`;
    
    return api.get<PaginatedResponse<JobResource>>(endpoint);
  }

  /**
   * Get single job by ID
   */
  async getJob(id: string): Promise<JsonApiResponse<JobResource>> {
    return api.get<JsonApiResponse<JobResource>>(`/jobs/${id}`);
  }

  /**
   * Create new job
   */
  async createJob(jobData: JobCreateRequest): Promise<JsonApiResponse<JobResource>> {
    return api.post<JsonApiResponse<JobResource>>('/jobs', {
      data: {
        type: 'jobs',
        attributes: jobData
      }
    });
  }

  /**
   * Update existing job
   */
  async updateJob(id: string, jobData: JobUpdateRequest): Promise<JsonApiResponse<JobResource>> {
    return api.patch<JsonApiResponse<JobResource>>(`/jobs/${id}`, {
      data: {
        type: 'jobs',
        id,
        attributes: jobData
      }
    });
  }

  /**
   * Delete job
   */
  async deleteJob(id: string): Promise<void> {
    await api.delete(`/jobs/${id}`);
  }

  /**
   * Bulk update job statuses
   */
  async bulkUpdateJobStatus(
    jobIds: string[], 
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<JsonApiResponse<JobResource[]>> {
    return api.patch<JsonApiResponse<JobResource[]>>('/jobs/bulk_update', {
      data: {
        type: 'bulk_job_update',
        attributes: {
          job_ids: jobIds,
          status
        }
      }
    });
  }
}

// Export singleton instance
export const jobsService = new JobsService();