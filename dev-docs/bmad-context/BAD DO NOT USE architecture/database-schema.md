# bŏs Database Schema

## Overview

This document provides a comprehensive overview of the PostgreSQL database schema for bŏs. The schema follows Rails conventions with foreign key constraints, appropriate indexes, and a clear separation between business entities and infrastructure tables.

**Important**: JSONB is currently only used in the `activity_logs.metadata` field. Do not add additional JSONB fields without manual approval.

## Schema Version

Current version: 2025_06_24_121535

## Business Tables

### clients
Stores client/customer organizations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| name | string | | Client name |
| client_type | string | | Type classification |
| name_normalized | string | UNIQUE INDEX | Normalized name for uniqueness |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_clients_on_name_normalized` (UNIQUE)

### jobs
Work orders or service requests for clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| client_id | bigint | FK, NOT NULL | Associated client |
| title | string | | Job title |
| status | integer | | Job status code |
| priority | integer | | Priority level |
| due_date | datetime | | Legacy due date/time |
| due_on | date | | Due date (new) |
| due_time | time | | Due time (new) |
| start_on_date | datetime | | Legacy start date/time |
| start_on | date | | Start date (new) |
| start_time | time | | Start time (new) |
| created_by_id | bigint | FK, NOT NULL | User who created |
| description | text | | Job details |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_jobs_on_client_id`
- `index_jobs_on_created_by_id`

**Foreign Keys:**
- `client_id` → clients.id
- `created_by_id` → users.id

### tasks
Individual work items within jobs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| job_id | bigint | FK, NOT NULL | Parent job |
| title | string | | Task description |
| status | integer | | Task status |
| position | integer | | Order within job |
| assigned_to_id | bigint | FK | Assigned user |
| parent_id | bigint | FK | Parent task (for subtasks) |
| subtasks_count | integer | DEFAULT: 0 | Number of subtasks |
| reordered_at | datetime | DEFAULT: CURRENT_TIMESTAMP | Last reorder time |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_tasks_on_assigned_to_id`
- `index_tasks_on_job_id`
- `index_tasks_on_parent_id`
- `index_tasks_on_reordered_at`

**Foreign Keys:**
- `job_id` → jobs.id
- `assigned_to_id` → users.id
- `parent_id` → tasks.id

### users
System users (admins, technicians, viewers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| name | string | | Full name |
| email | string | | Login email |
| role | integer | | User role |
| password_digest | string | | Bcrypt password hash |
| resort_tasks_on_status_change | boolean | DEFAULT: true, NOT NULL | Auto-resort preference |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

### people
Contacts associated with clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| client_id | bigint | FK, NOT NULL | Associated client |
| name | string | | Person's name |
| notes | text | | Additional info |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_people_on_client_id`

**Foreign Keys:**
- `client_id` → clients.id

### devices
IT equipment belonging to clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| client_id | bigint | FK, NOT NULL | Owner client |
| person_id | bigint | FK | Assigned person |
| name | string | | Device name |
| model | string | | Device model |
| serial_number | string | | Serial number |
| location | string | | Physical location |
| notes | text | | Additional info |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_devices_on_client_id_and_name` (UNIQUE)
- `index_devices_on_client_id`
- `index_devices_on_person_id`

**Foreign Keys:**
- `client_id` → clients.id
- `person_id` → people.id

### contact_methods
Phone numbers, emails, etc. for people.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| person_id | bigint | FK, NOT NULL | Associated person |
| value | string | | Raw value |
| formatted_value | string | | Display format |
| contact_type | integer | | Type of contact |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_contact_methods_on_person_id`

**Foreign Keys:**
- `person_id` → people.id

### notes
Polymorphic notes for any model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| notable_type | string | NOT NULL | Model type |
| notable_id | bigint | NOT NULL | Model ID |
| user_id | bigint | FK, NOT NULL | Author |
| content | text | | Note content |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_notes_on_notable` (type, id)
- `index_notes_on_user_id`

**Foreign Keys:**
- `user_id` → users.id

## Audit & Tracking

### activity_logs
Comprehensive audit trail for all changes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| user_id | bigint | FK, NOT NULL | Acting user |
| action | string | | Action performed |
| loggable_type | string | NOT NULL | Model type |
| loggable_id | bigint | NOT NULL | Model ID |
| metadata | jsonb | | Additional data (ONLY JSONB FIELD) |
| client_id | bigint | FK | Related client |
| job_id | bigint | FK | Related job |
| created_at | datetime | NOT NULL | When occurred |
| updated_at | datetime | NOT NULL | Last update |

**IMPORTANT**: This is the ONLY table using JSONB. The `metadata` field stores flexible activity details.

**Indexes:**
- `index_activity_logs_on_client_id_and_created_at`
- `index_activity_logs_on_client_id_and_job_id`
- `index_activity_logs_on_client_id`
- `index_activity_logs_on_job_id`
- `index_activity_logs_on_loggable` (type, id)
- `index_activity_logs_on_user_id`

**Foreign Keys:**
- `user_id` → users.id
- `client_id` → clients.id
- `job_id` → jobs.id

### unique_ids
Configurable unique ID generation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| prefix | string | | ID prefix |
| suffix | string | | ID suffix |
| minimum_length | integer | DEFAULT: 5 | Min ID length |
| use_checksum | boolean | DEFAULT: true | Add checksum |
| generated_id | string | NOT NULL, UNIQUE | The generated ID |
| identifiable_type | string | | Associated model type |
| identifiable_id | bigint | | Associated model ID |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_unique_ids_on_generated_id` (UNIQUE)
- `index_unique_ids_on_identifiable` (type, id)

## Scheduling

### scheduled_date_times
Flexible scheduling for any model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| schedulable_type | string | NOT NULL | Model type |
| schedulable_id | bigint | NOT NULL | Model ID |
| scheduled_type | string | NOT NULL | Schedule type |
| scheduled_date | date | NOT NULL | Date |
| scheduled_time | time | | Time (optional) |
| notes | text | | Schedule notes |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_scheduled_date_times_on_schedulable_and_type`
- `index_scheduled_date_times_on_schedulable` (type, id)
- `index_scheduled_date_times_on_scheduled_date`
- `index_scheduled_date_times_on_scheduled_type`

### scheduled_date_time_users
User assignments for schedules.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| scheduled_date_time_id | bigint | FK, NOT NULL | Schedule |
| user_id | bigint | FK, NOT NULL | Assigned user |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_scheduled_date_time_users_unique` (UNIQUE on scheduled_date_time_id, user_id)
- `index_scheduled_date_time_users_on_scheduled_date_time_id`
- `index_scheduled_date_time_users_on_user_id`

**Foreign Keys:**
- `scheduled_date_time_id` → scheduled_date_times.id
- `user_id` → users.id

## Join Tables

### job_assignments
Many-to-many between jobs and users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| job_id | bigint | FK, NOT NULL | Job |
| user_id | bigint | FK, NOT NULL | User |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_job_assignments_on_job_id`
- `index_job_assignments_on_user_id`

**Foreign Keys:**
- `job_id` → jobs.id
- `user_id` → users.id

### job_people
Many-to-many between jobs and people.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | bigint | PK, NOT NULL | Primary key |
| job_id | bigint | FK, NOT NULL | Job |
| person_id | bigint | FK, NOT NULL | Person |
| created_at | datetime | NOT NULL | Record creation |
| updated_at | datetime | NOT NULL | Last update |

**Indexes:**
- `index_job_people_on_job_id`
- `index_job_people_on_person_id`

**Foreign Keys:**
- `job_id` → jobs.id
- `person_id` → people.id

## Infrastructure Tables

### Solid Queue Tables
Background job processing (managed by Rails).

- `solid_queue_jobs` - Job definitions
- `solid_queue_scheduled_executions` - Scheduled jobs
- `solid_queue_ready_executions` - Ready to run
- `solid_queue_claimed_executions` - Currently running
- `solid_queue_blocked_executions` - Blocked by concurrency
- `solid_queue_failed_executions` - Failed jobs
- `solid_queue_pauses` - Queue pauses
- `solid_queue_processes` - Worker processes
- `solid_queue_semaphores` - Concurrency control
- `solid_queue_recurring_tasks` - Recurring job definitions
- `solid_queue_recurring_executions` - Recurring job runs

### Solid Cache Tables
Caching infrastructure (managed by Rails).

- `solid_cache_entries` - Cache storage

### Solid Cable Tables
WebSocket infrastructure (managed by Rails).

- `solid_cable_messages` - Cable messages

## Database Conventions

### Naming
- Tables: plural, snake_case (e.g., `job_assignments`)
- Columns: singular, snake_case (e.g., `client_id`)
- Indexes: `index_[table]_on_[column(s)]`
- Foreign keys: `[model]_id` references `[models].id`

### Types
- Primary keys: `bigint` (64-bit integers)
- Foreign keys: `bigint` with NOT NULL constraint
- Strings: `string` (VARCHAR)
- Text: `text` for long content
- Timestamps: `datetime` for Rails timestamps
- Booleans: `boolean` with explicit defaults
- JSON: `jsonb` ONLY in activity_logs.metadata

### Timestamps
All business tables include:
- `created_at` - Record creation time
- `updated_at` - Last modification time

### Constraints
- Foreign keys enforced at database level
- Unique constraints where business rules require
- NOT NULL on required relationships
- Default values for counters and flags

## Migration Guidelines

1. **JSONB Usage**: Do not add JSONB fields without explicit approval
2. **Indexes**: Add indexes for all foreign keys and lookup fields
3. **Defaults**: Specify defaults for boolean and counter fields
4. **Constraints**: Use database-level constraints when possible
5. **Rollback**: Ensure migrations are reversible

## Performance Considerations

1. **Indexes**: All foreign keys are indexed
2. **Composite Indexes**: Added for common query patterns
3. **Counter Caches**: Consider for association counts
4. **Partitioning**: May be needed for activity_logs at scale
5. **Vacuum**: Regular maintenance for PostgreSQL

## Data Integrity

1. **Foreign Keys**: Enforced at database level
2. **Transactions**: Use for multi-table operations
3. **Validations**: Rails validations supplement DB constraints
4. **Cascading**: Carefully configured for related records
5. **Audit Trail**: All changes logged to activity_logs