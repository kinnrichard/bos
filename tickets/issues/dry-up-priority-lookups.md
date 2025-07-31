# DRY Up Priority Type Lookups

**Issue Type**: Code Maintenance/Refactoring  
**Priority**: Medium  
**Created**: 2025-07-31  

## Problem Description

Priority lookups are currently duplicated across multiple files in both backend and frontend, creating maintenance overhead and potential inconsistencies. The system has multiple implementations of priority handling instead of a single source of truth.

## Current State

### Backend Duplication
- **Priority.rb** - Generic priority model
- **JobPriority.rb** - Job-specific priority model (includes "very_high" priority) ✅ **CORRECT IMPLEMENTATION**

### Frontend Duplication
- **ActivityLogList.svelte** - Contains duplicated priority emoji lookups that should reference centralized system

### Activity Logs Issue
- Activity logs implement their own priority lookups instead of using the centralized priority system
- This creates inconsistency and maintenance burden

## Solution Requirements

### 1. Consolidate Backend Priority Models
- **Keep JobPriority.rb** as the single source of truth (includes "very_high" priority)
- remove Priority.rb
- Ensure all backend components reference JobPriority for consistency

### 2. Use Existing Frontend Priority Utilities
- Remove duplicated priority emoji lookups from ActivityLogList.svelte
- Use existing centralized priority utilities from `src/lib/config/emoji.ts`
- Ensure ActivityLogList.svelte uses `getJobPriorityEmoji()` or `getTaskPriorityEmoji()` functions
- Consider using the existing `PriorityBadge.svelte` component where appropriate

### 3. Update Activity Log System
- Refactor activity logs to use centralized priority handling
- Remove custom priority logic from activity log components
- Ensure consistency with JobPriority definitions

## Files Requiring Changes

### Backend Files
- `app/models/Priority.rb` - Review for removal/refactoring
- `app/models/JobPriority.rb` - Confirm as single source of truth
- Any controllers/services referencing Priority.rb
- Activity log backend models/controllers

### Frontend Files
- `src/lib/components/ActivityLogList.svelte` - Remove duplicated priority lookups, use existing emoji.ts functions
- `src/lib/config/emoji.ts` - Already exists as centralized priority utility
- `src/lib/components/ui/PriorityBadge.svelte` - Existing component to use for priority display
- Any other components with hardcoded priority logic

### Configuration Files
- Update any configuration that references the old Priority model
- Ensure database migrations are consistent with JobPriority

## Acceptance Criteria

- [ ] Single source of truth for priority definitions (JobPriority.rb)
- [ ] No duplicated priority lookups in frontend components
- [ ] Activity logs use centralized priority system
- [ ] All priority handling is consistent across backend and frontend
- [ ] "very_high" priority is available throughout the system
- [ ] No breaking changes to existing functionality
- [ ] All tests pass after refactoring

## Technical Notes

- JobPriority.rb is identified as the correct implementation because it includes the "very_high" priority level
- Priority emoji mappings should be centralized in frontend utilities
- Consider creating a priority constants file that both backend and frontend can reference
- Ensure database consistency when consolidating models

## Related Issues

This refactoring will improve code maintainability and reduce the risk of priority-related bugs due to inconsistent implementations across the codebase.