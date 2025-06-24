# bŏs Unified Project Structure

## Overview

This document maps out the complete project structure of bŏs, explaining where different types of code belong and the purpose of each directory. AI agents must follow these conventions when adding new files.

## Quick Reference

**Key Locations:**
- Components: `app/views/components/`
- Stimulus: `app/javascript/controllers/`
- Styles: `app/assets/stylesheets/`
- Tests: `test/playwright/`
- Models: `app/models/`
- Controllers: `app/controllers/`

## Root Directory Structure

```
bos/
├── app/                    # Main application code
├── bin/                    # Rails executables
├── config/                 # Configuration files
├── db/                     # Database files
├── docs/                   # Project documentation
├── lib/                    # Custom libraries and tasks
├── log/                    # Application logs (gitignored)
├── public/                 # Static files served directly
├── storage/                # Active Storage files (gitignored)
├── test/                   # Test files
├── tmp/                    # Temporary files (gitignored)
├── vendor/                 # Third-party code
├── .bmad-core/            # BMAD configuration
├── web-bundles/           # BMAD web bundles
├── Dockerfile             # Docker configuration
├── Gemfile                # Ruby dependencies
├── package.json           # JavaScript dependencies
└── Procfile.dev          # Development server config
```

## Application Directory (/app)

### /app/assets
```
app/assets/
├── config/
│   └── manifest.js        # Asset pipeline manifest
├── images/                # Static images
└── stylesheets/          # SCSS files (ITCSS structure)
    ├── settings/         # Design tokens
    ├── tools/           # Mixins and functions
    ├── generic/         # Reset/normalize
    ├── elements/        # HTML elements
    ├── objects/         # Layout patterns
    ├── components/      # Component styles
    ├── utilities/       # Helper classes
    └── application.scss # Main stylesheet
```

### /app/controllers
```
app/controllers/
├── application_controller.rb    # Base controller
├── clients_controller.rb       # Client CRUD
├── jobs_controller.rb         # Job management
├── tasks_controller.rb        # Task management
├── devices_controller.rb      # Device tracking
├── people_controller.rb       # People at clients
├── sessions_controller.rb     # Authentication
└── concerns/                  # Shared controller logic
```

### /app/javascript
```
app/javascript/
├── controllers/               # Stimulus controllers
│   ├── application.js        # Base Stimulus setup
│   ├── hello_controller.js   # Example controller
│   ├── dropdown_controller.js # Dropdown behavior
│   └── index.js             # Auto-registration
└── application.js            # Main JS entry point
```

### /app/models
```
app/models/
├── application_record.rb      # Base model
├── client.rb                 # Client model
├── job.rb                   # Job model
├── task.rb                  # Task model
├── device.rb                # Device model
├── person.rb                # Person model
├── user.rb                  # User authentication
├── activity_log.rb          # Audit trail
└── concerns/                # Shared model logic
```

### /app/views 🚨 CRITICAL
```
app/views/
├── components/              # Phlex components (NOT ERB!)
│   ├── application_component.rb
│   ├── clients/
│   │   ├── index_component.rb
│   │   ├── show_component.rb
│   │   └── form_component.rb
│   ├── forms/              # Reusable form components
│   ├── layouts/            # Layout components
│   ├── tables/             # Table components
│   └── ui/                 # General UI components
└── layouts/                # Legacy layouts (minimize use)
```

**IMPORTANT**: Never create ERB files in views. Always use Phlex components.

## Configuration Directory (/config)

```
config/
├── application.rb          # Rails application config
├── boot.rb                # Boot configuration
├── cable.yml              # Action Cable config
├── credentials.yml.enc    # Encrypted credentials
├── database.yml           # Database configuration
├── deploy.yml             # Kamal deployment config
├── environment.rb         # Environment setup
├── environments/          # Environment-specific config
│   ├── development.rb
│   ├── production.rb
│   └── test.rb
├── importmap.rb          # JavaScript import maps
├── locales/              # Internationalization
├── puma.rb              # Web server config
├── routes.rb            # URL routing
└── storage.yml          # Active Storage config
```

## Database Directory (/db)

```
db/
├── migrate/              # Database migrations
│   ├── 001_create_clients.rb
│   ├── 002_create_jobs.rb
│   └── ...
├── schema.rb            # Current database schema
└── seeds.rb            # Seed data for development
```

## Test Directory (/test)

```
test/
├── fixtures/            # Test data
│   ├── clients.yml
│   ├── jobs.yml
│   └── users.yml
├── playwright/          # Playwright tests (primary)
│   ├── test_helper.rb
│   ├── clients_test.rb
│   ├── jobs_test.rb
│   └── system_test.rb
├── models/             # Model unit tests
├── controllers/        # Controller tests
└── test_helper.rb      # Test configuration
```

## Documentation Directory (/docs)

```
docs/
├── index.md                    # Documentation home
├── prd.md                     # Product requirements
└── architecture/              # Technical documentation
    ├── index.md
    ├── coding-standards.md
    ├── tech-stack.md
    ├── unified-project-structure.md
    ├── frontend-architecture.md
    ├── backend-architecture.md
    └── ...
```

## File Naming Conventions

### Ruby Files
```ruby
# Models - singular
app/models/client.rb          # class Client

# Controllers - plural
app/controllers/clients_controller.rb  # class ClientsController

# Components - descriptive with suffix
app/views/components/client_form_component.rb  # class ClientFormComponent
app/views/components/clients/index_component.rb # module Clients::IndexComponent
```

### JavaScript Files
```javascript
// Stimulus controllers - snake_case with _controller suffix
app/javascript/controllers/client_filter_controller.js

// Other JS files - kebab-case
app/javascript/utils/date-formatter.js
```

### SCSS Files
```scss
// Components - match component name
app/assets/stylesheets/components/_button.scss
app/assets/stylesheets/components/_job-card.scss

// Use underscore prefix for partials
app/assets/stylesheets/settings/_colors.scss
```

### Test Files
```ruby
# Match the file being tested with _test suffix
test/playwright/clients_test.rb  # Tests ClientsController
test/models/client_test.rb      # Tests Client model
```

## Where to Put New Code

### New Model
1. Create model: `app/models/thing.rb`
2. Create migration: `rails g migration CreateThings`
3. Add fixtures: `test/fixtures/things.yml`
4. Add tests: `test/models/thing_test.rb`

### New Feature (Full Stack)
1. Model: `app/models/feature.rb`
2. Controller: `app/controllers/features_controller.rb`
3. Components: `app/views/components/features/`
4. Styles: `app/assets/stylesheets/components/_feature.scss`
5. JavaScript: `app/javascript/controllers/feature_controller.js`
6. Tests: `test/playwright/features_test.rb`
7. Routes: Add to `config/routes.rb`

### New UI Component
1. Component: `app/views/components/ui/new_widget_component.rb`
2. Styles: `app/assets/stylesheets/components/_new-widget.scss`
3. Stimulus: `app/javascript/controllers/new_widget_controller.js` (if needed)
4. Import styles in `application.scss`

### New Stimulus Controller
1. Create: `app/javascript/controllers/thing_controller.js`
2. Auto-registered via `app/javascript/controllers/index.js`
3. Use in Phlex: `data: { controller: "thing" }`

## Import Order and Dependencies

### Ruby/Rails
```ruby
# Standard library first
require "csv"
require "json"

# Gems next
require "phlex"

# Rails components
require "active_support/concern"

# Application files last
require_relative "application_component"
```

### SCSS Imports
```scss
// application.scss import order (ITCSS)
@import "settings/variables";
@import "tools/mixins";
@import "generic/reset";
@import "elements/body";
@import "objects/container";
@import "components/button";
@import "utilities/spacing";
```

### JavaScript Imports
```javascript
// Stimulus controller imports
import { Controller } from "@hotwired/stimulus"
import { debounce } from "../utils/debounce"

export default class extends Controller {
  // ...
}
```

## Special Directories

### BMAD Integration
```
.bmad-core/           # BMAD configuration (don't modify)
├── agents/
├── tasks/
├── templates/
└── workflows/

web-bundles/          # BMAD web resources
├── agents/
├── expansion-packs/
└── teams/
```

### Temporary and Generated Files
```
# These are gitignored - don't commit
tmp/                  # Temporary files
├── cache/           # Cache files
├── pids/            # Process IDs
└── storage/         # Temporary storage

log/                 # Log files
├── development.log
└── test.log

public/assets/       # Compiled assets (generated)
```

## Common Mistakes to Avoid

1. ❌ Creating files in `app/views/` that aren't Phlex components
2. ❌ Putting business logic in controllers (use models/services)
3. ❌ Creating global JavaScript files (use Stimulus controllers)
4. ❌ Adding styles outside the ITCSS structure
5. ❌ Forgetting to add new components to style imports
6. ❌ Creating helpers instead of component methods
7. ❌ Using `lib/` for application code (use `app/`)

## File Location Quick Reference

| File Type | Location | Example |
|-----------|----------|---------|
| Phlex Component | `app/views/components/` | `client_card_component.rb` |
| Stimulus Controller | `app/javascript/controllers/` | `dropdown_controller.js` |
| Model | `app/models/` | `client.rb` |
| Controller | `app/controllers/` | `clients_controller.rb` |
| SCSS Component | `app/assets/stylesheets/components/` | `_button.scss` |
| Playwright Test | `test/playwright/` | `clients_test.rb` |
| Migration | `db/migrate/` | `001_create_clients.rb` |
| Route Config | `config/routes.rb` | N/A |

Remember: When in doubt, look for similar existing files and follow their patterns.