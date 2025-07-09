export interface TaskSelectionState {
  selectedTaskIds: Set<string>;
  lastSelectedTaskId: string | null;
  isMultiSelectActive: boolean;
}

// Create the task selection store with runes
function createTaskSelectionStore() {
  let state = $state<TaskSelectionState>({
    selectedTaskIds: new Set(),
    lastSelectedTaskId: null,
    isMultiSelectActive: false
  });

  return {
    // Getter for current state
    get state() {
      return state;
    },
    
    /**
     * Select a single task (clears other selections)
     */
    selectTask: (taskId: string) => {
      state = {
        ...state,
        selectedTaskIds: new Set([taskId]),
        lastSelectedTaskId: taskId,
        isMultiSelectActive: false
      };
    },

    /**
     * Toggle task selection (cmd/ctrl+click behavior)
     */
    toggleTask: (taskId: string) => {
      const newSelected = new Set(state.selectedTaskIds);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      
      state = {
        ...state,
        selectedTaskIds: newSelected,
        lastSelectedTaskId: taskId,
        isMultiSelectActive: newSelected.size > 1
      };
    },

    /**
     * Select range of tasks (shift+click behavior)
     */
    selectRange: (taskId: string, allTaskIds: string[]) => {
      const currentIndex = allTaskIds.indexOf(taskId);
      const lastIndex = state.lastSelectedTaskId 
        ? allTaskIds.indexOf(state.lastSelectedTaskId) 
        : currentIndex;

      if (currentIndex === -1 || lastIndex === -1) {
        // Fallback to single selection
        state = {
          ...state,
          selectedTaskIds: new Set([taskId]),
          lastSelectedTaskId: taskId,
          isMultiSelectActive: false
        };
        return;
      }

      const startIndex = Math.min(currentIndex, lastIndex);
      const endIndex = Math.max(currentIndex, lastIndex);
      const rangeTaskIds = allTaskIds.slice(startIndex, endIndex + 1);

      // Merge with existing selection
      const newSelected = new Set(state.selectedTaskIds);
      rangeTaskIds.forEach(id => newSelected.add(id));

      state = {
        ...state,
        selectedTaskIds: newSelected,
        lastSelectedTaskId: taskId,
        isMultiSelectActive: newSelected.size > 1
      };
    },

    /**
     * Clear all selections
     */
    clearSelection: () => {
      state = {
        selectedTaskIds: new Set(),
        lastSelectedTaskId: null,
        isMultiSelectActive: false
      };
    },

    /**
     * Check if a task is selected
     */
    isTaskSelected: (taskId: string) => {
      return state.selectedTaskIds.has(taskId);
    },

    /**
     * Get count of selected tasks
     */
    getSelectedCount: () => {
      return state.selectedTaskIds.size;
    },

    /**
     * Get array of selected task IDs
     */
    getSelectedTaskIds: () => {
      return Array.from(state.selectedTaskIds);
    }
  };
}

export const taskSelection = createTaskSelectionStore();

// Derived stores for common use cases
export const selectedTaskIds = $derived(Array.from(taskSelection.state.selectedTaskIds));

export const selectedTaskCount = $derived(taskSelection.state.selectedTaskIds.size);

export const isMultiSelectActive = $derived(taskSelection.state.isMultiSelectActive);

export const hasSelection = $derived(taskSelection.state.selectedTaskIds.size > 0);