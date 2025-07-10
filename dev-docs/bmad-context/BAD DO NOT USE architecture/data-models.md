# bŏs Data Models

## Overview

This document describes the business entities and their relationships in the bŏs system. Understanding these models is crucial for working with the application's data layer.

## Quick Reference

**Core Entities:**
- **Client** - Companies/organizations being served
- **Job** - Work orders for clients
- **Task** - Individual work items within jobs
- **User** - System users (technicians, admins)
- **Device** - IT equipment owned by clients
- **Person** - Contacts at client organizations

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────<│     Job     │────<│    Task     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │
       │                    └──── assigned_to
       │                              │
       ├────<────────┐                ▼
       │             │         ┌─────────────┐
       ▼             │         │    User     │
┌─────────────┐      │         └─────────────┘
│   Device    │      │
└─────────────┘      │
                     │
       ┌─────────────┘
       ▼
┌─────────────┐
│   Person    │
└─────────────┘
```

## Core Models

### Client

**Purpose**: Represents companies or organizations that receive IT services.

**Attributes**:
| Field | Type | Description | Validations |
|-------|------|-------------|-------------|
| name | string | Company name | Required, unique |
| code | string | Short identifier (e.g., "ACME") | Required, unique, uppercase |
| address | text | Physical address | Optional |
| phone | string | Main contact number | Optional |
| email | string | Primary email | Email format |
| status | string | active/inactive/pending | Required |
| billing_rate | decimal | Hourly rate for services | Optional |
| notes | text | Internal notes | Optional |
| created_at | datetime | When record created | Auto |
| updated_at | datetime | Last modification | Auto |

**Associations**:
- has_many :jobs
- has_many :devices
- has_many :people
- has_many :tasks (through :jobs)
- has_many :activity_logs (as :trackable)

**Key Methods**:
```ruby
client.active?                    # Check if status is active
client.total_hours_this_month     # Sum of completed task hours
client.display_name              # "Acme Corp (ACME)"
client.archive!                  # Deactivate and archive jobs
```

### Job

**Purpose**: Represents a work order or project for a client.

**Attributes**:
| Field | Type | Description | Validations |
|-------|------|-------------|-------------|
| client_id | integer | Associated client | Required, FK |
| assigned_to_id | integer | User responsible | Required, FK |
| title | string | Job description | Required |
| description | text | Detailed information | Optional |
| status | string | scheduled/in_progress/completed/cancelled | Required |
| priority | string | low/medium/high/urgent | Default: medium |
| scheduled_for | datetime | When work scheduled | Optional |
| started_at | datetime | Actual start time | Optional |
| completed_at | datetime | Completion time | Optional |
| estimated_duration | integer | Hours estimated | Optional |
| actual_duration | decimal | Hours worked | Calculated |
| notes | text | Job notes | Optional |

**Associations**:
- belongs_to :client
- belongs_to :assigned_to (User)
- has_many :tasks
- has_many :activity_logs (as :trackable)

**Key Methods**:
```ruby
job.in_progress?                 # Check if started but not completed
job.overdue?                     # Past scheduled date
job.complete!                    # Mark job and tasks complete
job.total_hours                  # Sum of task hours
job.progress_percentage          # % of tasks completed
```

### Task

**Purpose**: Individual work items within a job.

**Attributes**:
| Field | Type | Description | Validations |
|-------|------|-------------|-------------|
| job_id | integer | Parent job | Required, FK |
| title | string | Task description | Required |
| description | text | Details | Optional |
| status | string | pending/in_progress/completed | Default: pending |
| position | integer | Order within job | Required |
| estimated_hours | decimal | Time estimate | Optional |
| actual_hours | decimal | Time spent | Optional |
| completed_at | datetime | When completed | Optional |
| completed_by_id | integer | User who completed | Optional |

**Associations**:
- belongs_to :job
- belongs_to :completed_by (User, optional)
- has_one :client (through :job)

**Key Methods**:
```ruby
task.complete!(user, hours)      # Mark complete with hours
task.reorder(new_position)       # Change position
task.overdue?                    # Past job scheduled date
```

### User

**Purpose**: System users including admins and technicians.

**Attributes**:
| Field | Type | Description | Validations |
|-------|------|-------------|-------------|
| email | string | Login email | Required, unique, email format |
| name | string | Full name | Required |
| password_digest | string | Bcrypt hash | Required |
| role | string | admin/technician/viewer | Required |
| active | boolean | Can login | Default: true |
| phone | string | Contact number | Optional |
| last_login_at | datetime | Last successful login | Optional |
| created_at | datetime | Account created | Auto |

**Associations**:
- has_many :assigned_jobs (Job, foreign_key: :assigned_to_id)
- has_many :completed_tasks (Task, foreign_key: :completed_by_id)
- has_many :activity_logs

**Key Methods**:
```ruby
user.admin?                      # Check if admin role
user.technician?                 # Check if technician
user.can_manage?(resource)       # Authorization check
user.current_jobs               # Active assigned jobs
```

### Device

**Purpose**: IT equipment belonging to clients.

**Attributes**:
| Field | Type | Description | Validations |
|-------|------|-------------|-------------|
| client_id | integer | Owner client | Required, FK |
| name | string | Device name/label | Required |
| device_type | string | computer/server/printer/network/other | Required |
| manufacturer | string | Brand/maker | Optional |
| model | string | Model number | Optional |
| serial_number | string | Serial/service tag | Optional |
| purchase_date | date | When acquired | Optional |
| warranty_expires | date | Warranty end | Optional |
| ip_address | string | Network address | Optional |
| mac_address | string | Hardware address | Optional |
| operating_system | string | OS version | Optional |
| notes | text | Additional info | Optional |
| status | string | active/inactive/retired | Default: active |

**Associations**:
- belongs_to :client
- has_many :activity_logs (as :trackable)

**Key Methods**:
```ruby
device.warranty_active?          # Check warranty status
device.warranty_days_remaining   # Days until expiry
device.full_description         # "Dell OptiPlex 7090 (ABC123)"
```

### Person

**Purpose**: Contacts at client organizations.

**Attributes**:
| Field | Type | Description | Validations |
|-------|------|-------------|-------------|
| client_id | integer | Associated client | Required, FK |
| name | string | Full name | Required |
| title | string | Job title | Optional |
| email | string | Email address | Email format |
| phone | string | Direct number | Optional |
| mobile | string | Cell phone | Optional |
| is_primary | boolean | Main contact | Default: false |
| receives_notifications | boolean | Send updates | Default: true |
| notes | text | Additional info | Optional |
| active | boolean | Still with company | Default: true |

**Associations**:
- belongs_to :client
- has_many :activity_logs (as :trackable)

**Key Methods**:
```ruby
person.display_name             # "John Smith (CTO)"
person.contact_methods          # Array of email/phone
person.make_primary!            # Set as primary contact
```

## Supporting Models

### ActivityLog

**Purpose**: Audit trail of system changes.

**Attributes**:
| Field | Type | Description |
|-------|------|-------------|
| user_id | integer | Who made change |
| action | string | created/updated/deleted |
| trackable_type | string | Model class |
| trackable_id | integer | Record ID |
| details | json | Change details |
| created_at | datetime | When occurred |

**Associations**:
- belongs_to :user
- belongs_to :trackable (polymorphic)

### UniqueID

**Purpose**: Generate unique identifiers for various purposes.

**Attributes**:
| Field | Type | Description |
|-------|------|-------------|
| generated_id | string | The unique ID |
| memo | string | Optional description |
| active | boolean | Is ID in use |
| fx_checksum | integer | Checksum digit |

**Key Methods**:
```ruby
UniqueID.generate(length: 8)     # Generate new ID
UniqueID.validate(id)           # Check if valid format
```

## Data Validations

### Business Rules

1. **Client Code Uniqueness**: Must be unique and uppercase
2. **Job Assignment**: Jobs must have an assigned technician
3. **Task Ordering**: Tasks maintain position within job
4. **Email Formats**: All emails validated against RFC standards
5. **Status Transitions**: Some status changes have prerequisites

### Database Constraints

```ruby
# Foreign key constraints (Rails 7+ adds automatically)
add_foreign_key :jobs, :clients
add_foreign_key :jobs, :users, column: :assigned_to_id
add_foreign_key :tasks, :jobs
add_foreign_key :devices, :clients
add_foreign_key :people, :clients

# Unique indexes
add_index :clients, :code, unique: true
add_index :users, :email, unique: true
add_index :clients, :name, unique: true

# Composite indexes for performance
add_index :jobs, [:client_id, :status]
add_index :tasks, [:job_id, :position]
```

## Common Queries

### Active Records
```ruby
# Active clients with recent activity
Client.active
      .joins(:jobs)
      .where(jobs: { created_at: 30.days.ago.. })
      .distinct

# Technician workload
User.technicians
    .joins(:assigned_jobs)
    .where(jobs: { status: ["scheduled", "in_progress"] })
    .group("users.id")
    .count

# Overdue jobs
Job.where(status: "scheduled")
   .where("scheduled_for < ?", Time.current)
   .includes(:client, :assigned_to)
```

### Reporting Queries
```ruby
# Client activity summary
Client.select(
  "clients.*",
  "COUNT(DISTINCT jobs.id) as job_count",
  "SUM(tasks.actual_hours) as total_hours"
)
.joins(jobs: :tasks)
.where(tasks: { status: "completed" })
.group("clients.id")

# Device warranty report
Device.active
      .where("warranty_expires BETWEEN ? AND ?", 
             Date.current, 
             30.days.from_now)
      .includes(:client)
      .order(:warranty_expires)
```

## State Machines

### Job Status Flow
```
scheduled → in_progress → completed
    ↓           ↓            ↑
    └───────→ cancelled ←────┘
```

### Task Status Flow
```
pending → in_progress → completed
```

## Data Integrity

### Soft Deletes
Most models use status fields rather than deletion:
- Clients: Set status to "inactive"
- Jobs: Set status to "cancelled"
- Devices: Set status to "retired"

### Cascading Updates
- Deleting a client archives all associated jobs
- Completing a job marks all tasks complete
- Deactivating a user unassigns their pending jobs

### Audit Trail
All models include the Trackable concern which logs:
- Creation with initial attributes
- Updates with changed fields
- Deletion (soft delete) with final state

## Performance Considerations

1. **Eager Loading**: Always use `includes` for associations
2. **Counter Caches**: Add for frequently counted associations
3. **Indexes**: Ensure foreign keys and search fields are indexed
4. **Scopes**: Use database-level filtering, not Ruby
5. **Batch Operations**: Use `find_each` for large datasets

## Data Import/Export

### CSV Import Format
```csv
# Clients
name,code,email,phone,status
"Acme Corporation",ACME,contact@acme.com,555-1234,active

# Devices  
client_code,name,type,manufacturer,model,serial
ACME,"Server 1",server,Dell,"PowerEdge R740",ABC123
```

### JSON API Format
```json
{
  "client": {
    "name": "Acme Corporation",
    "code": "ACME",
    "email": "contact@acme.com",
    "status": "active",
    "jobs": [
      {
        "title": "Monthly Maintenance",
        "status": "scheduled",
        "scheduled_for": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```