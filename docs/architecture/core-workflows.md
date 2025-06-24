# bŏs Core Workflows

## Overview

This document describes the primary user workflows in the bŏs application. Each workflow details the user journey, technical implementation, and key decision points.

## User Roles

1. **Owner** - Full system access, user management
2. **Administrator** - Client and job management, reporting
3. **Member/Technician** - Job execution, task completion

## Primary Workflows

### 1. User Authentication

**Entry Points:**
- `/login` - Login page
- `/` - Redirects to login if not authenticated

**Flow:**
1. User visits login page
2. Enters email and password
3. System validates credentials using bcrypt
4. Creates session on success
5. Redirects to home page
6. Shows personalized greeting

**Key Files:**
- `app/controllers/sessions_controller.rb`
- `app/views/sessions/new_view.rb`
- `app/models/user.rb` (authentication logic)

**Error Handling:**
- Invalid credentials show inline error
- No account lockout (consider for production)

### 2. Client Management

#### 2.1 Creating a Client

**Entry Point:** "New Client" button on clients index

**Flow:**
1. User clicks "New Client" from `/clients`
2. Fills in client form:
   - Name (required, unique)
   - Client Type (business/individual)
3. System normalizes name for uniqueness check
4. Creates client record
5. Logs activity
6. Redirects to client detail page

**Key Features:**
- Name auto-formatting (title case for lowercase input)
- Duplicate prevention via normalized names
- Activity logging for audit trail

#### 2.2 Client Search

**Entry Points:**
- Header search bar (global)
- `/clients/search` endpoint

**Flow:**
1. User types in search box
2. Stimulus controller triggers search
3. Results appear in dropdown (max 10)
4. Click result to navigate
5. Supports JSON responses for AJAX

**Search Logic:**
- Matches on name OR code
- Case-insensitive
- Uses PostgreSQL ILIKE

### 3. Job Management

#### 3.1 Creating a Job

**Entry Point:** "New Job" button on client page

**Flow:**
1. Navigate to client detail page
2. Click "New Job"
3. Fill job form:
   - Title (required)
   - Description
   - Status (default: open)
   - Priority (default: normal)
   - Due date/time (optional)
   - Start date/time (optional)
   - Assigned technicians (multiple)
   - Associated people (multiple)
4. System creates job with:
   - Current user as creator
   - Client association
   - Technician assignments
   - People associations
5. Option to add tasks immediately
6. Redirects to job detail page

**Status Values:**
- Open (0) - New job
- In Progress (1) - Being worked on
- Paused (2) - Temporarily halted
- Waiting for Customer (3)
- Waiting for Scheduled Appointment (4)
- Successfully Completed (5)
- Cancelled (6)

**Priority Values:**
- Critical (0) - Urgent issues
- High (1) - Important tasks
- Normal (2) - Standard work
- Low (3) - When time permits
- Proactive Followup (4) - Preventive work

#### 3.2 Job Listing

**Entry Points:**
- `/jobs` - All jobs across clients
- `/clients/:id/jobs` - Client-specific jobs

**Features:**
- Status-based sorting (active jobs first)
- Filter by:
  - Assigned technician
  - Status
  - Date range
- Inline job cards showing:
  - Status badge
  - Priority indicator
  - Due date
  - Task progress

### 4. Task Management

#### 4.1 Adding Tasks

**Entry Point:** "Add Task" on job detail page

**Flow:**
1. Click "Add Task" button
2. Enter task title
3. Optional: Assign to technician
4. Task appears in list
5. Auto-saves position

**Features:**
- Inline creation (no page reload)
- Drag-and-drop reordering
- Subtask support
- Status tracking

#### 4.2 Task Completion

**Flow:**
1. Technician views assigned tasks
2. Clicks task to mark in progress
3. Completes work
4. Marks task complete
5. System logs:
   - Completion time
   - Completing user
   - Updates job progress

**Auto-behaviors:**
- Tasks auto-resort based on status (if enabled)
- Job status may update based on task completion
- Activity logged for audit

### 5. People & Contacts

#### 5.1 Adding People

**Entry Point:** "Add Person" on client page

**Flow:**
1. Navigate to client
2. Click "People" tab
3. Click "Add Person"
4. Enter:
   - Name (required)
   - Notes
   - Contact methods (via separate form)
5. Person linked to client

**Use Cases:**
- Primary contacts
- Technical contacts
- Billing contacts
- On-site personnel

### 6. Device Tracking

#### 6.1 Adding Devices

**Entry Point:** "Add Device" on client page

**Flow:**
1. Navigate to client
2. Click "Devices" tab
3. Click "Add Device"
4. Enter:
   - Name (required, unique per client)
   - Model
   - Serial Number
   - Location
   - Notes
   - Optional: Assign to person
5. Device tracked under client

**Naming Convention:**
- Enforced uniqueness per client
- Examples: "Server-01", "CEO-Laptop"

### 7. Scheduling

#### 7.1 Schedule Appointment

**Entry Point:** Calendar icon on job

**Flow:**
1. Click schedule icon
2. Popover appears
3. Select:
   - Date (required)
   - Time (optional)
   - Type (appointment, follow-up, etc.)
   - Notes
   - Assigned users
4. Creates ScheduledDateTime record
5. Updates job display

**Features:**
- Multiple schedules per job
- User assignments
- Flexible scheduling types

### 8. Activity Tracking

#### 8.1 Viewing Activity Logs

**Entry Points:**
- `/logs` - System-wide logs
- `/clients/:id/logs` - Client-specific logs

**Tracked Actions:**
- Record creation
- Updates (with change details)
- Deletions
- View events (for sensitive data)

**Log Details:**
- User who performed action
- Timestamp
- Changed fields (for updates)
- Related entities

### 9. User Settings

#### 9.1 Personal Settings

**Entry Point:** User menu → Settings

**Configurable Options:**
- Name
- Email
- Password
- Task auto-sort preference

**Flow:**
1. Click user avatar
2. Select "Settings"
3. Update fields
4. Save changes
5. Immediate effect

### 10. Search Workflows

#### 10.1 Global Search

**Entry Point:** Header search bar

**Behavior:**
1. Type 2+ characters
2. Debounced search (300ms)
3. Shows top 10 results
4. Categorized by type:
   - Clients
   - Jobs
   - People
5. Keyboard navigation support

#### 10.2 Filtered Lists

**Available Filters:**
- Jobs: Status, technician, date range
- Clients: Type, status
- Activity: User, action type, date

## Technical Implementation Details

### State Management
- Server-side state (Rails sessions)
- Stimulus controllers for UI state
- LocalStorage for UI preferences

### Real-time Features
- Currently none (consider ActionCable)
- Page refreshes for updates

### Performance Optimizations
- Eager loading associations
- Database indexes on search fields
- Limited result sets (pagination)

### Security Considerations
- All actions require authentication
- Role-based access control
- CSRF protection on forms
- Activity logging for audit trail

## Error Handling

### User-Facing Errors
- Form validation errors inline
- Flash messages for success/failure
- Empty states for no data

### System Errors
- 404 pages for missing records
- 500 pages for server errors
- Graceful degradation

## Mobile Considerations

### Responsive Behaviors
- Sidebar collapses on mobile
- Touch-friendly tap targets
- Simplified navigation
- Full-width forms

### Mobile-Specific Features
- Swipe to delete (planned)
- Touch-and-hold actions (planned)
- Optimized data tables

## Accessibility

### Keyboard Navigation
- Tab order follows visual flow
- Enter/Space activate buttons
- Escape closes modals
- Arrow keys in dropdowns

### Screen Reader Support
- Semantic HTML structure
- ARIA labels where needed
- Form field associations
- Status announcements

## Future Workflow Enhancements

1. **Bulk Operations**
   - Multi-select for jobs/tasks
   - Bulk status updates
   - Mass assignment

2. **Automation**
   - Recurring jobs
   - Template jobs
   - Auto-assignment rules

3. **Collaboration**
   - Real-time updates
   - In-app messaging
   - Team notifications

4. **Mobile App**
   - Native mobile experience
   - Offline support
   - Push notifications

5. **Integrations**
   - Calendar sync
   - Email notifications
   - Third-party tools

## Common User Journeys

### Technician Daily Flow
1. Login
2. View "My Jobs" (filtered list)
3. Select high-priority job
4. Review job details and tasks
5. Update task statuses
6. Add notes as needed
7. Complete job
8. Move to next job

### Administrator Weekly Flow
1. Review activity logs
2. Check overdue jobs
3. Reassign work as needed
4. Create new jobs for the week
5. Update client information
6. Generate reports (planned)

### Client Service Flow
1. Client calls with issue
2. Search for client
3. Create new job
4. Assign to available technician
5. Schedule appointment
6. Add client contact to job
7. Set appropriate priority
8. Monitor progress