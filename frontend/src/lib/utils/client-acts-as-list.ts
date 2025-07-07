/**
 * Client-side simulation of Rails acts_as_list behavior
 * Extracted from TaskList.svelte for unit testing
 */

import type { Task, PositionUpdate, RelativePositionUpdate } from './position-calculator.js';

export interface ActsAsListResult {
  updatedTasks: Task[];
  operations: ActsAsListOperation[];
}

export interface ActsAsListOperation {
  type: 'gap-elimination' | 'insertion';
  scope: string | null;
  taskId: string;
  oldPosition: number;
  newPosition: number;
  reason: string;
}

/**
 * Client-side simulation of Rails acts_as_list position management
 * This mirrors the server-side behavior for optimistic updates
 */
export class ClientActsAsList {
  /**
   * Apply position updates matching Rails acts_as_list behavior
   * Based on actual Rails test results
   */
  static applyPositionUpdates(
    tasks: Task[], 
    positionUpdates: PositionUpdate[]
  ): ActsAsListResult {
    const taskMap = new Map(tasks.map(t => [t.id, {...t}]));
    const operations: ActsAsListOperation[] = [];
    
    // Process each update sequentially to match Rails behavior
    positionUpdates.forEach(update => {
      const movingTask = taskMap.get(update.id);
      if (!movingTask) return;
      
      const originalPosition = movingTask.position;
      const targetPosition = update.position;
      const originalParent = movingTask.parent_id || null;
      const targetParent = update.parent_id !== undefined ? (update.parent_id || null) : originalParent;
      
      // Step 1: Remove task from original position (creates gap)
      const originalScope = originalParent;
      const originalScopeTasks = Array.from(taskMap.values())
        .filter(t => (t.parent_id || null) === originalScope && t.id !== update.id)
        .sort((a, b) => a.position - b.position);
      
      // Gap elimination: shift tasks after the original position down
      originalScopeTasks.forEach(task => {
        if (task.position > originalPosition) {
          const oldPosition = task.position;
          task.position = task.position - 1;
          
          operations.push({
            type: 'gap-elimination',
            scope: originalScope,
            taskId: task.id,
            oldPosition,
            newPosition: task.position,
            reason: `Shifted down to fill gap at position ${originalPosition}`
          });
        }
      });
      
      // Step 2: Insert task at target position
      const targetScope = targetParent;
      const targetScopeTasks = Array.from(taskMap.values())
        .filter(t => (t.parent_id || null) === targetScope && t.id !== update.id)
        .sort((a, b) => a.position - b.position);
      
      // Shift tasks at or after target position up by 1
      targetScopeTasks.forEach(task => {
        if (task.position >= targetPosition) {
          const oldPosition = task.position;
          task.position = task.position + 1;
          
          operations.push({
            type: 'insertion',
            scope: targetScope,
            taskId: task.id,
            oldPosition,
            newPosition: task.position,
            reason: `Shifted up by insertion at position ${targetPosition}`
          });
        }
      });
      
      // Place moving task at target position
      const oldPosition = movingTask.position;
      movingTask.position = targetPosition;
      movingTask.parent_id = targetParent;
      
      operations.push({
        type: 'insertion',
        scope: targetScope,
        taskId: movingTask.id,
        oldPosition,
        newPosition: targetPosition,
        reason: `Moved to target position ${targetPosition}`
      });
    });
    
    return {
      updatedTasks: Array.from(taskMap.values()),
      operations
    };
  }
  
  /**
   * Predict what server positions will be after operation
   */
  static predictServerPositions(
    tasks: Task[], 
    positionUpdates: PositionUpdate[]
  ): Map<string, number> {
    const result = this.applyPositionUpdates(tasks, positionUpdates);
    return new Map(result.updatedTasks.map(t => [t.id, t.position]));
  }
  
  /**
   * Validate that task positions are consistent (no duplicates, no gaps in each scope)
   */
  static validatePositions(tasks: Task[]): { 
    valid: boolean; 
    errors: string[]; 
    warnings: string[] 
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Group tasks by scope (parent_id)
    const scopes = new Map<string | null, Task[]>();
    tasks.forEach(task => {
      const scope = task.parent_id || null;
      if (!scopes.has(scope)) {
        scopes.set(scope, []);
      }
      scopes.get(scope)!.push(task);
    });
    
    // Validate each scope
    scopes.forEach((scopeTasks, scope) => {
      const positions = scopeTasks.map(t => t.position).sort((a, b) => a - b);
      
      // Check for duplicates
      const duplicates = positions.filter((pos, index) => positions.indexOf(pos) !== index);
      if (duplicates.length > 0) {
        errors.push(`Scope ${scope}: Duplicate positions found: ${duplicates.join(', ')}`);
      }
      
      // Check for gaps (positions should be 1, 2, 3, ...)
      const expectedPositions = Array.from({ length: positions.length }, (_, i) => i + 1);
      const missingPositions = expectedPositions.filter(pos => !positions.includes(pos));
      if (missingPositions.length > 0) {
        warnings.push(`Scope ${scope}: Missing positions: ${missingPositions.join(', ')}`);
      }
      
      // Check for positions starting from 1
      if (positions.length > 0 && positions[0] !== 1) {
        warnings.push(`Scope ${scope}: Positions don't start from 1 (first position: ${positions[0]})`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert relative positioning updates to integer position updates for client-side prediction
   * This maintains offline functionality by allowing immediate UI updates
   * Updated to match Rails positioning gem behavior exactly
   */
  static convertRelativeToPositionUpdates(
    tasks: Task[],
    relativeUpdates: RelativePositionUpdate[]
  ): PositionUpdate[] {
    const positionUpdates: PositionUpdate[] = [];
    
    relativeUpdates.forEach(update => {
      const task = tasks.find(t => t.id === update.id);
      if (!task) return;
      
      let targetPosition = 1;
      const targetParent = update.parent_id !== undefined ? update.parent_id : task.parent_id;
      
      // Get tasks in the target scope, INCLUDING the moving task for positioning calculations
      // This is critical - we need the full scope to understand current positions
      const allScopeTasks = tasks.filter(t => (t.parent_id || null) === (targetParent || null))
                                 .sort((a, b) => a.position - b.position);
      
      // Get tasks excluding the moving task (for target identification)
      const scopeTasksExcludingMoved = allScopeTasks.filter(t => t.id !== update.id);
      
      if (update.before_task_id) {
        // Position before specific task - positioning gem places immediately before target
        const beforeTask = allScopeTasks.find(t => t.id === update.before_task_id);
        const movingTask = tasks.find(t => t.id === update.id); // Search in full task list, not just target scope
        
        if (beforeTask) {
          if (movingTask && (movingTask.parent_id || null) === (targetParent || null)) {
            // Same-parent move: consider relative positions
            if (movingTask.position < beforeTask.position) {
              // Moving task is currently before target - it will take position (target.position - 1)
              targetPosition = beforeTask.position - 1;
            } else {
              // Moving task is currently after target - it will take target's current position
              targetPosition = beforeTask.position;
            }
          } else {
            // Cross-parent move: moving task enters new scope before target
            targetPosition = beforeTask.position;
          }
        } else {
          targetPosition = 1;
        }
        
        console.log('🔮 Client prediction: before task', {
          movingTask: update.id.substring(0, 8),
          beforeTask: beforeTask ? { id: beforeTask.id.substring(0, 8), position: beforeTask.position } : null,
          movingTaskCurrentPos: movingTask?.position,
          movingTaskCurrentParent: movingTask?.parent_id || 'null',
          targetParent: targetParent || 'null',
          isCrossParentMove: movingTask ? (movingTask.parent_id || null) !== (targetParent || null) : 'unknown',
          targetPosition,
          allScopeTasks: allScopeTasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position })),
          note: 'positioning gem places immediately before target, considering current positions and parent scope'
        });
      } else if (update.after_task_id) {
        // Position after specific task - positioning gem places immediately after target
        const afterTask = allScopeTasks.find(t => t.id === update.after_task_id);
        const movingTask = tasks.find(t => t.id === update.id); // Search in full task list, not just target scope
        
        if (afterTask) {
          if (movingTask && (movingTask.parent_id || null) === (targetParent || null)) {
            // Same-parent move: consider relative positions
            if (movingTask.position < afterTask.position) {
              targetPosition = afterTask.position; // Target moved down, so we take its original position
            } else {
              targetPosition = afterTask.position + 1; // Target stays, we go after it
            }
          } else {
            // Cross-parent move: moving task enters new scope after target
            targetPosition = afterTask.position + 1;
          }
        } else {
          targetPosition = scopeTasksExcludingMoved.length + 1;
        }
        console.log('🔮 Client prediction: after task', {
          movingTask: update.id.substring(0, 8),
          afterTask: afterTask ? { id: afterTask.id.substring(0, 8), position: afterTask.position } : null,
          movingTaskCurrentPos: movingTask?.position,
          movingTaskCurrentParent: movingTask?.parent_id || 'null',
          targetParent: targetParent || 'null',
          isCrossParentMove: movingTask ? (movingTask.parent_id || null) !== (targetParent || null) : 'unknown',
          targetPosition,
          allScopeTasks: allScopeTasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position })),
          note: 'positioning gem places immediately after target, considering current positions and parent scope'
        });
      } else if (update.position === 'first') {
        targetPosition = 1;
        console.log('🔮 Client prediction: first position', { movingTask: update.id.substring(0, 8), targetPosition });
      } else if (update.position === 'last') {
        targetPosition = scopeTasksExcludingMoved.length + 1;
        console.log('🔮 Client prediction: last position', { movingTask: update.id.substring(0, 8), targetPosition });
      }
      
      positionUpdates.push({
        id: update.id,
        position: targetPosition,
        parent_id: targetParent
      });
    });
    
    return positionUpdates;
  }

  /**
   * Apply relative positioning updates with client-side prediction
   * This is the main method for maintaining offline functionality
   */
  static applyRelativePositioning(
    tasks: Task[],
    relativeUpdates: RelativePositionUpdate[]
  ): ActsAsListResult {
    // Convert relative positioning to integer positions for client prediction
    const positionUpdates = this.convertRelativeToPositionUpdates(tasks, relativeUpdates);
    
    // Apply using existing position update logic
    return this.applyPositionUpdates(tasks, positionUpdates);
  }
}