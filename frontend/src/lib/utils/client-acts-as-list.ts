/**
 * Client-side simulation of Rails acts_as_list behavior
 * Extracted from TaskList.svelte for unit testing
 */

import type { Task, PositionUpdate } from './position-calculator.js';

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
}