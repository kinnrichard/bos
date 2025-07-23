# Spec Requirements Document

> Spec: Task Info Popover ReactiveRecord Migration
> Created: 2025-07-22
> Status: Planning

## Overview

Convert the TaskInfoPopover component from legacy REST API calls to ReactiveRecord queries to enable real-time updates and proper integration with the Zero.js synchronization system. This migration will fix the currently broken popover functionality and provide seamless real-time collaboration features.

## User Stories

### Task Activity Visibility

As a **service technician**, I want to view task activity history and notes in real-time, so that I can stay updated on task progress without refreshing the page.

When I click on a task, I need to see:
- Complete activity log showing who created the task and when status changed
- All notes added by team members with timestamps
- Real-time updates when other users add notes or change status
- A running timer for tasks in progress

### Collaborative Note Taking

As a **team lead**, I want to add notes to tasks that instantly appear for all team members, so that we can collaborate effectively on task resolution.

The workflow involves:
1. Click on a task to open the info popover
2. Type a note in the text area
3. Press Enter or click Add Note
4. Note appears immediately in the timeline for all users viewing the task
5. Activity count on the task card updates in real-time

## Spec Scope

1. **ReactiveRecord Integration** - Replace all REST API calls with ReactiveRecord queries for activity logs and notes
2. **Real-time Synchronization** - Enable instant updates across all connected clients using Zero.js
3. **Timeline Display** - Show chronological activity logs and notes with user information and timestamps
4. **Note Creation** - Implement note creation using ReactiveRecord mutations with optimistic updates
5. **Timer Functionality** - Fix the broken timer display for in-progress tasks

## Out of Scope

- UI/UX redesign of the popover component
- Adding new activity types beyond current functionality
- Modifying the task card display or drag-and-drop behavior
- Adding file attachments or rich text formatting to notes
- User permission changes or access control modifications

## Expected Deliverable

1. TaskInfoPopover displays real-time activity logs and notes without page refresh
2. Notes can be added and appear instantly for all users viewing the same task
3. Timer shows accurate elapsed time for in-progress tasks

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-22-task-info-popover-reactive/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-22-task-info-popover-reactive/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-07-22-task-info-popover-reactive/sub-specs/tests.md