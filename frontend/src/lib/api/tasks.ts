import { api } from './client';
import type { TaskResource } from '$lib/types';

// Simplified task interface for component use
export interface Task {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  position?: number;
  subtasks_count?: number;
  depth?: number;
}

export interface TaskReorderRequest {
  id: string;
  position: number;
  lock_version?: number;
}

export interface BatchTaskReorderRequest {
  positions: TaskReorderRequest[];
  job_lock_version?: number;
}

export interface TaskReorderResponse {
  status: string;
  timestamp: string;
  lock_version?: number;
  job_lock_version?: number;
  tasks?: Array<{ id: string; lock_version: number }>;
}

export interface TaskReorderError {
  error: string;
  conflict?: boolean;
  current_state?: {
    job_lock_version: number;
    tasks: Array<{
      id: string;
      title: string;
      position: number;
      parent_id?: string;
      status: string;
      lock_version: number;
    }>;
  };
}

export class TasksService {
  /**
   * Reorder a single task to a new position
   */
  async reorderTask(
    jobId: string, 
    taskId: string, 
    position: number, 
    lockVersion?: number
  ): Promise<TaskReorderResponse> {
    const payload: { position: number; lock_version?: number } = { position };
    if (lockVersion !== undefined) {
      payload.lock_version = lockVersion;
    }

    return api.patch<TaskReorderResponse>(`/jobs/${jobId}/tasks/${taskId}/reorder`, payload);
  }

  /**
   * Batch reorder multiple tasks
   */
  async batchReorderTasks(
    clientId: string,
    jobId: string, 
    request: BatchTaskReorderRequest
  ): Promise<TaskReorderResponse> {
    return api.patch<TaskReorderResponse>(`/clients/${clientId}/jobs/${jobId}/tasks/reorder`, request);
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    clientId: string,
    jobId: string, 
    taskId: string, 
    status: string
  ): Promise<{ status: string; task: Task }> {
    return api.patch<{ status: string; task: Task }>(`/clients/${clientId}/jobs/${jobId}/tasks/${taskId}/update_status`, {
      status
    });
  }

  /**
   * Create new task
   */
  async createTask(
    jobId: string,
    taskData: {
      title: string;
      status?: string;
      parent_id?: string;
      position?: number;
    }
  ): Promise<{ status: string; task: Task }> {
    return api.post<{ status: string; task: Task }>(`/jobs/${jobId}/tasks`, {
      task: taskData
    });
  }

  /**
   * Update task
   */
  async updateTask(
    jobId: string,
    taskId: string,
    taskData: Partial<{
      title: string;
      status: string;
      assigned_to_id: string;
      parent_id: string;
      position: number;
    }>
  ): Promise<{ status: string; task: Task; timestamp: string }> {
    return api.patch<{ status: string; task: Task; timestamp: string }>(`/jobs/${jobId}/tasks/${taskId}`, {
      task: taskData
    });
  }

  /**
   * Delete task
   */
  async deleteTask(jobId: string, taskId: string): Promise<{ status: string; message: string }> {
    return api.delete<{ status: string; message: string }>(`/jobs/${jobId}/tasks/${taskId}`);
  }

  /**
   * Get task details
   */
  async getTaskDetails(jobId: string, taskId: string): Promise<Task> {
    return api.get<Task>(`/jobs/${jobId}/tasks/${taskId}/details`);
  }

  /**
   * Assign task to technician
   */
  async assignTask(
    jobId: string, 
    taskId: string, 
    technicianId: string | null
  ): Promise<{ status: string; technician?: { id: string; name: string } }> {
    return api.patch<{ status: string; technician?: { id: string; name: string } }>(
      `/jobs/${jobId}/tasks/${taskId}/assign`,
      { technician_id: technicianId }
    );
  }

  /**
   * Add note to task
   */
  async addNote(
    jobId: string, 
    taskId: string, 
    content: string
  ): Promise<{
    status: string;
    note: {
      id: string;
      content: string;
      user_name: string;
      created_at: string;
    };
  }> {
    return api.post<{
      status: string;
      note: {
        id: string;
        content: string;
        user_name: string;
        created_at: string;
      };
    }>(`/jobs/${jobId}/tasks/${taskId}/notes`, {
      note: { content }
    });
  }

  /**
   * Search tasks within a job
   */
  async searchTasks(
    jobId: string, 
    query: string
  ): Promise<{
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      parent_titles: string[];
    }>;
  }> {
    return api.get<{
      tasks: Array<{
        id: string;
        title: string;
        status: string;
        parent_titles: string[];
      }>;
    }>(`/jobs/${jobId}/tasks/search?q=${encodeURIComponent(query)}`);
  }
}

// Export singleton instance
export const tasksService = new TasksService();