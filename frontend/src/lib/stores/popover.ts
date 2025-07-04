import { writable } from 'svelte/store';

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
  const { subscribe, set, update } = writable<PopoverState>({
    instances: new Map(),
    activeCount: 0
  });

  return {
    subscribe,
    
    // Register a new popover instance
    register: (id: string, instance: PopoverInstance) => {
      update(state => {
        state.instances.set(id, instance);
        return state;
      });
    },
    
    // Unregister a popover instance
    unregister: (id: string) => {
      update(state => {
        state.instances.delete(id);
        return state;
      });
    },
    
    // Update the open state of a specific popover
    setOpen: (id: string, isOpen: boolean) => {
      update(state => {
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
        return state;
      });
    },
    
    // Close all open popovers
    closeAll: () => {
      update(state => {
        state.instances.forEach(instance => {
          if (instance.isOpen) {
            instance.close();
            instance.isOpen = false;
          }
        });
        state.activeCount = 0;
        return state;
      });
    },
    
    // Get count of currently open popovers
    getActiveCount: () => {
      let count = 0;
      update(state => {
        count = state.activeCount;
        return state;
      });
      return count;
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