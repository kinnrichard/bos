/**
 * Position calculation utilities for drag-and-drop operations
 * Extracted from TaskList.svelte for unit testing
 */

export interface Task {
  id: string;
  position: number;
  parent_id?: string | null;
  title?: string;
}

export interface PositionUpdate {
  id: string;
  position: number;
  parent_id?: string | null;
}

export interface DropZoneInfo {
  mode: 'reorder' | 'nest';
  position?: 'above' | 'below';
  targetTaskId?: string;
  targetElement?: HTMLElement;
}

export interface PositionCalculationResult {
  calculatedPosition: number;
  reasoning: {
    dropMode: string;
    insertionType: string;
    beforeTask: string | null;
    isWithinScopeMove: boolean;
    gapsBeforeTarget: number;
    adjustmentApplied: boolean;
  };
}

/**
 * Calculate the target position for a task being dropped
 * This is the pure function extracted from calculatePositionFromTarget
 */
export function calculatePositionFromTarget(
  tasks: Task[],
  dropZone: DropZoneInfo | null,
  parentId: string | null,
  draggedTaskIds: string[]
): PositionCalculationResult {
  if (!dropZone?.targetTaskId) {
    return {
      calculatedPosition: 1,
      reasoning: {
        dropMode: 'unknown',
        insertionType: 'default',
        beforeTask: null,
        isWithinScopeMove: false,
        gapsBeforeTarget: 0,
        adjustmentApplied: false
      }
    };
  }

  // Find the target task
  const targetTask = tasks.find(t => t.id === dropZone.targetTaskId);
  if (!targetTask) {
    return {
      calculatedPosition: 1,
      reasoning: {
        dropMode: dropZone.mode,
        insertionType: 'target-not-found',
        beforeTask: null,
        isWithinScopeMove: false,
        gapsBeforeTarget: 0,
        adjustmentApplied: false
      }
    };
  }

  // Handle nesting mode
  if (dropZone.mode === 'nest') {
    // Get existing children of the target task, sorted by position
    const existingChildren = tasks.filter(t => 
      t.parent_id === dropZone.targetTaskId && 
      !draggedTaskIds.includes(t.id)
    ).sort((a, b) => a.position - b.position);
    
    // Position after the last child, or at position 1 if no children exist
    const calculatedPosition = existingChildren.length > 0 
      ? Math.max(...existingChildren.map(t => t.position)) + 1
      : 1;

    return {
      calculatedPosition,
      reasoning: {
        dropMode: dropZone.mode,
        insertionType: 'nest-end',
        beforeTask: null,
        isWithinScopeMove: false,
        gapsBeforeTarget: 0,
        adjustmentApplied: false
      }
    };
  }

  // Handle reorder mode
  if (dropZone.mode === 'reorder') {
    // Handle cross-parent drag (target not in same parent as drop destination)
    if ((targetTask.parent_id || null) !== parentId) {
      // Use visual-order-based positioning for cross-parent drops
      const targetParentSiblings = tasks.filter(t => 
        (t.parent_id || null) === (targetTask.parent_id || null)
      ).sort((a, b) => a.position - b.position);
      
      const targetVisualIndex = targetParentSiblings.findIndex(t => t.id === targetTask.id);
      
      let calculatedPosition;
      if (dropZone.position === 'above') {
        calculatedPosition = targetTask.position;
      } else {
        if (targetVisualIndex === targetParentSiblings.length - 1) {
          calculatedPosition = targetTask.position + 1;
        } else {
          const nextSibling = targetParentSiblings[targetVisualIndex + 1];
          calculatedPosition = nextSibling.position;
        }
      }
      
      return {
        calculatedPosition,
        reasoning: {
          dropMode: dropZone.mode,
          insertionType: 'cross-parent',
          beforeTask: null,
          isWithinScopeMove: false,
          gapsBeforeTarget: 0,
          adjustmentApplied: false
        }
      };
    }

    // Same-parent drag: use direct target position logic
    // Check if target task is being dragged
    if (draggedTaskIds.includes(targetTask.id)) {
      // Target is being dragged, use fallback based on siblings
      const siblings = tasks.filter(t => 
        (t.parent_id || null) === parentId && 
        !draggedTaskIds.includes(t.id)
      ).sort((a, b) => a.position - b.position);
      
      return {
        calculatedPosition: siblings.length + 1,
        reasoning: {
          dropMode: dropZone.mode,
          insertionType: 'target-is-dragged',
          beforeTask: null,
          isWithinScopeMove: true,
          gapsBeforeTarget: 0,
          adjustmentApplied: false
        }
      };
    }

    // Get siblings in visual order (sorted by position)
    const visualSiblings = tasks.filter(t => 
      (t.parent_id || null) === parentId && 
      !draggedTaskIds.includes(t.id)
    ).sort((a, b) => a.position - b.position);
    
    // Find target's position in visual order
    const targetVisualIndex = visualSiblings.findIndex(t => t.id === targetTask.id);
    
    // Normalize both above/below to "insert before task X"
    let beforeTask: Task | null;
    let insertionType: string;
    
    if (dropZone.position === 'above') {
      // Above target = insert before target
      if (targetVisualIndex === 0) {
        beforeTask = targetTask;
        insertionType = 'before-first';
      } else {
        beforeTask = targetTask;
        insertionType = 'before-target';
      }
    } else {
      // Below target = insert before next sibling (or at end if last)
      if (targetVisualIndex === visualSiblings.length - 1) {
        beforeTask = null;
        insertionType = 'at-end';
      } else {
        beforeTask = visualSiblings[targetVisualIndex + 1];
        insertionType = 'before-next';
      }
    }
    
    // Calculate base position from "before task"
    let calculatedPosition: number;
    if (beforeTask === null) {
      // Insert at end
      calculatedPosition = targetTask.position + 1;
    } else {
      calculatedPosition = beforeTask.position;
    }
    
    // RAILS BEHAVIOR: insert_at(position) puts task at exactly that position
    // No gap adjustment needed - Rails handles gap elimination automatically
    const isWithinScopeMove = draggedTaskIds.some(id => {
      const task = tasks.find(t => t.id === id);
      return task && (task.parent_id || null) === parentId;
    });
    
    let gapsBeforeTarget = 0;
    let adjustmentApplied = false;
    
    // Rails acts_as_list puts the task exactly where you tell it to
    // The gap elimination and position shifts happen automatically
    
    return {
      calculatedPosition,
      reasoning: {
        dropMode: dropZone.mode,
        insertionType,
        beforeTask: beforeTask ? `${beforeTask.id}:${beforeTask.position}` : null,
        isWithinScopeMove,
        gapsBeforeTarget,
        adjustmentApplied
      }
    };
  }

  return {
    calculatedPosition: 1,
    reasoning: {
      dropMode: dropZone.mode || 'unknown',
      insertionType: 'fallback',
      beforeTask: null,
      isWithinScopeMove: false,
      gapsBeforeTarget: 0,
      adjustmentApplied: false
    }
  };
}