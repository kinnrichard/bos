

// Task status filter store - proper Svelte 5 pattern
export const taskFilter = $state({
  selectedStatuses: ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'] as string[],
  showDeleted: false,
  searchQuery: '' as string,
  searchFields: ['title', 'description'] as ('title' | 'description')[]
});

// Comprehensive filtering logic using reactive store
export function shouldShowTask(task: any): boolean {
  // Deletion filter
  const isDiscarded = !!(task.discarded_at);
  
  // If showDeleted is false, exclude discarded tasks
  if (!taskFilter.showDeleted && isDiscarded) return false;
  
  // If showDeleted is true, only show discarded tasks (ignore status filter)
  if (taskFilter.showDeleted && !isDiscarded) return false;
  
  // Status filter - only apply when NOT showing deleted tasks
  if (!taskFilter.showDeleted && taskFilter.selectedStatuses.length > 0) {
    if (!taskFilter.selectedStatuses.includes(task.status)) return false;
  }
  
  // Search filter
  if (taskFilter.searchQuery.trim().length > 0) {
    const query = taskFilter.searchQuery.toLowerCase();
    let matchesSearch = false;
    
    for (const field of taskFilter.searchFields) {
      const fieldValue = task[field];
      if (fieldValue && typeof fieldValue === 'string') {
        if (fieldValue.toLowerCase().includes(query)) {
          matchesSearch = true;
          break;
        }
      }
    }
    
    if (!matchesSearch) return false;
  }
  
  return true;
}

// Legacy compatibility function (to be removed after migration)
export function shouldShowTaskLegacy(task: any, statuses: string[], showDeleted: boolean = false): boolean {
  // Check if task is discarded (soft deleted) - use discarded_at field
  const isDiscarded = !!(task.discarded_at);
  
  // If showDeleted is false, exclude discarded tasks
  if (!showDeleted && isDiscarded) return false;
  
  // If showDeleted is true, only show discarded tasks (ignore status filter)
  if (showDeleted && !isDiscarded) return false;
  
  // Status filter - only apply when NOT showing deleted tasks
  if (!showDeleted) {
    // If no status filters selected, show all tasks (that match deletion filter)
    if (statuses.length === 0) return true;
    
    // Task status is now stored as string, compare directly
    return statuses.includes(task.status);
  }
  
  // If showing deleted, ignore status filter
  return true;
}

// Filter function - returns a function that checks if a task should be visible
export function getTaskFilterFunction() {
  return (task: any) => shouldShowTask(task);
}

// Helper functions for accessing reactive filter state
export function getFilterSummary(): string[] {
  const summary: string[] = [];
  
  // Deleted filter summary - show first since it overrides status
  if (taskFilter.showDeleted) {
    summary.push('Showing deleted tasks');
  } else {
    // Status filter summary - only show when not viewing deleted
    if (taskFilter.selectedStatuses.length > 0) {
      const statusCount = taskFilter.selectedStatuses.length;
      summary.push(`Status: ${statusCount} selected`);
    }
  }
  
  // Search filter summary
  if (taskFilter.searchQuery.trim().length > 0) {
    summary.push(`Search: "${taskFilter.searchQuery}"`);
  }
  
  return summary;
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
  },

  // Set search query
  setSearchQuery: (query: string) => {
    taskFilter.searchQuery = query;
  },

  // Clear search query
  clearSearch: () => {
    taskFilter.searchQuery = '';
  }
};