import { writable, derived, get } from 'svelte/store';

export interface TaskSelectionState {
  selectedTaskIds: Set<string>;
  lastSelectedTaskId: string | null;
  isMultiSelectActive: boolean;
}

// Create the writable store for task selection
function createTaskSelectionStore() {
  const { subscribe, set, update } = writable<TaskSelectionState>({
    selectedTaskIds: new Set(),
    lastSelectedTaskId: null,
    isMultiSelectActive: false
  });

  return {
    subscribe,
    
    /**
     * Select a single task (clears other selections)
     */
    selectTask: (taskId: string) => {
      update(state => ({
        ...state,
        selectedTaskIds: new Set([taskId]),
        lastSelectedTaskId: taskId,
        isMultiSelectActive: false
      }));
    },

    /**
     * Toggle task selection (cmd/ctrl+click behavior)
     */
    toggleTask: (taskId: string) => {
      update(state => {
        const newSelected = new Set(state.selectedTaskIds);
        if (newSelected.has(taskId)) {
          newSelected.delete(taskId);
        } else {
          newSelected.add(taskId);
        }
        
        return {
          ...state,
          selectedTaskIds: newSelected,
          lastSelectedTaskId: taskId,
          isMultiSelectActive: newSelected.size > 1
        };
      });
    },

    /**
     * Select range of tasks (shift+click behavior)
     */
    selectRange: (taskId: string, allTaskIds: string[]) => {
      update(state => {
        const currentIndex = allTaskIds.indexOf(taskId);
        const lastIndex = state.lastSelectedTaskId 
          ? allTaskIds.indexOf(state.lastSelectedTaskId) 
          : currentIndex;

        if (currentIndex === -1 || lastIndex === -1) {
          // Fallback to single selection
          return {
            ...state,
            selectedTaskIds: new Set([taskId]),
            lastSelectedTaskId: taskId,
            isMultiSelectActive: false
          };
        }

        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);
        const rangeTaskIds = allTaskIds.slice(startIndex, endIndex + 1);

        // Merge with existing selection
        const newSelected = new Set(state.selectedTaskIds);
        rangeTaskIds.forEach(id => newSelected.add(id));

        return {
          ...state,
          selectedTaskIds: newSelected,
          lastSelectedTaskId: taskId,
          isMultiSelectActive: newSelected.size > 1
        };
      });
    },

    /**
     * Clear all selections
     */
    clearSelection: () => {
      set({
        selectedTaskIds: new Set(),
        lastSelectedTaskId: null,
        isMultiSelectActive: false
      });
    },

    /**
     * Check if a task is selected
     */
    isTaskSelected: (taskId: string) => {
      const state = get({ subscribe });
      return state.selectedTaskIds.has(taskId);
    },

    /**
     * Get count of selected tasks
     */
    getSelectedCount: () => {
      const state = get({ subscribe });
      return state.selectedTaskIds.size;
    },

    /**
     * Get array of selected task IDs
     */
    getSelectedTaskIds: () => {
      const state = get({ subscribe });
      return Array.from(state.selectedTaskIds);
    }
  };
}

export const taskSelection = createTaskSelectionStore();

// Derived stores for common use cases
export const selectedTaskIds = derived(
  taskSelection,
  $taskSelection => Array.from($taskSelection.selectedTaskIds)
);

export const selectedTaskCount = derived(
  taskSelection,
  $taskSelection => $taskSelection.selectedTaskIds.size
);

export const isMultiSelectActive = derived(
  taskSelection,
  $taskSelection => $taskSelection.isMultiSelectActive
);

export const hasSelection = derived(
  taskSelection,
  $taskSelection => $taskSelection.selectedTaskIds.size > 0
);