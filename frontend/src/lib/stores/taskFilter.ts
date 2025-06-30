import { writable, derived } from 'svelte/store';

// Task status filter store - start with all statuses selected
export const selectedTaskStatuses = writable<string[]>(['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled']);

// Helper function to check if a task should be visible based on filters
export function shouldShowTask(task: any, statuses: string[]): boolean {
  // If no filters selected, show all tasks
  if (statuses.length === 0) return true;
  
  // Show task if its status is in the selected filters
  return statuses.includes(task.status);
}

// Derived store that provides the filter function
export const taskFilter = derived(
  selectedTaskStatuses,
  ($statuses) => (task: any) => shouldShowTask(task, $statuses)
);

// Actions for managing task filters
export const taskFilterActions = {
  setStatuses: (statuses: string[]) => {
    selectedTaskStatuses.set(statuses);
  },
  
  clearFilters: () => {
    selectedTaskStatuses.set([]);
  }
};