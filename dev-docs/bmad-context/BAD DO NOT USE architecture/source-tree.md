# bŏs Source Tree

## Overview

This document provides a comprehensive map of the bŏs project structure. The application follows Rails 8 conventions with some key architectural decisions:
- **Phlex components** instead of ERB templates
- **Stimulus.js** for JavaScript interactions
- **SCSS with ITCSS** architecture for styling
- **PostgreSQL** as the primary database
- **Playwright** for integration testing

## Top-Level Directory Structure

```
bos/
├── app/              # Application code (MVC + components)
├── config/           # Rails configuration files
├── db/               # Database migrations and schemas
├── lib/              # Custom libraries and tasks
├── public/           # Static files served directly
├── storage/          # Active Storage files
├── test/             # Test suite (unit + Playwright)
├── tmp/              # Temporary files
├── vendor/           # Third-party code
├── .ai/              # AI agent artifacts
├── .bmad-core/       # BMAD framework configuration
├── docs/             # Project documentation
│   ├── architecture/ # Technical documentation
│   ├── prd/          # Product requirements
│   └── stories/      # Development stories
└── [config files]    # .ruby-version, Gemfile, etc.
```

## App Directory Structure

### Models (`app/models/`)
Core business entities with ActiveRecord:

```
app/models/
├── application_record.rb       # Base model class
├── client.rb                  # Client/customer entity
├── device.rb                  # Hardware/equipment
├── job.rb                     # Work orders/tickets
├── job_assignment.rb          # Job-technician mapping
├── job_person.rb              # Job-person associations
├── note.rb                    # Comments/updates
├── person.rb                  # Contact/staff member
├── scheduled_date_time.rb     # Scheduling entity
├── task.rb                    # Job subtasks
├── user.rb                    # System users
└── concerns/                  # Shared model behaviors
    ├── fx_checksum.rb         # Checksum validation
    ├── has_unique_id.rb       # Custom ID generation
    ├── loggable.rb            # Activity logging
    ├── polymorphic_uuid_support.rb
    ├── status_convertible.rb  # Status helpers
    └── uuid_associations.rb   # UUID foreign keys
```

**Key Relationships:**
- Client has_many Jobs, Devices, People
- Job has_many Tasks, Notes, Assignments
- User has_many JobAssignments
- Task belongs_to Job (with parent/child support)

### Controllers (`app/controllers/`)
Request handling and routing:

```
app/controllers/
├── application_controller.rb   # Base controller
├── clients_controller.rb       # Client CRUD
├── devices_controller.rb       # Device management
├── jobs_controller.rb          # Job operations
├── people_controller.rb        # Contact management
├── sessions_controller.rb      # Authentication
├── tasks_controller.rb         # Task CRUD
├── users_controller.rb         # User management
├── admin/                      # Admin namespace
│   └── automation_dashboards_controller.rb
├── api/v1/                     # API endpoints
│   ├── base_controller.rb
│   ├── auth/
│   │   └── sessions_controller.rb
│   ├── health_controller.rb
│   ├── jobs_controller.rb
│   └── websocket_controller.rb
└── concerns/                   # Shared behaviors
    ├── api_csrf_protection.rb
    ├── api_error_handler.rb
    ├── authenticatable.rb
    ├── etag_support.rb
    ├── paginatable.rb
    └── uuid_findable.rb
```

### Views - Phlex Components (`app/views/`)
**CRITICAL**: All views use Phlex components, NOT ERB:

```
app/views/
├── base.rb                    # Base view class
├── layouts/
│   └── application_layout.rb  # Main layout
├── components/                # Reusable UI components
│   ├── base.rb               # Base component class
│   ├── ui.rb                 # UI module
│   ├── modal.rb              # Modal base
│   ├── dropdown_component.rb # Dropdown functionality
│   ├── ui/                   # Core UI elements
│   │   ├── button_component.rb
│   │   ├── badge_component.rb
│   │   ├── form_input_component.rb
│   │   └── [scss files]
│   ├── forms/                # Form components
│   │   ├── form_container_component.rb
│   │   ├── form_actions_component.rb
│   │   └── form_errors_component.rb
│   ├── header/               # Header components
│   │   ├── header_component.rb
│   │   └── [js controllers]
│   ├── sidebar/              # Navigation
│   │   ├── sidebar_component.rb
│   │   └── sidebar_controller.js
│   ├── jobs/                 # Job-specific UI
│   │   ├── job_card_component.rb
│   │   ├── schedule_popover_component.rb
│   │   └── [scss files]
│   └── [other domains]/      # Organized by feature
├── clients/                  # Client views
│   ├── index_view.rb
│   ├── show_view.rb
│   ├── edit_view.rb
│   └── new_view.rb
└── [other resources]/        # Similar structure
```

### JavaScript (`app/javascript/`)
Stimulus controllers and utilities:

```
app/javascript/
├── application.js             # Main entry point
├── controllers/               # Stimulus controllers
│   ├── application.js         # Base controller
│   ├── dropdown_controller.js # Dropdown behavior
│   ├── job_controller.js      # Job interactions
│   ├── popover_controller.js  # Popover management
│   ├── search_controller.js   # Search functionality
│   ├── sidebar_controller.js  # Sidebar toggle
│   ├── sortable_controller.js # Drag-and-drop
│   └── [30+ controllers]
└── bos/                      # Utility modules
    ├── api_helpers.js        # API utilities
    ├── constants.js          # App constants
    ├── error_handler.js      # Error management
    ├── job_drag_handler.js   # Drag-drop logic
    ├── safe_dom.js           # DOM utilities
    ├── task_renderer.js      # Task rendering
    └── [other utilities]
```

### Services (`app/services/`)
Business logic extraction:

```
app/services/
├── claude_automation_service.rb  # AI automation
├── job_creation_service.rb       # Job factory
├── job_query_service.rb          # Complex queries
├── job_update_service.rb         # Update logic
├── jwt_service.rb                # Token handling
├── sidebar_stats_service.rb      # Stats calculation
├── task_sorting_service.rb       # Task ordering
└── view_data_service.rb          # View helpers
```

### Stylesheets (`app/assets/stylesheets/`)
ITCSS architecture with dark theme:

```
app/assets/stylesheets/
├── application.scss          # Main manifest
├── settings/                 # Design tokens
│   ├── _variables.scss      # CSS variables
│   ├── _tokens.scss         # Design system
│   └── _breakpoints.scss
├── tools/                    # Mixins/functions
│   ├── _mixins.scss
│   └── _functions.scss
├── generic/                  # Reset/normalize
│   ├── _reset.scss
│   └── _base.scss
├── elements/                 # HTML elements
│   └── _headings.scss
├── objects/                  # Layout patterns
│   └── _layout.scss
├── components/               # UI components
│   ├── _button.scss
│   ├── _dropdown.scss
│   ├── _modal.scss
│   └── [component styles]
└── utilities/                # Helper classes
    └── _helpers.scss
```

## Configuration (`config/`)

```
config/
├── application.rb           # Rails app config
├── routes.rb               # URL routing
├── database.yml            # DB configuration
├── importmap.rb            # JS imports
├── deploy.yml              # Kamal deployment
├── environments/           # Environment configs
│   ├── development.rb
│   ├── production.rb
│   └── test.rb
├── initializers/           # Boot-time config
│   ├── cors.rb
│   ├── rack_attack.rb     # Rate limiting
│   └── [other initializers]
└── locales/               # i18n files
    └── en.yml
```

## Database (`db/`)

```
db/
├── migrate/               # Migration files
│   └── [timestamp]_*.rb   # Schema changes
├── schema.rb             # Current schema
├── seeds.rb              # Seed data
├── cable_schema.rb       # ActionCable
├── cache_schema.rb       # Solid Cache
└── queue_schema.rb       # Solid Queue
```

## Tests (`test/`)

```
test/
├── playwright/           # Integration tests
│   ├── jobs_playwright_test.rb
│   ├── dropdown_positioning_playwright_test.rb
│   └── [feature tests]
├── controllers/          # Controller tests
├── models/              # Model tests
├── services/            # Service tests
├── integration/         # API tests
├── fixtures/            # Test data
└── test_helper.rb       # Test configuration
```

## Key Patterns & Conventions

### File Naming
- **Models**: Singular (`user.rb`, `job.rb`)
- **Controllers**: Plural + `_controller.rb` (`jobs_controller.rb`)
- **Views**: Resource path + `_view.rb` (`jobs/show_view.rb`)
- **Components**: Domain + `_component.rb` (`job_card_component.rb`)
- **Stimulus**: Feature + `_controller.js` (`dropdown_controller.js`)
- **Services**: Action + `_service.rb` (`job_creation_service.rb`)

### Component Organization
```
app/components/feature/
├── feature_component.rb      # Phlex component
├── feature_controller.js     # Stimulus controller
└── feature.scss             # Styles
```

### View Hierarchy
```
ApplicationComponent
├── Base (view base class)
├── UI::ButtonComponent
├── UI::FormInputComponent
├── Jobs::JobCardComponent
└── [Domain]::ComponentName
```

### Stimulus Data Attributes
```html
<!-- Controller -->
<div data-controller="dropdown">
  <!-- Targets -->
  <button data-dropdown-target="button">
  <div data-dropdown-target="menu">
  <!-- Actions -->
  <button data-action="click->dropdown#toggle">
  <!-- Values -->
  <div data-dropdown-positioning-value="fixed">
```

## Import Patterns

### Ruby/Rails
```ruby
# Models
class Job < ApplicationRecord
  include Loggable
  include StatusConvertible
  
# Controllers  
class JobsController < ApplicationController
  include Paginatable
  
# Services
class JobCreationService
  def self.call(params)
```

### JavaScript
```javascript
// Stimulus controller
import { Controller } from "@hotwired/stimulus"

// Utilities
import { safeDom } from "../bos/safe_dom"
import { API_ENDPOINTS } from "../bos/constants"
```

### Phlex Components
```ruby
module Components
  class JobCardComponent < ApplicationComponent
    def initialize(job:, current_user:)
      @job = job
      @current_user = current_user
    end
    
    def view_template
      div(class: "job-card-inline") do
        # Component content
      end
    end
  end
end
```

## Critical Notes

1. **NO ERB Templates** - All views MUST use Phlex components
2. **Dark Theme Only** - Use CSS variables from `_variables.scss`
3. **Stimulus Only** - No jQuery or vanilla JS DOM manipulation
4. **Asset Compilation** - Run after ANY JS/CSS changes:
   ```bash
   rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json
   ```
5. **Git Commits** - Always sign with `—CC`
6. **Testing** - Write Playwright tests for UI changes

## Common File Locations

| Feature | Location |
|---------|----------|
| New model | `app/models/thing.rb` |
| New controller | `app/controllers/things_controller.rb` |
| New view | `app/views/things/index_view.rb` |
| New component | `app/components/things/thing_card_component.rb` |
| New JS behavior | `app/javascript/controllers/thing_controller.js` |
| New service | `app/services/thing_creation_service.rb` |
| New styles | `app/assets/stylesheets/components/_thing.scss` |
| New test | `test/playwright/things_playwright_test.rb` |

## Development Workflow

1. Check existing patterns in similar files
2. Use Phlex components for views
3. Write Stimulus controller for interactions
4. Follow SCSS/ITCSS structure
5. Write Playwright tests
6. Run Rubocop before committing
7. Rebuild assets if JS/CSS changed
8. Commit with proper message format