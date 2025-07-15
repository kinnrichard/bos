import type { BaseTask } from './TaskHierarchyManager';

// Filter state interfaces
export interface StatusFilter {
  selectedStatuses: string[];
}

export interface SearchFilter {
  query: string;
  searchFields: ('title' | 'description')[];
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
  dateField: 'created_at' | 'updated_at' | 'due_date';
}

export interface FilterState {
  status: StatusFilter;
  search: SearchFilter;
  dates: DateRangeFilter;
  showDeleted: boolean;
}

// Filter result with metadata
export interface FilterResult {
  filteredTasks: BaseTask[];
  totalCount: number;
  filteredCount: number;
  appliedFilters: string[];
  searchResultCount?: number;
}

// Performance optimization: cache key for memoization
interface FilterCacheKey {
  taskCount: number;
  statusHash: string;
  searchHash: string;
  deletedFlag: boolean;
}

/**
 * TaskFilterManager - Centralized filtering logic for task lists
 * 
 * Responsibilities:
 * - Manage filter state reactively
 * - Apply multiple filter types (status, search, dates, deleted)
 * - Provide performance optimizations (memoization, debouncing)
 * - Maintain backward compatibility with existing filter system
 * - Support contextual search within job scope
 * - Reset filters on any navigation away from job view
 */
export class TaskFilterManager {
  private filterState: FilterState;
  private filterCache = new Map<string, FilterResult>();
  private searchDebounceTimer: number | null = null;
  private debouncedSearchQuery: string = '';

  constructor() {
    // Initialize filter state - use $state in Svelte context, plain object in tests
    this.filterState = this.createInitialState();
    this.debouncedSearchQuery = '';
    
    // Set up search debouncing
    this.setupSearchDebouncing();
  }

  private createInitialState(): FilterState {
    const initialState = {
      status: {
        selectedStatuses: ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled']
      },
      search: {
        query: '',
        searchFields: ['title', 'description'] as ('title' | 'description')[]
      },
      dates: {
        dateField: 'created_at' as 'created_at' | 'updated_at' | 'due_date'
      },
      showDeleted: false
    };

    // Use $state in Svelte context if available, otherwise use plain object
    try {
      if (typeof $state !== 'undefined') {
        return $state(initialState);
      }
    } catch (error) {
      // $state is not available in test environment
    }
    return initialState;
  }

  /**
   * Get current filter state (reactive)
   */
  getFilterState(): FilterState {
    return this.filterState;
  }

  /**
   * Get current status filter (backward compatibility)
   */
  getSelectedStatuses(): string[] {
    return this.filterState.status.selectedStatuses;
  }

  /**
   * Get show deleted flag (backward compatibility)
   */
  getShowDeleted(): boolean {
    return this.filterState.showDeleted;
  }

  /**
   * Get current search query
   */
  getSearchQuery(): string {
    return this.debouncedSearchQuery;
  }

  /**
   * Update status filter
   */
  updateStatusFilter(statuses: string[]): void {
    this.filterState.status.selectedStatuses = statuses;
    this.invalidateCache();
  }

  /**
   * Update search query (with debouncing)
   */
  updateSearchQuery(query: string): void {
    this.filterState.search.query = query;
    this.debounceSearchUpdate();
  }

  /**
   * Update show deleted flag
   */
  updateShowDeleted(show: boolean): void {
    this.filterState.showDeleted = show;
    this.invalidateCache();
  }

  /**
   * Update date range filter
   */
  updateDateRange(startDate?: Date, endDate?: Date, field: 'created_at' | 'updated_at' | 'due_date' = 'created_at'): void {
    this.filterState.dates.startDate = startDate;
    this.filterState.dates.endDate = endDate;
    this.filterState.dates.dateField = field;
    this.invalidateCache();
  }

  /**
   * Reset all filters to defaults
   * Called on any navigation away from job view
   */
  resetToDefaults(): void {
    this.filterState.status.selectedStatuses = ['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled'];
    this.filterState.search.query = '';
    this.filterState.dates.startDate = undefined;
    this.filterState.dates.endDate = undefined;
    this.filterState.dates.dateField = 'created_at';
    this.filterState.showDeleted = false;
    this.debouncedSearchQuery = '';
    this.invalidateCache();
  }

  /**
   * Apply all filters to a task list
   */
  applyFilters(tasks: BaseTask[]): FilterResult {
    const cacheKey = this.generateCacheKey(tasks);
    
    // Check cache first
    const cached = this.filterCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Apply filters in order of selectivity (most selective first)
    let filteredTasks = tasks;
    const appliedFilters: string[] = [];

    // 1. Apply deletion filter (most selective)
    if (this.hasDeletedFilter()) {
      filteredTasks = this.applyDeletedFilter(filteredTasks);
      appliedFilters.push('deleted');
    }

    // 2. Apply status filter
    if (this.hasStatusFilter()) {
      filteredTasks = this.applyStatusFilter(filteredTasks);
      appliedFilters.push('status');
    }

    // 3. Apply search filter (can be expensive)
    let searchResultCount: number | undefined;
    if (this.hasSearchFilter()) {
      const searchResult = this.applySearchFilter(filteredTasks);
      filteredTasks = searchResult.tasks;
      searchResultCount = searchResult.matchCount;
      appliedFilters.push('search');
    }

    // 4. Apply date range filter
    if (this.hasDateFilter()) {
      filteredTasks = this.applyDateFilter(filteredTasks);
      appliedFilters.push('dates');
    }

    const result: FilterResult = {
      filteredTasks,
      totalCount: tasks.length,
      filteredCount: filteredTasks.length,
      appliedFilters,
      searchResultCount
    };

    // Cache the result
    this.filterCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Check if a single task passes all filters (for hierarchical filtering)
   */
  shouldShowTask(task: BaseTask): boolean {
    // Deletion filter
    if (this.hasDeletedFilter() && !this.passesDeletedFilter(task)) {
      return false;
    }

    // Status filter
    if (this.hasStatusFilter() && !this.passesStatusFilter(task)) {
      return false;
    }

    // Search filter
    if (this.hasSearchFilter() && !this.passesSearchFilter(task)) {
      return false;
    }

    // Date filter
    if (this.hasDateFilter() && !this.passesDateFilter(task)) {
      return false;
    }

    return true;
  }

  /**
   * Get summary of active filters for UI display
   */
  getActiveFilterSummary(): string[] {
    const summary: string[] = [];

    // Status filter summary
    if (this.hasStatusFilter()) {
      const statusCount = this.filterState.status.selectedStatuses.length;
      summary.push(`Status: ${statusCount} selected`);
    }

    // Search filter summary
    if (this.hasSearchFilter()) {
      summary.push(`Search: "${this.debouncedSearchQuery}"`);
    }

    // Date filter summary
    if (this.hasDateFilter()) {
      summary.push(`Date range: ${this.filterState.dates.dateField}`);
    }

    // Deleted filter summary
    if (this.filterState.showDeleted) {
      summary.push('Including deleted');
    }

    return summary;
  }

  // Private methods

  private setupSearchDebouncing(): void {
    // Watch for search query changes and debounce them
    try {
      if (typeof $effect !== 'undefined') {
        $effect(() => {
          this.debounceSearchUpdate();
        });
      }
    } catch (error) {
      // $effect is not available in test environment
    }
  }

  private debounceSearchUpdate(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = window.setTimeout(() => {
      this.debouncedSearchQuery = this.filterState.search.query;
      this.invalidateCache();
    }, 300);
  }

  private generateCacheKey(tasks: BaseTask[]): string {
    const key: FilterCacheKey = {
      taskCount: tasks.length,
      statusHash: this.filterState.status.selectedStatuses.sort().join(','),
      searchHash: this.debouncedSearchQuery,
      deletedFlag: this.filterState.showDeleted
    };
    return JSON.stringify(key);
  }

  private invalidateCache(): void {
    this.filterCache.clear();
  }

  // Filter checking methods

  private hasDeletedFilter(): boolean {
    // Always apply deleted filter (either show deleted or exclude deleted)
    return true;
  }

  private hasStatusFilter(): boolean {
    return this.filterState.status.selectedStatuses.length > 0;
  }

  private hasSearchFilter(): boolean {
    return this.debouncedSearchQuery.trim().length > 0;
  }

  private hasDateFilter(): boolean {
    return !!(this.filterState.dates.startDate || this.filterState.dates.endDate);
  }

  // Filter application methods

  private applyDeletedFilter(tasks: BaseTask[]): BaseTask[] {
    if (this.filterState.showDeleted) {
      return tasks.filter(task => !!(task.discarded_at));
    } else {
      return tasks.filter(task => !task.discarded_at);
    }
  }

  private applyStatusFilter(tasks: BaseTask[]): BaseTask[] {
    return tasks.filter(task => this.passesStatusFilter(task));
  }

  private applySearchFilter(tasks: BaseTask[]): { tasks: BaseTask[]; matchCount: number } {
    const query = this.debouncedSearchQuery.toLowerCase();
    const matchingTasks = tasks.filter(task => this.passesSearchFilter(task));
    
    return {
      tasks: matchingTasks,
      matchCount: matchingTasks.length
    };
  }

  private applyDateFilter(tasks: BaseTask[]): BaseTask[] {
    return tasks.filter(task => this.passesDateFilter(task));
  }

  // Individual filter check methods

  private passesDeletedFilter(task: BaseTask): boolean {
    const isDiscarded = !!(task.discarded_at);
    if (this.filterState.showDeleted) {
      return isDiscarded;
    } else {
      return !isDiscarded;
    }
  }

  private passesStatusFilter(task: BaseTask): boolean {
    if (this.filterState.status.selectedStatuses.length === 0) {
      return true;
    }
    return this.filterState.status.selectedStatuses.includes(task.status || '');
  }

  private passesSearchFilter(task: BaseTask): boolean {
    const query = this.debouncedSearchQuery.toLowerCase();
    const searchFields = this.filterState.search.searchFields;
    
    for (const field of searchFields) {
      const fieldValue = task[field];
      if (fieldValue && typeof fieldValue === 'string') {
        if (fieldValue.toLowerCase().includes(query)) {
          return true;
        }
      }
    }
    
    return false;
  }

  private passesDateFilter(task: BaseTask): boolean {
    const { startDate, endDate, dateField } = this.filterState.dates;
    const taskDate = task[dateField];
    
    if (!taskDate) return false;
    
    const taskDateObj = new Date(taskDate);
    
    if (startDate && taskDateObj < startDate) {
      return false;
    }
    
    if (endDate && taskDateObj > endDate) {
      return false;
    }
    
    return true;
  }
}