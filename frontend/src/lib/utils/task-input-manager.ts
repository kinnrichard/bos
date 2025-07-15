/**
 * High-level task input management for unified state coordination
 * Eliminates repetitive input show/hide/create patterns in TaskList.svelte
 */

import { type InputHandlers, TaskInputPatterns } from './input-handlers';
import { positionCursorAtClick } from './cursor-positioning';

interface TaskInputState {
  title: { get: () => string; set: (v: string) => void };
  inputElement: { get: () => HTMLInputElement | undefined };
  isCreating: { get: () => boolean; set: (v: boolean) => void };
  isShowing: { get: () => boolean; set: (v: boolean) => void };
}

interface TaskInputActions {
  create: (shouldSelect: boolean) => Promise<void>;
  cancel: () => void;
}

export interface TaskInputManager {
  show: (clickEvent?: MouseEvent) => void;
  hide: () => void;
  createTask: (shouldSelect?: boolean) => Promise<void>;
  handlers: InputHandlers;
}

/**
 * Creates a unified task input manager that handles show/hide/create lifecycle
 */
export function createTaskInputManager(
  state: TaskInputState,
  actions: TaskInputActions
): TaskInputManager {
  
  // Create unified handlers using the composable pattern
  const handlers = TaskInputPatterns.newTask(
    actions.create,
    actions.cancel,
    state.title.get
  );
  
  return {
    show: (clickEvent?: MouseEvent) => {
      state.isShowing.set(true);
      
      // Focus and position cursor after DOM update
      setTimeout(() => {
        const input = state.inputElement.get();
        if (input) {
          input.focus();
          
          if (clickEvent) {
            positionCursorAtClick(clickEvent, input, input.placeholder);
          }
        }
      }, 0);
    },
    
    hide: actions.cancel,
    
    createTask: actions.create,
    
    handlers
  };
}

/**
 * Creates a title editing manager with cursor positioning
 */
export function createTitleEditManager(
  saveFn: () => Promise<void> | void,
  cancelFn: () => void
): InputHandlers {
  return TaskInputPatterns.titleEdit(saveFn, cancelFn);
}