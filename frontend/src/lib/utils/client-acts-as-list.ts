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
   * Apply position updates matching Rails positioning gem behavior
   * Uses minimal shifting for cross-parent moves, standard acts_as_list for same-parent moves
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
      
      const isCrossParentMove = originalParent !== targetParent;
      
      // Step 1: Remove task from original position (creates gap)
      const originalScope = originalParent;
      const originalScopeTasks = Array.from(taskMap.values())
        .filter(t => (t.parent_id || null) === originalScope && t.id !== update.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      
      // Gap elimination: shift tasks after the original position down
      originalScopeTasks.forEach(task => {
        if ((task.position ?? 0) > (originalPosition ?? 0)) {
          const oldPosition = task.position ?? 0;
          task.position = (task.position ?? 0) - 1;
          
          operations.push({
            type: 'gap-elimination',
            scope: originalScope,
            taskId: task.id,
            oldPosition,
            newPosition: task.position ?? 0,
            reason: `Shifted down to fill gap at position ${originalPosition}`
          });
        }
      });
      
      // Step 2: Insert task at target position
      const targetScope = targetParent;
      const targetScopeTasks = Array.from(taskMap.values())
        .filter(t => (t.parent_id || null) === targetScope && t.id !== update.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      
      if (isCrossParentMove) {
        // Cross-parent move: positioning gem uses minimal shifting
        // For cross-parent moves, tasks at or after target position get shifted up
        targetScopeTasks.forEach(task => {
          if ((task.position ?? 0) >= targetPosition) {
            const oldPosition = task.position ?? 0;
            task.position = (task.position ?? 0) + 1;
            
            operations.push({
              type: 'insertion',
              scope: targetScope,
              taskId: task.id,
              oldPosition,
              newPosition: task.position ?? 0,
              reason: `Cross-parent: shifted up by insertion at position ${targetPosition}`
            });
          }
        });
      } else {
        // Same-parent move: use standard acts_as_list behavior
        // All tasks at or after target position get shifted
        targetScopeTasks.forEach(task => {
          if ((task.position ?? 0) >= targetPosition) {
            const oldPosition = task.position ?? 0;
            task.position = (task.position ?? 0) + 1;
            
            operations.push({
              type: 'insertion',
              scope: targetScope,
              taskId: task.id,
              oldPosition,
              newPosition: task.position ?? 0,
              reason: `Same-parent: shifted up by insertion at position ${targetPosition}`
            });
          }
        });
      }
      
      // Place moving task at target position
      const oldPosition = movingTask.position ?? 0;
      movingTask.position = targetPosition;
      movingTask.parent_id = targetParent;
      
      operations.push({
        type: 'insertion',
        scope: targetScope,
        taskId: movingTask.id,
        oldPosition,
        newPosition: targetPosition,
        reason: `Moved to target position ${targetPosition} (${isCrossParentMove ? 'cross-parent' : 'same-parent'})`
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
    return new Map(result.updatedTasks.map(t => [t.id, t.position ?? 0]));
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
      const positions = scopeTasks.map(t => t.position ?? 0).sort((a, b) => a - b);
      
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
   * Normalize positions within each scope to eliminate gaps (match positioning gem behavior)
   * The positioning gem automatically renumbers positions to be 1, 2, 3, ... with no gaps
   */
  static normalizePositions(tasks: Task[]): Task[] {
    const normalizedTasks = [...tasks];
    
    // Group tasks by scope (parent_id)
    const scopes = new Map<string | null, Task[]>();
    normalizedTasks.forEach(task => {
      const scope = task.parent_id || null;
      if (!scopes.has(scope)) {
        scopes.set(scope, []);
      }
      scopes.get(scope)!.push(task);
    });
    
    // Normalize positions within each scope
    scopes.forEach((scopeTasks, scope) => {
      const sortedTasks = scopeTasks.sort((a, b) => a.position - b.position);
      sortedTasks.forEach((task, index) => {
        task.position = index + 1; // Start from 1, no gaps
      });
    });
    
    return normalizedTasks;
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
    // Step 1: Normalize positions to eliminate gaps (matching positioning gem behavior)
    const normalizedTasks = this.normalizePositions(tasks);
    
    // Log normalization effect for debugging
    const originalPositions = tasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position, parent: t.parent_id || 'null' }));
    const normalizedPositions = normalizedTasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position, parent: t.parent_id || 'null' }));
    
    const hasNormalizationChanges = originalPositions.some((orig, i) => orig.pos !== normalizedPositions[i].pos);
    if (hasNormalizationChanges) {
      console.log('🔧 Position normalization applied:', {
        original: originalPositions,
        normalized: normalizedPositions,
        changes: originalPositions.filter((orig, i) => orig.pos !== normalizedPositions[i].pos)
      });
    }
    
    const positionUpdates: PositionUpdate[] = [];
    
    relativeUpdates.forEach(update => {
      const task = normalizedTasks.find(t => t.id === update.id);
      if (!task) return;
      
      let targetPosition = 1;
      const targetParent = update.parent_id !== undefined ? update.parent_id : task.parent_id;
      
      // Get tasks in the target scope, INCLUDING the moving task for positioning calculations
      // This is critical - we need the full scope to understand current positions
      const allScopeTasks = normalizedTasks.filter(t => (t.parent_id || null) === (targetParent || null))
                                 .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      
      // Get tasks excluding the moving task (for target identification)
      const scopeTasksExcludingMoved = allScopeTasks.filter(t => t.id !== update.id);
      
      if (update.before_task_id) {
        // Position before specific task - positioning gem places immediately before target
        const beforeTask = allScopeTasks.find(t => t.id === update.before_task_id);
        const movingTask = normalizedTasks.find(t => t.id === update.id); // Search in full task list, not just target scope
        
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
            // Cross-parent move: positioning gem takes target's current position, shifts target up
            // For "before Task X", the moving task takes Task X's current position and Task X shifts up
            // This is different from same-parent moves where we calculate position - 1
            targetPosition = beforeTask.position;
          }
        } else {
          targetPosition = 1;
        }
        
        console.log('🔮 Client prediction: before task (with normalization)', {
          movingTask: update.id.substring(0, 8),
          beforeTask: beforeTask ? { id: beforeTask.id.substring(0, 8), position: beforeTask.position } : null,
          movingTaskCurrentPos: movingTask?.position,
          movingTaskCurrentParent: movingTask?.parent_id || 'null',
          targetParent: targetParent || 'null',
          isCrossParentMove: movingTask ? (movingTask.parent_id || null) !== (targetParent || null) : 'unknown',
          targetPosition,
          allScopeTasks: allScopeTasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position })),
          note: movingTask && (movingTask.parent_id || null) !== (targetParent || null) 
            ? 'Cross-parent: takes target position, target shifts up'
            : 'Same-parent: takes position before target'
        });
      } else if (update.after_task_id) {
        // Position after specific task - positioning gem places immediately after target
        const afterTask = allScopeTasks.find(t => t.id === update.after_task_id);
        const movingTask = normalizedTasks.find(t => t.id === update.id); // Search in full task list, not just target scope
        
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
        console.log('🔮 Client prediction: after task (with normalization)', {
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
   * Processes updates sequentially to handle cumulative effects
   */
  static applyRelativePositioning(
    tasks: Task[],
    relativeUpdates: RelativePositionUpdate[]
  ): ActsAsListResult {
    let currentTasks = [...tasks]; // Work with a copy
    let allOperations: ActsAsListOperation[] = [];
    
    // Process each relative update sequentially
    relativeUpdates.forEach(relativeUpdate => {
      // Convert this single relative update using current task state
      const positionUpdate = this.convertRelativeToPositionUpdates(currentTasks, [relativeUpdate])[0];
      
      if (positionUpdate) {
        // Apply this single position update
        const result = this.applyPositionUpdates(currentTasks, [positionUpdate]);
        
        // Update our working task state for the next iteration
        currentTasks = result.updatedTasks;
        
        // Accumulate operations
        allOperations = [...allOperations, ...result.operations];
      }
    });
    
    return {
      updatedTasks: currentTasks,
      operations: allOperations
    };
  }
}