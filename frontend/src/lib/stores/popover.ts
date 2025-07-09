export interface PopoverInstance {
  id: string;
  isOpen: boolean;
  close: () => void;
}

interface PopoverState {
  instances: Map<string, PopoverInstance>;
  activeCount: number;
}

function createPopoverStore() {
  let state = $state<PopoverState>({
    instances: new Map(),
    activeCount: 0
  });

  return {
    // Getter for current state
    get state() {
      return state;
    },
    
    // Register a new popover instance
    register: (id: string, instance: PopoverInstance) => {
      state.instances.set(id, instance);
    },
    
    // Unregister a popover instance
    unregister: (id: string) => {
      state.instances.delete(id);
    },
    
    // Update the open state of a specific popover
    setOpen: (id: string, isOpen: boolean) => {
      const instance = state.instances.get(id);
      if (instance) {
        instance.isOpen = isOpen;
        
        // If opening this popover, close all others
        if (isOpen) {
          state.instances.forEach((otherInstance, otherId) => {
            if (otherId !== id && otherInstance.isOpen) {
              otherInstance.close();
              otherInstance.isOpen = false;
            }
          });
        }
        
        // Update active count
        state.activeCount = Array.from(state.instances.values())
          .filter(inst => inst.isOpen).length;
      }
    },
    
    // Close all open popovers
    closeAll: () => {
      state.instances.forEach(instance => {
        if (instance.isOpen) {
          instance.close();
          instance.isOpen = false;
        }
      });
      state.activeCount = 0;
    },
    
    // Get count of currently open popovers
    getActiveCount: () => {
      return state.activeCount;
    }
  };
}

export const popoverStore = createPopoverStore();

// Global keyboard handler for Escape key
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      popoverStore.closeAll();
    }
  });
}