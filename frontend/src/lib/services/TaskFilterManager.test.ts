import { describe, expect, test, beforeEach, vi } from 'vitest';
import { TaskFilterManager } from './TaskFilterManager';
import type { BaseTask } from './TaskHierarchyManager';

describe('TaskFilterManager', () => {
  let filterManager: TaskFilterManager;

  beforeEach(() => {
    vi.useFakeTimers();
    filterManager = new TaskFilterManager();
    vi.clearAllTimers();
  });

  const createMockTasks = (): BaseTask[] => [
    {
      id: 'task1',
      title: 'Database Migration Task',
      position: 1,
      status: 'new_task',
      created_at: '2023-01-01T10:00:00Z',
      updated_at: '2023-01-01T10:00:00Z'
    },
    {
      id: 'task2',
      title: 'Frontend Development',
      position: 2,
      status: 'in_progress',
      created_at: '2023-01-02T10:00:00Z',
      updated_at: '2023-01-02T10:00:00Z'
    },
    {
      id: 'task3',
      title: 'API Integration',
      position: 3,
      status: 'successfully_completed',
      created_at: '2023-01-03T10:00:00Z',
      updated_at: '2023-01-03T10:00:00Z'
    },
    {
      id: 'task4',
      title: 'Testing Phase',
      position: 4,
      status: 'paused',
      created_at: '2023-01-04T10:00:00Z',
      updated_at: '2023-01-04T10:00:00Z'
    },
    {
      id: 'task5',
      title: 'Deleted Task',
      position: 5,
      status: 'cancelled',
      created_at: '2023-01-05T10:00:00Z',
      updated_at: '2023-01-05T10:00:00Z',
      discarded_at: '2023-01-06T10:00:00Z'
    }
  ];

  describe('Initialization', () => {
    test('should initialize with default filter state', () => {
      const state = filterManager.getFilterState();
      
      expect(state.status.selectedStatuses).toEqual(['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled']);
      expect(state.search.query).toBe('');
      expect(state.search.searchFields).toEqual(['title', 'description']);
      expect(state.dates.dateField).toBe('created_at');
      expect(state.showDeleted).toBe(false);
    });

    test('should provide backward compatibility methods', () => {
      expect(filterManager.getSelectedStatuses()).toEqual(['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled']);
      expect(filterManager.getShowDeleted()).toBe(false);
      expect(filterManager.getSearchQuery()).toBe('');
    });
  });

  describe('Status Filtering', () => {
    test('should filter tasks by status', () => {
      const tasks = createMockTasks();
      filterManager.updateStatusFilter(['in_progress', 'paused']);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(2);
      expect(result.filteredTasks.map(t => t.id)).toEqual(['task2', 'task4']);
      expect(result.appliedFilters).toContain('status');
    });

    test('should show all tasks when no status filter is applied', () => {
      const tasks = createMockTasks().filter(t => !t.discarded_at); // Exclude deleted
      filterManager.updateStatusFilter([]);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(4);
    });

    test('should update status filter reactively', () => {
      filterManager.updateStatusFilter(['new_task']);
      
      expect(filterManager.getSelectedStatuses()).toEqual(['new_task']);
    });
  });

  describe('Deleted Task Filtering', () => {
    test('should exclude deleted tasks by default', () => {
      const tasks = createMockTasks();
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(4); // Excludes task5 (deleted)
      expect(result.filteredTasks.map(t => t.id)).not.toContain('task5');
    });

    test('should show only deleted tasks when showDeleted is true', () => {
      const tasks = createMockTasks();
      filterManager.updateShowDeleted(true);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(1);
      expect(result.filteredTasks[0].id).toBe('task5');
      expect(result.appliedFilters).toContain('deleted');
    });

    test('should update show deleted flag reactively', () => {
      filterManager.updateShowDeleted(true);
      
      expect(filterManager.getShowDeleted()).toBe(true);
    });
  });

  describe('Search Filtering', () => {
    test('should filter tasks by search query in title', () => {
      const tasks = createMockTasks();
      filterManager.updateSearchQuery('Database');
      
      // Wait for debouncing
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(1);
      expect(result.filteredTasks[0].id).toBe('task1');
      expect(result.appliedFilters).toContain('search');
      expect(result.searchResultCount).toBe(1);
    });

    test('should be case insensitive', () => {
      const tasks = createMockTasks();
      filterManager.updateSearchQuery('database');
      
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(1);
      expect(result.filteredTasks[0].id).toBe('task1');
    });

    test('should search partial matches', () => {
      const tasks = createMockTasks();
      filterManager.updateSearchQuery('API');
      
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(1);
      expect(result.filteredTasks[0].id).toBe('task3');
    });

    test('should debounce search queries', () => {
      const tasks = createMockTasks();
      
      // Rapid search updates
      filterManager.updateSearchQuery('D');
      filterManager.updateSearchQuery('Da');
      filterManager.updateSearchQuery('Database');
      
      // Before debounce timeout
      let result = filterManager.applyFilters(tasks);
      expect(result.filteredCount).toBe(4); // No search applied yet
      
      // After debounce timeout
      vi.advanceTimersByTime(300);
      result = filterManager.applyFilters(tasks);
      expect(result.filteredCount).toBe(1); // Search applied
    });

    test('should handle empty search query', () => {
      const tasks = createMockTasks();
      filterManager.updateSearchQuery('');
      
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(4); // All non-deleted tasks
      expect(result.appliedFilters).not.toContain('search');
    });
  });

  describe('Date Range Filtering', () => {
    test('should filter tasks by date range', () => {
      const tasks = createMockTasks();
      const startDate = new Date('2023-01-02T00:00:00Z');
      const endDate = new Date('2023-01-03T23:59:59Z');
      
      filterManager.updateDateRange(startDate, endDate, 'created_at');
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(2); // task2 and task3
      expect(result.filteredTasks.map(t => t.id)).toEqual(['task2', 'task3']);
      expect(result.appliedFilters).toContain('dates');
    });

    test('should filter by start date only', () => {
      const tasks = createMockTasks();
      const startDate = new Date('2023-01-03T00:00:00Z');
      
      filterManager.updateDateRange(startDate, undefined, 'created_at');
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(2); // task3 and task4 (task5 is excluded by deleted filter)
      expect(result.filteredTasks.map(t => t.id)).toEqual(['task3', 'task4']);
    });

    test('should filter by end date only', () => {
      const tasks = createMockTasks();
      const endDate = new Date('2023-01-02T23:59:59Z');
      
      filterManager.updateDateRange(undefined, endDate, 'created_at');
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(2); // task1 and task2
      expect(result.filteredTasks.map(t => t.id)).toEqual(['task1', 'task2']);
    });
  });

  describe('Combined Filtering', () => {
    test('should apply multiple filters together', () => {
      const tasks = createMockTasks();
      
      // Apply status filter, search, and show deleted
      filterManager.updateStatusFilter(['cancelled']);
      filterManager.updateSearchQuery('Deleted');
      filterManager.updateShowDeleted(true);
      
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(1);
      expect(result.filteredTasks[0].id).toBe('task5');
      expect(result.appliedFilters).toEqual(['deleted', 'status', 'search']);
    });

    test('should return empty results when filters conflict', () => {
      const tasks = createMockTasks();
      
      // Show deleted tasks but search for non-deleted task
      filterManager.updateShowDeleted(true);
      filterManager.updateSearchQuery('Database');
      
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.filteredCount).toBe(0);
    });
  });

  describe('shouldShowTask Method', () => {
    test('should check if individual task passes all filters', () => {
      const task = createMockTasks()[0]; // task1: new_task, "Database Migration Task"
      
      filterManager.updateStatusFilter(['new_task']);
      filterManager.updateSearchQuery('Database');
      
      vi.advanceTimersByTime(300);
      
      expect(filterManager.shouldShowTask(task)).toBe(true);
    });

    test('should return false when task fails any filter', () => {
      const task = createMockTasks()[0]; // task1: new_task
      
      filterManager.updateStatusFilter(['in_progress']); // Different status
      
      expect(filterManager.shouldShowTask(task)).toBe(false);
    });

    test('should handle deleted tasks correctly', () => {
      const deletedTask = createMockTasks()[4]; // task5: deleted
      
      expect(filterManager.shouldShowTask(deletedTask)).toBe(false);
      
      filterManager.updateShowDeleted(true);
      expect(filterManager.shouldShowTask(deletedTask)).toBe(true);
    });
  });

  describe('Filter Summary', () => {
    test('should provide active filter summary', () => {
      filterManager.updateStatusFilter(['new_task', 'in_progress']);
      filterManager.updateSearchQuery('Database');
      filterManager.updateShowDeleted(true);
      
      vi.advanceTimersByTime(300);
      
      const summary = filterManager.getActiveFilterSummary();
      
      expect(summary).toContain('Status: 2 selected');
      expect(summary).toContain('Search: "Database"');
      expect(summary).toContain('Including deleted');
    });

    test('should return empty summary when no filters active', () => {
      filterManager.resetToDefaults();
      
      const summary = filterManager.getActiveFilterSummary();
      
      expect(summary).toEqual(['Status: 5 selected']); // Default status filter
    });
  });

  describe('Performance and Caching', () => {
    test('should cache filter results', () => {
      const tasks = createMockTasks();
      
      // First call
      const result1 = filterManager.applyFilters(tasks);
      
      // Second call with same data should return cached result
      const result2 = filterManager.applyFilters(tasks);
      
      expect(result1).toBe(result2); // Same object reference (cached)
    });

    test('should invalidate cache when filters change', () => {
      const tasks = createMockTasks();
      
      const result1 = filterManager.applyFilters(tasks);
      
      // Change filter
      filterManager.updateStatusFilter(['new_task']);
      const result2 = filterManager.applyFilters(tasks);
      
      expect(result1).not.toBe(result2); // Different object reference (cache invalidated)
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all filters to defaults', () => {
      // Apply various filters
      filterManager.updateStatusFilter(['new_task']);
      filterManager.updateSearchQuery('test');
      filterManager.updateShowDeleted(true);
      filterManager.updateDateRange(new Date(), new Date(), 'updated_at');
      
      // Reset
      filterManager.resetToDefaults();
      
      // Check all defaults are restored
      expect(filterManager.getSelectedStatuses()).toEqual(['new_task', 'in_progress', 'paused', 'successfully_completed', 'cancelled']);
      expect(filterManager.getSearchQuery()).toBe('');
      expect(filterManager.getShowDeleted()).toBe(false);
      
      const state = filterManager.getFilterState();
      expect(state.dates.startDate).toBeUndefined();
      expect(state.dates.endDate).toBeUndefined();
      expect(state.dates.dateField).toBe('created_at');
    });
  });

  describe('Filter Result Metadata', () => {
    test('should provide comprehensive filter result metadata', () => {
      const tasks = createMockTasks();
      filterManager.updateStatusFilter(['in_progress']);
      filterManager.updateSearchQuery('Frontend');
      
      vi.advanceTimersByTime(300);
      
      const result = filterManager.applyFilters(tasks);
      
      expect(result.totalCount).toBe(5);
      expect(result.filteredCount).toBe(1);
      expect(result.appliedFilters).toEqual(['deleted', 'status', 'search']);
      expect(result.searchResultCount).toBe(1);
      expect(result.filteredTasks).toHaveLength(1);
    });
  });
});