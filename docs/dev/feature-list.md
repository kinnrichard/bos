# Feature List & Implementation Status

## Legend
- ✅ **Completed** - implemented and working
- 🚧 **In Progress** - partially implemented
- 📋 **Planned** - planned for development
- 💭 **Backlog** - identified but not yet planned

# Core Platform Features

## Appearance
- ✅ macOS 26 look and feel
- ✅ Desktop-like interface (no hand pointer or hover)
- ✅ Sidebar show button
- 💭 Remove Sidebar hover states
- 💭 Scroll state restoration
- 💭 v2 Better popover positioning
- 💭 v3 Refined emoji placement
- 💭 v3 Fading toolbar (Zero.js docs style)
- 💭 v3 Better behavior on smaller screens
- 💭 v3 Slide in/out sidebar

## Authentication
- 💭 Make user stay logged in

## Drag & Drop
- 📋 make Drag & Drop more solid with a robust test library

## Svelte Components
- ✅ Components that are repeated 3x (namely popovers) are DRY

## 📋 ReactiveRecord
- ✅ When a model is instantiated client-side with .new(), it gets same default values that it would in Rails schema
- 💭 v2 Utilizing the Zero.js permissions system but defining it easily in Rails, for example, via Action Policy
- ✅ ActivityLogs should be generated client-side
  - 💭 v2 but then validated server-side
- 💭 v2 Calculated fields such as reduced name should be overwritten server-side
  - 💭 Positioning
  - 💭 Activity Tracking
  - 💭 Setting User Attribution
  - 💭 Name Normalized

# v1 Features

## Features that span models
- ✅ Basic search filtering
  - 💭 Different behavior with spacebar
  - 💭 v2 AI-powered search
- 🚧 Logs
- 💭 Audit higher-risk activites

## Clients
- ✅ List Clients
- 💭 Create
- 💭 Edit
- 💭 Mark as business or residential
- ✅ Basic Search
- ✅ Name normalization** with duplicate prevention
  - 💭 Client side
- 💭 v2 Search by other attributes
- 💭 v2 Search People inside Clients
- 💭 v2 Date of Birth
- 💭 v2 Status (Potential/New/Current/Former)

## People
- 💭 List
- 💭 Create
- 💭 Edit
- 💭 View
- 💭 Set address, phone, email

## Activity Logging
  - Build client-side
  - Validate server-side

## Jobs
- ✅ Create
- ✅ Technician Emoji
- ✅ Drag & drop nesting and un-nesting
- 🚧 Drag & drop reordering
- 💭 Appointment Scheduling
- 💭 Followup Scheduling
- 💭 Job Start Scheduling
- 💭 v2 Time tracking
- 💭 v2 Billing integration
- 💭 v2 Repeatable jobs
- 💭 v2 Recurring jobs
- ✅ Priority system
  - 💭 Sort by priority
- ✅ Assign to technician
  - 💭 Filter by assignment
- 💭 v2 If clicking would change status and new status would be filtered out, open popover instead

## Tasks
- ✅ Task deletion
  - ✅ Modal for deletion
  - 🚧 Deleted Task view
    - 💭 Don't allow deleting a deleted task
  - 💭 Undelete tasks
- 💭 Smart behavior when marking something as canceled or complete

## Logs
- 🚧 Correctly group by date

# Features for future versions

## Integrations
- 📋 Addigy (gem prototyped)
- 📋 M365 (gem in alpha)
- 📋 Zoom (gem prototyped)
- 💭 Front
- 💭 Google Workspace
- 💭 ThreatDown
- 💭 UniFi

### Scheduling & Appointments
- 💭 Appointments (Jobs) - basic
- 💭 Proper calendar
- 💭 Appointment Scheduling
- 💭 Call appointments by custom name
- 💭 v3 Customer scheduling

### Security & Authentication
- 💭 Basic Security (restricting database activity)
- 💭 Security Hardening
- 💭 Sign Out functionality

### v2 Communication & Integration
- ✅ Zoom integration (Phone)
- 💭 Zoom Meetings
- 💭 Send appointments via Zoom
- 💭 AI meeting summaries
- 💭 Non-Zoom Notes
- 💭 Email integration
- 💭 Gmail integration
- 💭 Boxes Attached to Emails

### Data Management
- ✅ File Organization
- 💭 Document Signing
- 💭 Devices management
- 💭 Inventory management

### v3 Internal and External Knowledgebases

### v3 Business Operations
- 💭 Invoices
- 💭 Accounting
- 💭 Timesheets
- 💭 Field Tickets

### v2 Services & Products
- 💭 All-you-can-eat MSP
- 💭 Hourly
- 💭 Insurance services
  - 💭 Product tracking
  - 💭 Policy number tracking
  - 💭 Vendor/Company tracking
- 💭 Assets Under Management
  - 💭 Advyzon integration
  - 💭 Product tracking
  - 💭 Policy number tracking

### v4 Forms & Documentation
- 💭 Milling Machine Check Out Form
- 💭 Truck Check Out Form
- 💭 Toolbox Safety Talk/Job Safety Checklist
- 💭 Employee Warning Notice
- 💭 Incident Investigation Report
- 💭 Document Signing
- 💭 Expense reimbursement

### Equipment & Resources
- 💭 Equipment management
- 💭 Operator assignment
- 💭 Supplies tracking
- 💭 Delays tracking
- 💭 Milling Details (Depth, Area, Sq Yards/Tons)
- 💭 Repairs tracking (nested categories)

### Multi-Tenant Features
- 💭 Company Settings
  - 💭 Custom Job terminology
  - 💭 Custom User terminology
- 💭 User Settings
  - 💭 Completed task sorting preferences

### Development & Automation
- 💭 Improve and Organize Documentation
- 💭 Improve Agile Workflow
- 💭 Automate AI
- 💭 Watch Github projects (claude-flow 2, claude-pm)

---

*Last updated: 2025-07-30*
