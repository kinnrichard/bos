# Bug-to-PR Automation Implementation Stories

Based on the architecture document and our discussions, here's the simplified implementation plan with both bug reports and feature requests.

## Overview

This implementation creates a feedback system that:
- Allows users to report bugs with automatic PR generation via Claude Code
- Allows users to request features with semi-automated story generation
- Places both options in the user menu for easy access
- Requires no rate limiting or complex authorization
- Total estimated time: ~35-45 hours

## Epic 1: Feedback Collection System

### Story 1.1: Create Feedback Models and Menu Integration

**As a** user  
**I want** to report bugs or request features from the user menu  
**So that** I can easily provide feedback to improve the system

**Acceptance Criteria:**
1. Create BugReport model with request_type enum (bug/feature)
2. Add dividers and two menu items to UserMenuComponent:
   - 🐛 Report a Bug
   - ✨ Request a Feature  
3. Position between Settings and Sign Out
4. Create routes and controller for feedback
5. Add all fields from architecture (including metadata JSONB)
6. Include Loggable concern for activity tracking

**Technical Notes:**
- Model fields: user_id, title, description, console_logs, browser_info, page_url, screenshot_data, status, metadata, unique_id, request_type
- Use enum request_type: { bug: 0, feature: 1 }
- Follow existing model patterns

**Estimated:** 3-4 hours

---

### Story 1.2: Build Bug Report Form with Screenshot

**As a** user reporting a bug  
**I want** to describe the issue and include a screenshot  
**So that** developers can see exactly what went wrong

**Acceptance Criteria:**
1. Create BugReportWidget Phlex component
2. Single form with title, description fields
3. Implement screenshot capture with preview
4. Show capture button and retake option
5. Compress screenshot before saving (2MB limit)
6. Handle form submission with loading state

**Technical Notes:**
- Use existing ModalComponent patterns
- Consider html2canvas or native screenshot API
- Store screenshot as base64 in screenshot_data

**Estimated:** 5-6 hours

---

### Story 1.3: Build Feature Request Multi-Step Form

**As a** user requesting a feature  
**I want** to provide detailed information about my needs  
**So that** developers understand what to build

**Acceptance Criteria:**
1. Create FeatureRequestWidget Phlex component
2. Implement 5-screen progressive form with these exact questions:

   **Screen 1: Initial Request**
   - "What would you like to add or improve?" (text field)
   - "How important is this to you?" (radio buttons)
     - Nice to have
     - Would really help my workflow  
     - Critical - blocking my work

   **Screen 2: Problem Definition**
   - "What problem are you trying to solve?" (text area)
   - "How do you handle this today?" (text area)
   - "How often do you face this?" (radio buttons)
     - Daily
     - Weekly  
     - Monthly
     - Occasionally

   **Screen 3: Solution Exploration**
   - "Describe your ideal solution" (text area)
   - "Have you seen this done well elsewhere?" (text area - optional)

   **Screen 4: Context**
   - "What's your main goal with this feature?" (text area)
     - Helper text: "Examples: Save time, reduce errors, automate tasks, better insights"
   - "Expected outcome after implementation?" (text area)
     - Helper text: "What specific improvement do you expect?"

   **Screen 5: Priority & Impact**
   - "Business impact if implemented?" (radio buttons)
     - Minor efficiency gain
     - Significant time savings
     - Unlocks new capabilities
     - Revenue/cost impact
   - "How can we measure success?" (text area)
     - Helper text: "What metrics would show this is working?"
   - "Anything else we should know?" (text area - optional)

3. Progress indicator showing current step (1 of 5, 2 of 5, etc.)
4. Back/Next navigation between screens
5. Save all answers in metadata field as structured JSON

**Technical Notes:**
- Use Stimulus for multi-step navigation
- Validate required fields before allowing next step
- Save draft in localStorage to prevent data loss
- Store question-answer pairs in metadata with clear keys

**Estimated:** 6-8 hours

---

### Story 1.4: Browser Data Collection

**As a** developer  
**I want** bug reports to include console and browser data  
**So that** I have debugging information automatically

**Acceptance Criteria:**
1. Create console capture Stimulus controller
2. Capture last 50 console entries (log, warn, error)
3. Capture browser info (user agent, viewport, etc.)
4. Capture current page URL automatically
5. Only collect for bug reports, not features
6. Include timestamp with each console entry

**Technical Notes:**
- Override console methods to capture
- Store in memory until submission
- Clear after successful submission

**Estimated:** 3-4 hours

## Epic 2: Automation Pipeline

### Story 2.1: Claude Integration for Bugs

**As a** system  
**I want** to send bug reports to Claude for automated fixes  
**So that** simple bugs can be resolved quickly

**Acceptance Criteria:**
1. Create ClaudeAutomationService that uses Claude CLI
2. Create ProcessBugReportJob using Solid Queue
3. Format bug report into comprehensive prompt including:
   - Bug details (title, description, console logs, URL, browser info)
   - Instructions for analysis, BMAD story creation, fix implementation
   - Git branch creation and PR generation commands
4. Execute via: `echo '#{prompt}' | claude --conversation-id bug-#{id}`
5. Parse PR URL from Claude's response
6. Create BugResolution record with PR details
7. Update bug status throughout pipeline

**Technical Notes:**
- Use Claude CLI instead of API for better context awareness
- Include full PR creation in single prompt for continuity
- Example prompt structure:
  ```ruby
  prompt = <<~PROMPT
    You are Claude Code with BMAD capabilities. Analyze and fix this bug.
    
    BUG REPORT:
    Title: #{bug_report.title}
    Description: #{bug_report.description}
    Console Errors: #{bug_report.console_logs}
    URL: #{bug_report.page_url}
    Browser: #{bug_report.browser_info}
    
    INSTRUCTIONS:
    1. Analyze the bug and identify the root cause
    2. Create a BMAD story for the fix using story format
    3. Implement the fix following the story
    4. Write tests if applicable (check existing test patterns)
    5. Create a git branch named: fix/bug-report-#{bug_report.unique_id}
    6. Commit changes with message linking to bug report
    7. Create GitHub PR with:
       - Title: "Fix: #{bug_report.title}"
       - Description including bug report ID and fix summary
       - Link: Fixes bug report #{bug_report.unique_id}
    
    Use git commands and gh CLI to create the PR.
    Return the PR URL when complete.
  PROMPT
  ```
- Parse PR URL with regex: `/PR created: (https:\/\/github\.com\/.+\/pull\/\d+)/`
- Log all Claude interactions to AutomationLog

**Estimated:** 6-8 hours

---

### Story 2.2: Bug Resolution Tracking and Notifications

**As a** system  
**I want** to track bug fix progress and notify stakeholders  
**So that** everyone knows when bugs are resolved

**Acceptance Criteria:**
1. Create BugResolution model and migrations
2. Monitor PR status via GitHub webhooks or polling
3. Update resolution status when PR is merged/closed
4. Send email notifications:
   - To reporter when PR is created
   - To reporter when PR is merged
   - To admin on automation failures
5. Create simple view to show PR status for admins

**Technical Notes:**
- BugResolution tracks: pr_url, pr_number, status, fix_summary
- Consider GitHub webhook for real-time updates
- Fall back to polling if webhooks not available
- Include PR link in notification emails

**Estimated:** 4-5 hours

---

### Story 2.3: Feature Request Workflow

**As an** admin  
**I want** to review feature requests and generate stories  
**So that** I can manage product development efficiently

**Acceptance Criteria:**
1. Create admin review interface for feature requests
2. Add "Generate Story" button that sends to Claude
3. Display generated story for human review/edit
4. Add "Approve for Implementation" button
5. Trigger Claude Code implementation on approval
6. Track status with automation_status enum

**Technical Notes:**
- Add automation_status enum to BugReport model
- Create simple admin view (no dashboard needed)
- Email notification on new feature requests
- Reuse ClaudeWebhookService for story generation

**Estimated:** 5-6 hours

## Epic 3: Monitoring and Safety

### Story 3.1: Basic Monitoring and Controls

**As an** admin  
**I want** to monitor the automation and disable if needed  
**So that** I can ensure system safety

**Acceptance Criteria:**
1. Add email notifications for:
   - New feature requests submitted
   - Bug automation failures
   - PRs created successfully
2. Create emergency off switch (environment variable)
3. Log all automation events to AutomationLog
4. Add basic confidence threshold for fixes
5. Skip automation for specific file patterns

**Technical Notes:**
- Use ActionMailer for notifications
- Add AUTOMATION_ENABLED env var
- Log success/failure metrics

**Estimated:** 3-4 hours

## Implementation Order

1. **Week 1: Feedback Collection**
   - Story 1.1: Models and menu (3-4 hours)
   - Story 1.2: Bug report form (5-6 hours)
   - Story 1.3: Feature request form (6-8 hours)
   - Story 1.4: Browser data (3-4 hours)
   - **Subtotal: 17-22 hours**

2. **Week 2: Automation**
   - Story 2.1: Claude integration (6-8 hours)
   - Story 2.2: Resolution tracking (4-5 hours)
   - Story 2.3: Feature workflow (5-6 hours)
   - Story 3.1: Monitoring (3-4 hours)
   - **Subtotal: 18-23 hours**

**Total: 35-45 hours** (approximately 1.5-2 weeks for one developer)

## Key Simplifications Made

1. **No rate limiting** - Not needed for 3 testers
2. **No user-facing reports view** - Users don't need to see their submissions
3. **No complex authorization** - All users can submit feedback
4. **No admin dashboard** - Email notifications sufficient
5. **No feature flags** - Roll out to everyone immediately
6. **Combined stories** - Reduced from 12 to 8 stories

## Database Schema Summary

```ruby
# BugReport model
class BugReport < ApplicationRecord
  belongs_to :user
  has_one :bug_resolution
  has_many :automation_logs, as: :automatable
  
  enum request_type: { bug: 0, feature: 1 }
  enum status: { 
    pending: 0, 
    processing: 1, 
    fixed: 2, 
    rejected: 3 
  }
  enum automation_status: { 
    pending_review: 0,
    story_generated: 1, 
    approved_for_implementation: 2,
    pr_created: 3,
    completed: 4,
    rejected: 5
  }
  
  # Fields: user_id, title, description, console_logs, browser_info, 
  # page_url, screenshot_data, status, metadata, unique_id, request_type
end
```

## Success Metrics

- Time from bug report to PR < 10 minutes
- Feature request to story generation < 5 minutes  
- 80%+ automation success rate for simple bugs
- Zero security incidents from automated fixes
- Positive feedback from the 3 testers