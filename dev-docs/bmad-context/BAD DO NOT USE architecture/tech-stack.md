# bŏs Technology Stack

## 🚨 MIGRATION IN PROGRESS

**The bŏs application is currently undergoing a major architectural migration:**
- **FROM**: Rails monolith with server-rendered Phlex components and Stimulus.js
- **TO**: Rails API backend + Svelte/SvelteKit frontend (separate applications)

**Status**: Migration started (see SVELTE_MIGRATION_STORIES.md for progress)

**Important for AI Agents and Developers**:
- ❌ DO NOT create new Phlex components - these are LEGACY
- ❌ DO NOT create new Stimulus controllers - these are LEGACY
- ✅ DO create new features in the Svelte frontend (`/frontend` directory)
- ✅ DO use Rails only for API endpoints during migration

## Overview

This document provides a comprehensive reference of all technologies, versions, and dependencies used in the bŏs project. AI agents should consult this before introducing new dependencies or making architectural decisions.

## Quick Reference

**Backend Stack (Stable):**
- Ruby 3.4.4 + Rails 8.0.2 (transitioning to API-only)
- PostgreSQL database
- JWT-based authentication (for API)

**Frontend Stack (Current):**
- Svelte/SvelteKit with TypeScript
- Vite for bundling
- Tailwind CSS
- @tanstack/svelte-query for data fetching
- Playwright for E2E testing

**Legacy Frontend (Being Removed):**
- ~~Phlex components~~ → Replaced by Svelte components
- ~~Stimulus.js~~ → Replaced by Svelte reactivity
- ~~SCSS with ITCSS~~ → Replaced by Tailwind CSS

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

### Current Frontend Stack (Svelte/SvelteKit)

**Location**: `/frontend` directory (separate from Rails app)

**Core Technologies**:
```json
// frontend/package.json key dependencies
{
  "@sveltejs/kit": "^2.0.0",
  "svelte": "^4.2.19",
  "typescript": "^5.0.0",
  "vite": "^5.0.3",
  "@tanstack/svelte-query": "^5.62.9",
  "tailwindcss": "^3.4.16"
}
```

**Build & Development**:
- Vite for fast HMR and building
- TypeScript for type safety
- ESLint v9 with flat config
- Prettier for formatting

**Styling**:
- Tailwind CSS with custom dark theme
- CSS variables matching Rails app design
- No SCSS/SASS in frontend

Svelte 5 is different from what you're used to. Please review ./docs/architecture/svelte.md before writing any front-end code.

### LEGACY View Layer - Phlex (⚠️ DEPRECATED - DO NOT USE)
```ruby
gem "phlex-rails", "~> 2.0.0"
```

**Status**: LEGACY - Being removed during Svelte migration
- ❌ NO new Phlex components should be created
- ❌ Existing components will be removed as features migrate
- Components in `app/views/components/` are maintenance-only

### LEGACY JavaScript - Stimulus (⚠️ DEPRECATED - DO NOT USE)
```ruby
gem "stimulus-rails"
```

**Status**: LEGACY - Being removed during Svelte migration
- ❌ NO new Stimulus controllers should be created
- ❌ Existing controllers will be removed as features migrate
- Controllers in `app/javascript/controllers/` are maintenance-only

### CSS/Styling

**Frontend (Current)**: Tailwind CSS
- Configuration: `frontend/tailwind.config.js`
- Custom dark theme with design tokens
- Utility-first approach
- No SCSS in frontend app

**Backend (Legacy)**: SCSS with ITCSS
```ruby
gem "dartsass-rails"  # SCSS compilation
```
- Status: LEGACY - Will be removed post-migration
- Location: `app/assets/stylesheets/`
- Only for remaining Rails views during migration

### JavaScript Dependencies

**Frontend App** (`frontend/package.json`):
```json
{
  // Core framework
  "@sveltejs/kit": "^2.0.0",
  "svelte": "^4.2.19",
  
  // Development
  "typescript": "^5.0.0",
  "vite": "^5.0.3",
  "@playwright/test": "^1.49.1",
  
  // Code quality
  "eslint": "^9.7.0",
  "@eslint/js": "^9.30.0",
  "prettier": "^3.3.3",
  
  // UI & Styling
  "tailwindcss": "^3.4.16",
  
  // Data fetching
  "@tanstack/svelte-query": "^5.62.9"
}
```

**Rails App** (LEGACY - being removed):
```json
{
  "@hotwired/stimulus": "^3.2.2",
  "@hotwired/turbo-rails": "^8.0.12",
  "sortablejs": "^1.15.6"
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

### Frontend Development
1. **Don't create new Phlex components** - Use Svelte components in `/frontend`
2. **Don't create new Stimulus controllers** - Use Svelte's reactivity
3. **Don't add jQuery** - Use Svelte's built-in features
4. **Don't use SCSS in frontend** - Use Tailwind CSS
5. **Don't modify Rails views** - Build in Svelte frontend instead

### Backend Development
1. **Don't add ERB templates** - API-only endpoints
2. **Don't add Webpacker** - Frontend uses Vite
3. **Don't add Sprockets** - Use Propshaft for remaining assets
4. **Don't add Devise** - Custom JWT auth is implemented
5. **Don't change dark theme** - It's a core design decision

## Technology Decision Records

### Why are we migrating from Phlex/Stimulus to Svelte?
- Better developer experience with hot module replacement
- Type safety with TypeScript throughout
- Modern component-based architecture
- Better performance for complex UIs
- Cleaner separation of frontend and backend
- Industry-standard tooling (Vite, ESLint, etc.)

### Why Svelte over React/Vue?
- No virtual DOM overhead
- Smaller bundle sizes
- Simpler component syntax
- Built-in reactivity without complex state management
- Excellent TypeScript support
- SvelteKit provides full-stack framework features

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

## Frontend Development Environment

### Development Commands
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Development server (with HMR)
npm run dev

# Type checking
npm run check

# Linting (ESLint v9 flat config)
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```

### Frontend Architecture
- **Framework**: SvelteKit (file-based routing)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom dark theme
- **State Management**: Svelte stores + @tanstack/svelte-query
- **API Client**: Custom client with JWT handling (to be implemented)
- **Testing**: Playwright for E2E tests

### ESLint v9 Configuration
The frontend uses ESLint v9 with flat config format:
- Configuration: `frontend/eslint.config.js`
- Includes TypeScript and Svelte support
- Prettier integration for formatting
- Service worker globals configured

## Resources

### Current Stack (Svelte Frontend)
- [SvelteKit Documentation](https://kit.svelte.dev)
- [Svelte Documentation](https://svelte.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite Documentation](https://vitejs.dev)
- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)

### Backend (Rails API)
- [Rails 8 Release Notes](https://rubyonrails.org/2024/11/7/rails-8-0-has-been-released)
- [Rails API Documentation](https://guides.rubyonrails.org/api_app.html)
- [Kamal Deployment](https://kamal-deploy.org)

### Legacy (Being Removed)
- ~~[Phlex Documentation](https://phlex.fun)~~ - DEPRECATED
- ~~[Stimulus Handbook](https://stimulus.hotwired.dev/handbook/introduction)~~ - DEPRECATED