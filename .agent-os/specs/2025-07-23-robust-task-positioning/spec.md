# Spec Requirements Document

> Spec: Robust Task Positioning System
> Created: 2025-07-23
> Status: Planning

## Overview

Implement a conflict-free positioning system for tasks using fractional positioning that prevents collisions when inserting tasks between existing ones and handles concurrent offline/online operations gracefully.

## User Stories

### Seamless Task Insertion

As a service technician, I want to insert new tasks between existing ones without position conflicts, so that I can organize my work queue precisely without worrying about technical limitations.

When I click "Add Task" between two existing tasks, the system should create the new task with a fractional position (e.g., 1.5 between positions 1 and 2) that maintains the correct order. This should work whether I'm online or offline, and when multiple team members are reordering tasks simultaneously.

### Reliable Drag-and-Drop Reordering

As a team lead, I want to drag tasks to reorder them without position collisions, so that I can prioritize work for my team efficiently.

When dragging a task between two others, the system should calculate an appropriate fractional position that places it exactly where intended. The positioning should be stable - tasks shouldn't jump around or change order unexpectedly when syncing with the server.

### Offline-First Task Management

As a field technician, I want task positioning to work seamlessly offline, so that I can organize my work queue even without internet connectivity.

When working offline, I should be able to create tasks, reorder them, and have all changes sync correctly when I reconnect. If multiple technicians made changes offline, the system should merge positions intelligently without losing any task order intentions.

## Spec Scope

1. **Fractional Positioning Algorithm** - Implement decimal-based positioning that allows infinite insertions between any two positions
2. **Position Calculation Service** - Create a service that calculates optimal positions for insertions and moves
3. **Mutator Integration** - Update the positioning mutator to use fractional positions instead of timestamps
4. **UI Integration** - Ensure TaskList component uses fractional positioning for both creation and drag-and-drop
5. **Conflict Resolution** - Handle edge cases like position precision limits and rebalancing when needed

## Out of Scope

- Changing the database schema (position column already supports decimals)
- Modifying the Rails positioning gem behavior on the backend
- Creating new UI components or changing the drag-and-drop library
- Implementing custom Zero.js mutations (using existing infrastructure)

## Expected Deliverable

1. Tasks can be inserted between any two existing tasks without position conflicts
2. Drag-and-drop reordering uses fractional positions and works smoothly
3. Offline positioning changes sync correctly without conflicts

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-23-robust-task-positioning/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-23-robust-task-positioning/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-07-23-robust-task-positioning/sub-specs/tests.md