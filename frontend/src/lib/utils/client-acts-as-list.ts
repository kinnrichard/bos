/**
 * Client-side simulation of Rails acts_as_list behavior
 * Extracted from TaskList.svelte for unit testing
 */

import type { Task, PositionUpdate, RelativePositionUpdate } from './position-calculator.js';
import { debugDatabase, debugValidation, debugPerformance } from '$lib/utils/debug';
import { calculatePosition } from '$lib/shared/utils/positioning-v2';
import { getDatabaseTimestamp } from '$lib/shared/utils/utc-timestamp';

export interface ActsAsListResult {
  updatedTasks: Task[];
  operations: ActsAsListOperation[];
  positionUpdates: PositionUpdateBatch[];
}

export interface PositionUpdateBatch {
  taskId: string;
  position: number;
  parent_id?: string | null;
  repositioned_after_id?: string | null;
  position_finalized?: boolean;
  repositioned_to_top?: boolean;
  reason: string;
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
    const allPositionUpdates: PositionUpdateBatch[] = [];
    
    // Process each update sequentially to match Rails behavior
    positionUpdates.forEach(update => {
      const movingTask = taskMap.get(update.id);
      if (!movingTask) return;
      
      const originalPosition = movingTask.position;
      const targetPosition = update.position;
      const originalParent = movingTask.parent_id || null;
      const targetParent = 'parent_id' in update ? (update.parent_id || null) : originalParent;
      
      const isCrossParentMove = originalParent !== targetParent;
      
      // Step 1: Remove task from original position (creates gap)
      const originalScope = originalParent;
      const originalScopeTasks = Array.from(taskMap.values())
        .filter(t => (t.parent_id || null) === originalScope && t.id !== update.id);
      
      // Gap elimination: shift tasks after the original position down
      originalScopeTasks.forEach(task => {
        if ((task.position ?? 0) > (originalPosition ?? 0)) {
          const oldPosition = task.position ?? 0;
          const newPosition = (task.position ?? 0) - 1;
          task.position = newPosition;
          
          const reason = `Shifted down to fill gap at position ${originalPosition}`;
          allPositionUpdates.push({ taskId: task.id, position: newPosition, reason });
          
          operations.push({
            type: 'gap-elimination',
            scope: originalScope,
            taskId: task.id,
            oldPosition,
            newPosition,
            reason
          });
        }
      });
      
      // Step 2: Insert task at target position
      const targetScope = targetParent;
      const targetScopeTasks = Array.from(taskMap.values())
        .filter(t => (t.parent_id || null) === targetScope && t.id !== update.id);
      
      if (isCrossParentMove) {
        // Cross-parent move: positioning gem uses minimal shifting
        // For cross-parent moves, tasks at or after target position get shifted up
        targetScopeTasks.forEach(task => {
          if ((task.position ?? 0) >= targetPosition) {
            const oldPosition = task.position ?? 0;
            const newPosition = (task.position ?? 0) + 1;
            task.position = newPosition;
            
            const reason = `Cross-parent: shifted up by insertion at position ${targetPosition}`;
            allPositionUpdates.push({ taskId: task.id, position: newPosition, reason });
            
            operations.push({
              type: 'insertion',
              scope: targetScope,
              taskId: task.id,
              oldPosition,
              newPosition,
              reason
            });
          }
        });
      } else {
        // Same-parent move: use standard acts_as_list behavior
        // All tasks at or after target position get shifted
        targetScopeTasks.forEach(task => {
          if ((task.position ?? 0) >= targetPosition) {
            const oldPosition = task.position ?? 0;
            const newPosition = (task.position ?? 0) + 1;
            task.position = newPosition;
            
            const reason = `Same-parent: shifted up by insertion at position ${targetPosition}`;
            allPositionUpdates.push({ taskId: task.id, position: newPosition, reason });
            
            operations.push({
              type: 'insertion',
              scope: targetScope,
              taskId: task.id,
              oldPosition,
              newPosition,
              reason
            });
          }
        });
      }
      
      // Place moving task at target position
      const oldPosition = movingTask.position ?? 0;
      movingTask.position = targetPosition;
      movingTask.parent_id = targetParent ?? undefined;
      
      const reason = `Moved to target position ${targetPosition} (${isCrossParentMove ? 'cross-parent' : 'same-parent'})`;
      allPositionUpdates.push({ 
        taskId: movingTask.id, 
        position: targetPosition, 
        parent_id: isCrossParentMove ? targetParent : undefined,
        reason 
      });
      
      operations.push({
        type: 'insertion',
        scope: targetScope,
        taskId: movingTask.id,
        oldPosition,
        newPosition: targetPosition,
        reason
      });
    });
    
    return {
      updatedTasks: Array.from(taskMap.values()),
      operations,
      positionUpdates: allPositionUpdates
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
  static normalizePositions(tasks: Task[]): { normalizedTasks: Task[]; positionUpdates: PositionUpdateBatch[] } {
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
    const positionUpdates: PositionUpdateBatch[] = [];
    scopes.forEach((scopeTasks, scope) => {
      const sortedTasks = scopeTasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      sortedTasks.forEach((task, index) => {
        const newPosition = index + 1; // Start from 1, no gaps
        if (task.position !== newPosition) {
          task.position = newPosition;
          positionUpdates.push({ 
            taskId: task.id, 
            position: newPosition,
            reason: `Normalized position in scope ${scope || 'root'}`
          });
        }
      });
    });
    
    return { normalizedTasks, positionUpdates };
  }

  /**
   * Execute position updates using ActiveRecord pattern (fixes AC5)
   * Batch updates efficiently to avoid multiple database calls
   */
  static async executePositionUpdates(positionUpdates: PositionUpdateBatch[]): Promise<void> {
    if (positionUpdates.length === 0) {
      return;
    }

    try {
      // Import Task model using dynamic import to avoid circular dependencies
      const { Task } = await import('$lib/models/task');
      
      // Execute all updates in parallel for better performance
      const reorderedAt = getDatabaseTimestamp(); // Single timestamp for all related position updates
      
      const updatePromises = positionUpdates.map(update => {
        const updateData: any = { 
          position: update.position,
          reordered_at: reorderedAt // Set UTC timestamp for when repositioning occurred
        };
        
        // Include parent_id if it's specified in the update
        if (update.parent_id !== undefined) {
          updateData.parent_id = update.parent_id;
        }
        
        // Include repositioned_after_id if it's specified in the update
        if (update.repositioned_after_id !== undefined) {
          updateData.repositioned_after_id = update.repositioned_after_id;
        }
        
        // Include position_finalized if it's specified in the update
        if (update.position_finalized !== undefined) {
          updateData.position_finalized = update.position_finalized;
        }
        
        // Include repositioned_to_top if it's specified in the update
        if (update.repositioned_to_top !== undefined) {
          updateData.repositioned_to_top = update.repositioned_to_top;
        }
        
        return Task.update(update.taskId, updateData);
      });
      
      await Promise.all(updatePromises);
      
      debugDatabase('Successfully updated task positions via ActiveRecord pattern', { count: positionUpdates.length });
    } catch (error) {
      debugValidation('Failed to execute position updates', { error });
      throw error;
    }
  }

  /**
   * Apply position updates and execute them using ActiveRecord pattern
   * This is the main method that should be called to handle task reordering
   */
  static async applyAndExecutePositionUpdates(
    tasks: Task[], 
    positionUpdates: PositionUpdate[]
  ): Promise<ActsAsListResult> {
    // Apply position updates (optimistic UI changes)
    const result = this.applyPositionUpdates(tasks, positionUpdates);
    
    // Execute database updates using ActiveRecord pattern
    await this.executePositionUpdates(result.positionUpdates);
    
    return result;
  }

  /**
   * Convert relative positioning updates to integer position updates for client-side prediction
   * This maintains offline functionality by allowing immediate UI updates
   * Updated to use 2025-07-23-robust-task-positioning specification (no normalization)
   */
  static convertRelativeToPositionUpdates(
    tasks: Task[],
    relativeUpdates: RelativePositionUpdate[]
  ): PositionUpdate[] {
    // Create a mutable working copy to track position changes as we process updates
    // This ensures subsequent tasks see the updated positions of previously processed tasks
    const workingTasks = tasks.map(t => ({...t}));
    
    const positionUpdates: PositionUpdate[] = [];
    
    relativeUpdates.forEach(update => {
      const task = workingTasks.find(t => t.id === update.id);
      if (!task) return;
      
      let targetPosition = 1;
      let repositionedAfterId: string | number | null = null;
      let isPositionedAtTop = false; // Track if this is a top-of-list position
      const targetParent = 'parent_id' in update ? (update.parent_id || null) : (task.parent_id || null);
      
      // Get tasks in the target scope, INCLUDING the moving task for positioning calculations
      // This is critical - we need the full scope to understand current positions
      const allScopeTasks = workingTasks
        .filter(t => (t.parent_id || null) === (targetParent || null))
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Get tasks excluding the moving task (for target identification)
      const scopeTasksExcludingMoved = allScopeTasks.filter(t => t.id !== update.id);
      
      if (update.before_task_id) {
        // Position before specific task - positioning gem places immediately before target
        const beforeTask = allScopeTasks.find(t => t.id === update.before_task_id);
        const movingTask = workingTasks.find(t => t.id === update.id); // Search in full task list, not just target scope
        
        if (beforeTask) {
          // Find the task that comes before the beforeTask
          const beforeTaskIndex = allScopeTasks.findIndex(t => t.id === beforeTask.id);
          const prevTask = beforeTaskIndex > 0 
            ? allScopeTasks[beforeTaskIndex - 1] 
            : null;
          
          // Set repositioned_after_id
          if (prevTask) {
            repositionedAfterId = prevTask.id;
          } else {
            // No previous task means we're positioning at the top of this scope
            isPositionedAtTop = true;
          }
          
          // Calculate position using the new algorithm (with randomization in production)
          const isTestEnvironment = typeof window === 'undefined' || process.env.NODE_ENV === 'test';
          targetPosition = calculatePosition(prevTask?.position || null, beforeTask.position ?? 0, { disableRandomization: isTestEnvironment });
        } else {
          targetPosition = 1;
        }
        
        debugPerformance('Client prediction: before task (with preserved positions)', {
          movingTask: update.id.substring(0, 8),
          beforeTask: beforeTask ? { id: beforeTask.id.substring(0, 8), position: beforeTask.position } : null,
          movingTaskCurrentPos: movingTask?.position,
          movingTaskCurrentParent: movingTask?.parent_id || 'null',
          targetParent: targetParent || 'null',
          isCrossParentMove: movingTask ? (movingTask.parent_id || null) !== (targetParent || null) : 'unknown',
          targetPosition,
          repositionedAfterId: typeof repositionedAfterId === 'string' ? repositionedAfterId.substring(0, 8) : repositionedAfterId,
          allScopeTasks: allScopeTasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position })),
          note: movingTask && (movingTask.parent_id || null) !== (targetParent || null) 
            ? 'Cross-parent: takes target position, target shifts up'
            : 'Same-parent: takes position before target'
        });
      } else if (update.after_task_id) {
        // Position after specific task - positioning gem places immediately after target
        const afterTask = allScopeTasks.find(t => t.id === update.after_task_id);
        const movingTask = workingTasks.find(t => t.id === update.id); // Search in full task list, not just target scope
        
        if (afterTask) {
          // The task is being positioned after afterTask
          repositionedAfterId = afterTask.id;
          
          // Use the new randomized positioning algorithm
          // Find the task that comes after the afterTask to calculate position between them
          const afterTaskIndex = allScopeTasks.findIndex(t => t.id === afterTask.id);
          const nextTask = afterTaskIndex < allScopeTasks.length - 1 
            ? allScopeTasks[afterTaskIndex + 1] 
            : null;
          
          // Calculate position using the new algorithm (with randomization in production)
          const isTestEnvironment = typeof window === 'undefined' || process.env.NODE_ENV === 'test';
          targetPosition = calculatePosition(afterTask.position ?? 0, nextTask?.position || null, { disableRandomization: isTestEnvironment });
        } else {
          targetPosition = scopeTasksExcludingMoved.length + 1;
        }
        debugPerformance('Client prediction: after task (with preserved positions)', {
          movingTask: update.id.substring(0, 8),
          afterTask: afterTask ? { id: afterTask.id.substring(0, 8), position: afterTask.position } : null,
          movingTaskCurrentPos: movingTask?.position,
          movingTaskCurrentParent: movingTask?.parent_id || 'null',
          targetParent: targetParent || 'null',
          isCrossParentMove: movingTask ? (movingTask.parent_id || null) !== (targetParent || null) : 'unknown',
          targetPosition,
          repositionedAfterId: typeof repositionedAfterId === 'string' ? repositionedAfterId.substring(0, 8) : repositionedAfterId,
          allScopeTasks: allScopeTasks.map(t => ({ id: t.id.substring(0, 8), pos: t.position })),
          note: 'positioning gem places immediately after target, considering current positions and parent scope'
        });
      } else if (update.position === 'first') {
        // Use the new positioning algorithm for top-of-list insertion
        const nextTask = scopeTasksExcludingMoved.length > 0 ? scopeTasksExcludingMoved[0] : null;
        
        // Detect if we're in test environment to use deterministic positioning
        const isTestEnvironment = typeof window === 'undefined' || process.env.NODE_ENV === 'test';
        targetPosition = calculatePosition(null, nextTask?.position || null, { disableRandomization: isTestEnvironment });
        // First position means no task before it
        repositionedAfterId = null;  // No task before this one
        isPositionedAtTop = true;  // Always at top when explicitly positioned first
        debugPerformance('Client prediction: first position (using negative positioning)', { 
          movingTask: update.id.substring(0, 8), 
          targetPosition,
          nextTaskPosition: nextTask?.position || null,
          note: 'Using calculatePosition(null, nextPosition) for negative positioning'
        });
      } else if (update.position === 'last') {
        // Use the new positioning algorithm for end-of-list insertion
        const lastTask = scopeTasksExcludingMoved.length > 0 ? scopeTasksExcludingMoved[scopeTasksExcludingMoved.length - 1] : null;
        
        // Detect if we're in test environment to use deterministic positioning
        const isTestEnvironment = typeof window === 'undefined' || process.env.NODE_ENV === 'test';
        targetPosition = calculatePosition(lastTask?.position || null, null, { disableRandomization: isTestEnvironment });
        
        // Last position means after the last task in scope
        if (lastTask) {
          repositionedAfterId = lastTask.id;
        }
        debugPerformance('Client prediction: last position (using randomized positioning)', { 
          movingTask: update.id.substring(0, 8), 
          targetPosition, 
          repositionedAfterId: typeof repositionedAfterId === 'string' ? repositionedAfterId.substring(0, 8) : repositionedAfterId,
          lastTaskPosition: lastTask?.position || null,
          note: 'Using calculatePosition(lastPosition, null) for end-of-list insertion'
        });
      }
      
      // Also check if we're moving to a parent with no existing children (first child)
      const isMovingToEmptyParent = (task.parent_id || null) !== targetParent && scopeTasksExcludingMoved.length === 0;
      if (isMovingToEmptyParent) {
        isPositionedAtTop = true;
      }
      
      // Update the working task state so subsequent tasks see the new position
      const taskToUpdate = workingTasks.find(t => t.id === update.id);
      if (taskToUpdate) {
        taskToUpdate.position = targetPosition;
        if (targetParent !== undefined) {
          taskToUpdate.parent_id = targetParent ?? undefined;
        }
        
        // Re-sort workingTasks to maintain position order for next iteration
        workingTasks.sort((a, b) => (a.position || 0) - (b.position || 0));
      }
      
      positionUpdates.push({
        id: update.id,
        position: targetPosition,
        parent_id: targetParent,
        repositioned_after_id: repositionedAfterId,
        position_finalized: false,  // Client-side positioning, not finalized by server
        repositioned_to_top: isPositionedAtTop  // Explicitly true or false
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
    let allPositionUpdates: PositionUpdateBatch[] = [];
    
    // Process each relative update sequentially
    relativeUpdates.forEach(relativeUpdate => {
      // Convert this single relative update using current task state
      const positionUpdate = this.convertRelativeToPositionUpdates(currentTasks, [relativeUpdate])[0];
      
      if (positionUpdate) {
        // Apply this single position update
        const result = this.applyPositionUpdates(currentTasks, [positionUpdate]);
        
        // Update our working task state for the next iteration
        currentTasks = result.updatedTasks;
        
        // Accumulate operations and position updates
        allOperations = [...allOperations, ...result.operations];
        allPositionUpdates = [...allPositionUpdates, ...result.positionUpdates];
      }
    });
    
    return {
      updatedTasks: currentTasks,
      operations: allOperations,
      positionUpdates: allPositionUpdates
    };
  }
}