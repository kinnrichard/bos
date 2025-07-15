import { SvelteSet } from 'svelte/reactivity';
import { shouldShowTask } from '$lib/stores/taskFilter.svelte';

// Generic task interface that works with both generated types and position calculator types
export interface BaseTask {
  id: string;
  position?: number;
  parent_id?: string;
  title?: string;
  status?: string;
  created_at?: string | number;
  updated_at?: string | number;
  discarded_at?: string | null;
  lock_version?: number;
  applies_to_all_targets?: boolean;
  job_id?: string;
  assigned_to_id?: string;
  subtasks_count?: number;
  reordered_at?: string;
}

// Task with subtasks for hierarchical display
export interface HierarchicalTask extends BaseTask {
  subtasks: HierarchicalTask[];
}

// Rendered task item for flattened display
export interface RenderedTaskItem {
  task: HierarchicalTask;
  depth: number;
  hasSubtasks: boolean;
  isExpanded: boolean;
}

// Expansion state management
export class TaskExpansionManager {
  private expandedTasks: SvelteSet<string>;
  private hasAutoExpanded: boolean = false;

  constructor() {
    this.expandedTasks = new SvelteSet<string>();
  }

  isExpanded(taskId: string): boolean {
    return this.expandedTasks.has(taskId);
  }

  toggle(taskId: string): void {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
  }

  expand(taskId: string): void {
    this.expandedTasks.add(taskId);
  }

  collapse(taskId: string): void {
    this.expandedTasks.delete(taskId);
  }

  // Auto-expand all tasks with subtasks (only once on initial load)
  autoExpandAll(hierarchicalTasks: HierarchicalTask[]): void {
    if (hierarchicalTasks.length > 0 && !this.hasAutoExpanded) {
      this.expandAllTasksWithSubtasks(hierarchicalTasks);
      this.hasAutoExpanded = true;
    }
  }

  private expandAllTasksWithSubtasks(taskList: HierarchicalTask[]): void {
    taskList.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        this.expandedTasks.add(task.id);
        // Recursively expand subtasks that also have children
        this.expandAllTasksWithSubtasks(task.subtasks);
      }
    });
  }

  reset(): void {
    this.expandedTasks.clear();
    this.hasAutoExpanded = false;
  }
}

/**
 * TaskHierarchyManager - Handles task organization and hierarchical rendering
 * 
 * Responsibilities:
 * - Organize flat task list into hierarchical structure
 * - Apply filtering to hierarchical tasks
 * - Flatten hierarchical structure for UI rendering
 * - Manage expansion/collapse state
 */
export class TaskHierarchyManager {
  private expansionManager: TaskExpansionManager;

  constructor() {
    this.expansionManager = new TaskExpansionManager();
  }

  /**
   * Get the expansion manager for direct access to expansion state
   */
  getExpansionManager(): TaskExpansionManager {
    return this.expansionManager;
  }

  /**
   * Organize tasks into hierarchical structure with filtering
   * 
   * @param taskList - Flat list of tasks
   * @param filterStatuses - Array of statuses to show
   * @param showDeleted - Whether to show deleted tasks
   * @returns Hierarchical task structure
   */
  organizeTasksHierarchically(
    taskList: BaseTask[], 
    filterStatuses: string[], 
    showDeleted: boolean
  ): HierarchicalTask[] {
    const taskMap = new Map<string, HierarchicalTask>();
    const rootTasks: HierarchicalTask[] = [];

    // First pass: create map of all tasks
    taskList.forEach((task) => {
      taskMap.set(task.id, {
        ...task,
        subtasks: []
      });
    });

    // Second pass: organize into hierarchy and apply filtering
    // TODO: Filtering needs to catch child objects as well. If filter is set to only show in progress, 
    // it should show parents of in-progress tasks as well.
    taskList.forEach(task => {
      const taskWithSubtasks = taskMap.get(task.id)!;
      
      const shouldShow = shouldShowTask(task, filterStatuses, showDeleted);
      
      // Apply filter - only include tasks that should be shown
      if (!shouldShow) {
        return;
      }
      
      if (task.parent_id && taskMap.has(task.parent_id)) {
        // Only add to parent if parent is also visible
        const parent = taskMap.get(task.parent_id)!;
        if (shouldShowTask(parent, filterStatuses, showDeleted)) {
          parent.subtasks.push(taskWithSubtasks);
        }
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });

    // Sort root tasks by position
    rootTasks.sort((a, b) => (a.position || 0) - (b.position || 0));

    // Sort subtasks by position for each parent
    this.sortSubtasks(rootTasks);

    return rootTasks;
  }

  /**
   * Recursively sort subtasks by position
   */
  private sortSubtasks(tasks: HierarchicalTask[]): void {
    tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.sort((a, b) => (a.position || 0) - (b.position || 0));
        this.sortSubtasks(task.subtasks);
      }
    });
  }

  /**
   * Flatten hierarchical tasks for rendering
   * 
   * @param hierarchicalTasks - Hierarchical task structure
   * @returns Flattened array of rendered task items
   */
  flattenTasks(hierarchicalTasks: HierarchicalTask[]): RenderedTaskItem[] {
    return hierarchicalTasks.flatMap(task => this.renderTaskTree(task, 0));
  }

  /**
   * Recursive function to render task tree
   * 
   * @param task - Task to render
   * @param depth - Current depth in hierarchy
   * @returns Array of rendered task items
   */
  private renderTaskTree(task: HierarchicalTask, depth: number): RenderedTaskItem[] {
    const result: RenderedTaskItem[] = [];
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = this.expansionManager.isExpanded(task.id);

    result.push({
      task,
      depth,
      hasSubtasks,
      isExpanded
    });

    if (hasSubtasks && isExpanded) {
      for (const subtask of task.subtasks) {
        result.push(...this.renderTaskTree(subtask, depth + 1));
      }
    }

    return result;
  }

  /**
   * Auto-expand all tasks with subtasks on initial load
   */
  autoExpandAll(hierarchicalTasks: HierarchicalTask[]): void {
    this.expansionManager.autoExpandAll(hierarchicalTasks);
  }

  /**
   * Toggle expansion state of a task
   */
  toggleExpansion(taskId: string): void {
    this.expansionManager.toggle(taskId);
  }

  /**
   * Check if a task is expanded
   */
  isTaskExpanded(taskId: string): boolean {
    return this.expansionManager.isExpanded(taskId);
  }

  /**
   * Force expand a task (used for drag-and-drop nesting)
   */
  expandTask(taskId: string): void {
    this.expansionManager.expand(taskId);
  }

  /**
   * Get flat list of task IDs in visual order
   */
  getFlatTaskIds(renderedTasks: RenderedTaskItem[]): string[] {
    return renderedTasks.map(item => item.task.id);
  }

  /**
   * Reset all expansion state
   */
  resetExpansion(): void {
    this.expansionManager.reset();
  }
}