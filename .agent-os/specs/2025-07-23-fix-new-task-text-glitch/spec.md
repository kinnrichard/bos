# Spec Requirements Document

> Spec: Fix New Task Text Persistence Glitch
> Created: 2025-07-23
> Status: Planning

## Overview

Fix a visual glitch where the text of a newly created task briefly appears in the New Task input field at the bottom of the list before being cleared. This is purely a UI state management issue - the data persistence through Zero.js/ActiveRecord is working correctly.

## User Stories

### Clean Task Creation UI

As a **user creating tasks**, I want the New Task input to clear immediately when I submit a task, without any visual echo or ghosting of the text I just typed.

Current behavior:
- Type "Fix login bug" → Press Enter → Task appears in list ✓
- BUT: "Fix login bug" briefly shows in the bottom New Task input before clearing ✗

Expected behavior:
- Type "Fix login bug" → Press Enter → Task appears in list ✓
- New Task input is immediately empty ✓

## Spec Scope

1. **Input State Clearing** - Clear the input field text immediately when task creation begins
2. **UI State Timing** - Ensure the taskCreationManager state is cleared before the UI re-renders

## Out of Scope

- Any changes to ActiveRecord/ReactiveRecord/Zero.js integration
- Data persistence mechanisms
- Server synchronization
- Task validation or error handling
- Changes to the task creation flow logic

## Expected Deliverable

The New Task input field should be visually empty immediately after pressing Enter or submitting a task, with no text ghosting or delayed clearing.

## Technical Context

The issue is likely in the timing of when `taskCreationManager.hide()` is called versus when the UI components re-render. The text state needs to be cleared earlier in the execution flow to prevent the visual glitch.

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-23-fix-new-task-text-glitch/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-23-fix-new-task-text-glitch/sub-specs/technical-spec.md
- Tests Specification: @.agent-os/specs/2025-07-23-fix-new-task-text-glitch/sub-specs/tests.md