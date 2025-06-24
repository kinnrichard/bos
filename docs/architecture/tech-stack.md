# bŏs Technology Stack

## Overview

This document provides a comprehensive reference of all technologies, versions, and dependencies used in the bŏs project. AI agents should consult this before introducing new dependencies or making architectural decisions.

## Quick Reference

**Core Stack:**
- Ruby 3.4.4 + Rails 8.0.2
- PostgreSQL database
- Phlex for components (NOT ERB)
- Stimulus.js for JavaScript
- SCSS with ITCSS architecture
- Playwright for testing

## Ruby & Rails

### Core Versions
```ruby
# .ruby-version
3.4.4

# Gemfile
gem "rails", "~> 8.0.2"
```

### Key Rails Components
- **Asset Pipeline**: Propshaft (NOT Sprockets)
- **JavaScript**: Import maps (NOT Webpacker)
- **Cache/Queue**: Solid Cache, Solid Queue
- **Cable**: Solid Cable adapter
- **Active Storage**: Configured for file uploads

## Database

### PostgreSQL
```ruby
# Primary database
gem "pg", "~> 1.1"

# Version: PostgreSQL 14+ recommended
# Character encoding: UTF8
# Collation: en_US.UTF-8
```

### Database Extensions
- UUID support enabled
- Full-text search capabilities
- JSON/JSONB field support

## Frontend Technologies

### View Layer - Phlex (CRITICAL)
```ruby
gem "phlex-rails", "~> 2.0.0"
```

**Important**: We use Phlex components exclusively for views
- NO ERB templates for new features
- Components live in `app/views/components/`
- Inherits from `ApplicationComponent`

### JavaScript Framework - Stimulus
```ruby
gem "stimulus-rails"
```

**Stimulus Controllers**:
- Location: `app/javascript/controllers/`
- Naming: `thing_controller.js` → `data-controller="thing"`
- No jQuery, no vanilla DOM manipulation

### CSS/Styling
```ruby
gem "dartsass-rails"  # SCSS compilation
```

**Architecture**: ITCSS (Inverted Triangle CSS)
- Dark theme with CSS variables
- BEM-like naming for components
- Location: `app/assets/stylesheets/`

### JavaScript Dependencies
```json
// package.json key dependencies
{
  "@hotwired/stimulus": "^3.2.2",
  "@hotwired/turbo-rails": "^8.0.12",
  "sortablejs": "^1.15.6"  // Drag-and-drop
}
```

## Testing Stack

### Primary Testing - Playwright
```ruby
gem "playwright-ruby-client"
```

**Usage**:
- Main test framework for all UI testing
- Location: `test/playwright/`
- Preferred over Puppeteer (only use Puppeteer for specific automation needs)

### Additional Testing Tools
```ruby
group :test do
  gem "capybara"
  gem "selenium-webdriver"
  gem "factory_bot_rails"  # Test data generation
end
```

## Development Tools

### Code Quality
```ruby
group :development do
  gem "rubocop", require: false
  gem "rubocop-rails", require: false
  gem "rubocop-rails-omakase", require: false
end
```

**Rubocop Usage**:
- Run `rubocop -A` before committing
- Configuration in `.rubocop.yml`
- Auto-fixes most style issues

### Debugging
```ruby
gem "debug", platforms: %i[mri windows]
gem "web-console"  # Better error pages
```

### Development Server
```ruby
# Procfile.dev
web: rails server -b 0.0.0.0
css: rails dartsass:watch
```

## Production Infrastructure

### Deployment - Kamal
```yaml
# config/deploy.yml
service: bos
image: fluffyx/bos
servers:
  - 192.168.1.199
```

**Key Features**:
- Docker-based deployment
- Zero-downtime deploys
- Built-in health checks

### Background Jobs
```ruby
gem "solid_queue"  # Database-backed job queue
```

### Performance
```ruby
gem "solid_cache"  # Database-backed Rails cache
```

## Authentication & Security

### Authentication
```ruby
gem "bcrypt", "~> 3.1.20"  # Password hashing
```

**Implementation**:
- Custom authentication (no Devise)
- Session-based authentication
- Secure password storage

## Additional Gems

### UI Enhancement
```ruby
gem "motion"  # Reactive Rails components
```

### Development Productivity
```ruby
gem "annotaterb"  # Annotate models with schema
```

## Browser Requirements

### Supported Browsers
- Safari 16+ (primary target)
- Chrome 100+
- Firefox 100+
- Edge 100+

### JavaScript Requirements
- ES6+ syntax supported
- No transpilation needed
- Native browser modules via import maps

## Version Constraints

### Why These Versions Matter

1. **Ruby 3.4.4**: Latest stable with YJIT performance improvements
2. **Rails 8.0.2**: Latest version with Solid adapters built-in
3. **PostgreSQL 14+**: JSON performance and indexing improvements
4. **Phlex 2.0**: Stable API for component architecture

### Upgrade Policy

- Security patches: Apply immediately
- Minor versions: Test in development first
- Major versions: Require architecture review

## Package Management

### Ruby Dependencies
```bash
# Install/update gems
bundle install

# Update specific gem
bundle update gem_name

# Check for security issues
bundle audit
```

### JavaScript Dependencies
```bash
# Install packages
npm install

# Update packages
npm update

# Audit for vulnerabilities
npm audit
```

## Environment Variables

### Required in Production
```bash
RAILS_ENV=production
RAILS_MASTER_KEY=<secret>
DATABASE_URL=postgresql://...
REDIS_URL=redis://...  # If using Redis features
```

### Development Defaults
```bash
RAILS_ENV=development
DATABASE_URL=postgresql://localhost/bos_development
```

## Common Pitfalls

1. **Don't add jQuery** - Use Stimulus instead
2. **Don't add ERB templates** - Use Phlex components
3. **Don't add Webpacker** - Use import maps
4. **Don't add Sprockets** - Use Propshaft
5. **Don't add Devise** - Custom auth is implemented
6. **Don't change dark theme** - It's a core design decision

## Technology Decision Records

### Why Phlex over ERB?
- Type-safe component interfaces
- Better testing and encapsulation
- Composable UI components
- No template lookup overhead

### Why Stimulus over React/Vue?
- Works with server-rendered HTML
- Minimal JavaScript footprint
- Progressive enhancement
- Integrates with Turbo

### Why Playwright over Cypress?
- Better debugging experience
- Supports all browsers
- More stable API
- Ruby integration available

### Why ITCSS for CSS?
- Scalable architecture
- Specificity management
- Clear separation of concerns
- Easy to maintain

## Dependency Update Checklist

Before adding new dependencies:

1. ✓ Check if existing gem/package provides the functionality
2. ✓ Verify license compatibility
3. ✓ Check maintenance status (last update, open issues)
4. ✓ Consider bundle size impact (for JS)
5. ✓ Test in development environment
6. ✓ Update this document
7. ✓ Run `bundle audit` / `npm audit`

## Resources

- [Rails 8 Release Notes](https://rubyonrails.org/2024/11/7/rails-8-0-has-been-released)
- [Phlex Documentation](https://phlex.fun)
- [Stimulus Handbook](https://stimulus.hotwired.dev/handbook/introduction)
- [Kamal Deployment](https://kamal-deploy.org)