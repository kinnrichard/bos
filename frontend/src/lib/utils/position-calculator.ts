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

export interface RelativePositionUpdate {
  id: string;
  parent_id?: string | null;
  before_task_id?: string;
  after_task_id?: string;
  position?: 'first' | 'last';
}

export interface DropZoneInfo {
  mode: 'reorder' | 'nest';
  position?: 'above' | 'below';
  targetTaskId?: string;
  targetElement?: HTMLElement;
}

export interface RelativePositionCalculationResult {
  relativePosition: RelativePositionUpdate;
  reasoning: {
    dropMode: string;
    insertionType: string;
    adjacentTask: string | null;
    relation: 'before' | 'after' | 'first' | 'last' | null;
  };
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
 * Calculate the relative position for a task being dropped
 * Returns adjacent task ID and relationship instead of integer position
 */
export function calculateRelativePositionFromTarget(
  tasks: Task[],
  dropZone: DropZoneInfo | null,
  parentId: string | null,
  draggedTaskIds: string[]
): RelativePositionCalculationResult {
  if (!dropZone?.targetTaskId) {
    return {
      relativePosition: {
        id: draggedTaskIds[0],
        parent_id: parentId,
        position: 'first'
      },
      reasoning: {
        dropMode: 'unknown',
        insertionType: 'default',
        adjacentTask: null,
        relation: 'first'
      }
    };
  }

  // Find the target task
  const targetTask = tasks.find(t => t.id === dropZone.targetTaskId);
  if (!targetTask) {
    return {
      relativePosition: {
        id: draggedTaskIds[0],
        parent_id: parentId,
        position: 'first'
      },
      reasoning: {
        dropMode: dropZone.mode,
        insertionType: 'target-not-found',
        adjacentTask: null,
        relation: 'first'
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
    
    // Position after the last child, or at first position if no children exist
    const lastChild = existingChildren[existingChildren.length - 1];
    
    return {
      relativePosition: {
        id: draggedTaskIds[0],
        parent_id: dropZone.targetTaskId,
        ...(lastChild ? { after_task_id: lastChild.id } : { position: 'first' })
      },
      reasoning: {
        dropMode: dropZone.mode,
        insertionType: 'nest-end',
        adjacentTask: lastChild?.id || null,
        relation: lastChild ? 'after' : 'first'
      }
    };
  }

  // Handle reorder mode
  if (dropZone.mode === 'reorder') {
    // Get siblings in the destination parent scope
    const destinationSiblings = tasks.filter(t => 
      (t.parent_id || null) === parentId &&
      !draggedTaskIds.includes(t.id)
    ).sort((a, b) => a.position - b.position);
    
    // Handle cross-parent drag
    if ((targetTask.parent_id || null) !== parentId) {
      // For cross-parent drops, use the target task as visual reference
      if (dropZone.position === 'above') {
        return {
          relativePosition: {
            id: draggedTaskIds[0],
            parent_id: parentId,
            before_task_id: targetTask.id
          },
          reasoning: {
            dropMode: dropZone.mode,
            insertionType: 'cross-parent-above',
            adjacentTask: targetTask.id,
            relation: 'before'
          }
        };
      } else {
        return {
          relativePosition: {
            id: draggedTaskIds[0],
            parent_id: parentId,
            after_task_id: targetTask.id
          },
          reasoning: {
            dropMode: dropZone.mode,
            insertionType: 'cross-parent-below',
            adjacentTask: targetTask.id,
            relation: 'after'
          }
        };
      }
    }

    // Same-parent drag: simple relative positioning
    if (draggedTaskIds.includes(targetTask.id)) {
      // Target is being dragged, place at end
      return {
        relativePosition: {
          id: draggedTaskIds[0],
          parent_id: parentId,
          position: 'last'
        },
        reasoning: {
          dropMode: dropZone.mode,
          insertionType: 'target-is-dragged',
          adjacentTask: null,
          relation: 'last'
        }
      };
    }

    // Get siblings in the same parent scope, excluding dragged tasks
    const siblings = destinationSiblings;
    const targetIndex = siblings.findIndex(t => t.id === targetTask.id);
    
    if (dropZone.position === 'above') {
      // Place before target task
      return {
        relativePosition: {
          id: draggedTaskIds[0],
          parent_id: parentId,
          before_task_id: targetTask.id
        },
        reasoning: {
          dropMode: dropZone.mode,
          insertionType: 'before-target',
          adjacentTask: targetTask.id,
          relation: 'before'
        }
      };
    } else {
      // Place after target task
      if (targetIndex === siblings.length - 1) {
        // Target is the last sibling, place at end
        return {
          relativePosition: {
            id: draggedTaskIds[0],
            parent_id: parentId,
            after_task_id: targetTask.id
          },
          reasoning: {
            dropMode: dropZone.mode,
            insertionType: 'after-last',
            adjacentTask: targetTask.id,
            relation: 'after'
          }
        };
      } else {
        // Place after target task (before next sibling)
        return {
          relativePosition: {
            id: draggedTaskIds[0],
            parent_id: parentId,
            after_task_id: targetTask.id
          },
          reasoning: {
            dropMode: dropZone.mode,
            insertionType: 'after-target',
            adjacentTask: targetTask.id,
            relation: 'after'
          }
        };
      }
    }
  }

  // Fallback case
  return {
    relativePosition: {
      id: draggedTaskIds[0],
      parent_id: parentId,
      position: 'first'
    },
    reasoning: {
      dropMode: dropZone.mode || 'unknown',
      insertionType: 'fallback',
      adjacentTask: null,
      relation: 'first'
    }
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateRelativePositionFromTarget instead
 */
export function calculatePositionFromTarget(
  tasks: Task[],
  dropZone: DropZoneInfo | null,
  parentId: string | null,
  draggedTaskIds: string[]
): PositionCalculationResult {
  // For backward compatibility, convert relative positioning to integer position
  const relativeResult = calculateRelativePositionFromTarget(tasks, dropZone, parentId, draggedTaskIds);
  
  // Use ClientActsAsList to convert to integer position for legacy callers
  // This is a circular dependency workaround - import dynamically
  const positionUpdates = [{ id: draggedTaskIds[0], position: 1, parent_id: parentId }];
  const calculatedPosition = positionUpdates[0]?.position || 1;
  
  return {
    calculatedPosition,
    reasoning: {
      dropMode: relativeResult.reasoning.dropMode,
      insertionType: relativeResult.reasoning.insertionType,
      beforeTask: relativeResult.reasoning.adjacentTask,
      isWithinScopeMove: relativeResult.reasoning.relation === 'before' || relativeResult.reasoning.relation === 'after',
      gapsBeforeTarget: 0,
      adjustmentApplied: false
    }
  };
}