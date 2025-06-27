# Multi-Target Jobs Implementation Epic

## Overview

This epic describes the implementation of a multi-target job system that allows jobs to be executed across multiple devices and/or people, with individual progress tracking and flexible UI presentation.

**Business Value:**
- Execute the same process across multiple devices/people efficiently
- Track individual progress while maintaining a unified view
- Scale from simple (2-3 targets) to complex (25+ targets) scenarios
- Reduce duplicate task creation and management overhead

**Total Estimated Time:** ~40-50 hours

## Core Concept

Every job will be linked to 1 or more devices and/or 1 or more people. Tasks within a job are defined once but track completion status per target.

## Epic 1: Data Model Enhancement

### Story 1.1: Create Job Targets Infrastructure

**As a** system administrator  
**I want** jobs to be associated with multiple targets (devices/people)  
**So that** I can execute batch operations efficiently

**Acceptance Criteria:**
1. Create `job_targets` table with fields:
   - id, job_id, target_type (enum: device/person), target_id, status, created_at, updated_at
2. Add has_many :job_targets association to Job model
3. Add validation: every job must have at least one target
4. Create `task_completions` table:
   - task_id, job_target_id, status, completed_at, completed_by_id, notes
5. Update Task model with completion tracking methods

**Technical Notes:**
- Use Rails enums for target_type and status
- Add indexes for efficient querying
- Consider using counter caches for performance

**Estimated:** 6-8 hours

---

### Story 1.2: Implement Task Status Aggregation

**As a** user  
**I want** to see aggregate task status across all targets  
**So that** I can understand overall progress at a glance

**Acceptance Criteria:**
1. Add computed status method to Task model:
   - "New" if all targets are new
   - "Completed" if all targets completed
   - "In Progress" if any target is in progress
   - "Mixed" for varying statuses
2. Add progress calculation methods (e.g., 15/25 completed)
3. Create scopes for filtering by aggregate status
4. Add caching for expensive calculations

**Estimated:** 4-5 hours

---

## Epic 2: UI/UX Implementation

### Story 2.1: Build Progress Overview Mode

**As a** user viewing a multi-target job  
**I want** to see task progress bars showing completion across all targets  
**So that** I can quickly assess overall job status

**Acceptance Criteria:**
1. Modify task list component to detect multi-target jobs
2. Add progress bar component showing X/Y completion
3. Display aggregate status with visual indicators
4. Show target count next to each task
5. Maintain existing UI for single-target jobs

**UI Example:**
```
├── testing 123 [████████] 25/25 ✓
├── this is a new task [████░░░░] 15/25 
│   └── goat master [████████] 15/15 ✓
```

**Estimated:** 6-8 hours

---

### Story 2.2: Implement Target Filter System

**As a** user managing a job with many targets  
**I want** to filter the view by specific targets or status  
**So that** I can focus on relevant information

**Acceptance Criteria:**
1. Add filter dropdown component above task list
2. Filter options:
   - All Targets (default)
   - By Status (New/In Progress/Completed)
   - By Type (Devices/People)
   - By Specific Target (searchable)
3. Update task list to show filtered results
4. Persist filter selection in session
5. Show filter indicator when active

**Estimated:** 8-10 hours

---

### Story 2.3: Create Detailed/Expanded View Toggle

**As a** user  
**I want** to toggle between overview and detailed target view  
**So that** I can see individual target status when needed

**Acceptance Criteria:**
1. Add view toggle button (Overview/Detailed)
2. In detailed view, show expandable target list under each task
3. Implement pagination for >5 targets per task
4. Show target-specific status and metadata
5. Add "Show X more..." link for collapsed items

**Detailed View Example:**
```
├── this is a new task [███░░░░░] 15/25 [▼]
│   ├── 🖥️ Device-Server-01 ✓ Completed
│   ├── 🖥️ Device-Server-02 ◐ In Progress  
│   ├── 👤 John Doe ✓ Completed
│   └── [Show 22 more...]
```

**Estimated:** 8-10 hours

---

## Epic 3: Job Creation and Management

### Story 3.1: Enhance Job Creation Flow

**As a** user creating a job  
**I want** to select multiple targets during job creation  
**So that** batch operations are set up from the start

**Acceptance Criteria:**
1. Add "Targets" section to job creation form
2. Implement device/person selector with search
3. Allow mixing devices and people in same job
4. Show selected targets with remove option
5. Validate at least one target selected

**Estimated:** 6-8 hours

---

### Story 3.2: Implement Bulk Status Updates

**As a** user  
**I want** to update task status for multiple targets at once  
**So that** I can efficiently manage batch operations

**Acceptance Criteria:**
1. Add "Update Status" action to task context menu
2. Show modal with options:
   - Update all targets
   - Update filtered targets
   - Update selected targets
3. Add checkbox selection mode for individual targets
4. Implement bulk update with progress indicator
5. Log bulk operations for audit trail

**Estimated:** 8-10 hours

---

## Epic 4: Additional Features (Future Consideration)

### Story 4.1: Target Groups

**As a** user  
**I want** to create reusable groups of targets  
**So that** I can quickly assign common sets to new jobs

**Acceptance Criteria:**
1. Create job_target_groups table
2. Add UI for creating/managing groups
3. Allow group selection during job creation
4. Support dynamic groups (e.g., "All Floor 2 Devices")

**Estimated:** 8-10 hours

---

### Story 4.2: Task Templates (Separate Feature)

**As a** user  
**I want** to create reusable task templates  
**So that** I can standardize common procedures

**Note:** This is a separate feature from multi-target jobs but complements it well.

**Estimated:** 10-12 hours

---

## Technical Considerations

1. **Performance:**
   - Use database views for complex aggregations
   - Implement caching for frequently accessed data
   - Consider background jobs for bulk operations

2. **Migration Strategy:**
   - Existing jobs get single "self" target
   - Gradual rollout with feature flag
   - Backwards compatibility maintained

3. **Testing:**
   - Unit tests for model methods
   - Integration tests for UI flows
   - Performance tests for large target sets

## Success Metrics

- Reduction in duplicate job creation
- Improved task completion tracking accuracy
- User satisfaction with batch operation handling
- Performance maintained with 100+ targets per job