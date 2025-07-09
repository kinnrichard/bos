// Task status filter store - start with all statuses selected
let selectedTaskStatuses = $state<string[]>(['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled']);

// Export for external access
export { selectedTaskStatuses };

// Helper function to check if a task should be visible based on filters
export function shouldShowTask(task: any, statuses: string[]): boolean {
  // If no filters selected, show all tasks
  if (statuses.length === 0) return true;
  
  // Show task if its status is in the selected filters
  return statuses.includes(task.status);
}

// Derived store that provides the filter function
export const taskFilter = $derived((task: any) => shouldShowTask(task, selectedTaskStatuses));

// Actions for managing task filters
export const taskFilterActions = {
  setStatuses: (statuses: string[]) => {
    selectedTaskStatuses = statuses;
  },
  
  clearFilters: () => {
    selectedTaskStatuses = [];
  },
  
  // Getter for current statuses
  get statuses() {
    return selectedTaskStatuses;
  }
};