
import { getTaskStatusString, getTaskStatusInteger } from '$lib/utils/enum-conversions';

// Task status filter store - proper Svelte 5 pattern
export const taskFilter = $state({
  selectedStatuses: ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'] as string[],
  showDeleted: false
});

// Helper function to check if a task should be visible based on filters
export function shouldShowTask(task: any, statuses: string[], showDeleted: boolean = false): boolean {
  // Check if task is discarded (soft deleted) - use discarded_at field
  const isDiscarded = !!(task.discarded_at);
  
  // If showDeleted is false, exclude discarded tasks
  if (!showDeleted && isDiscarded) return false;
  
  // If showDeleted is true, only show discarded tasks
  if (showDeleted && !isDiscarded) return false;
  
  // If no status filters selected, show all tasks (that match deletion filter)
  if (statuses.length === 0) return true;
  
  // Convert task status integer to string for comparison
  const taskStatusString = getTaskStatusString(task.status);
  return statuses.includes(taskStatusString);
}

// Filter function - returns a function that checks if a task should be visible
export function getTaskFilterFunction() {
  return (task: any) => shouldShowTask(task, taskFilter.selectedStatuses, taskFilter.showDeleted);
}

// Actions for managing task filters
export const taskFilterActions = {
  setStatuses: (statuses: string[]) => {
    taskFilter.selectedStatuses = statuses;
  },
  
  setShowDeleted: (showDeleted: boolean) => {
    taskFilter.showDeleted = showDeleted;
  },
  
  clearFilters: () => {
    taskFilter.selectedStatuses = [];
    taskFilter.showDeleted = false;
  },
  
  // Toggle a specific status
  toggleStatus: (status: string) => {
    const index = taskFilter.selectedStatuses.indexOf(status);
    if (index === -1) {
      taskFilter.selectedStatuses.push(status);
    } else {
      taskFilter.selectedStatuses.splice(index, 1);
    }
  },

  // Toggle deleted visibility
  toggleDeleted: () => {
    taskFilter.showDeleted = !taskFilter.showDeleted;
  }
};