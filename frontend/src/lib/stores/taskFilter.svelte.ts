import { getTaskStatusString, getTaskStatusNumber } from '$lib/utils/enum-mappings';

// Task status filter store - proper Svelte 5 pattern
export const taskFilter = $state({
  selectedStatuses: ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'] as string[]
});

// Helper function to check if a task should be visible based on filters
export function shouldShowTask(task: any, statuses: string[]): boolean {
  // If no filters selected, show all tasks
  if (statuses.length === 0) return true;
  
  // Convert task's numeric status to string for comparison
  const taskStatusString = getTaskStatusString(task.status);
  
  // Show task if its status string is in the selected filters
  return statuses.includes(taskStatusString);
}

// Filter function - returns a function that checks if a task should be visible
export function getTaskFilterFunction() {
  return (task: any) => shouldShowTask(task, taskFilter.selectedStatuses);
}

// Actions for managing task filters
export const taskFilterActions = {
  setStatuses: (statuses: string[]) => {
    taskFilter.selectedStatuses = statuses;
  },
  
  clearFilters: () => {
    taskFilter.selectedStatuses = [];
  },
  
  // Toggle a specific status
  toggleStatus: (status: string) => {
    const index = taskFilter.selectedStatuses.indexOf(status);
    if (index === -1) {
      taskFilter.selectedStatuses.push(status);
    } else {
      taskFilter.selectedStatuses.splice(index, 1);
    }
  }
};