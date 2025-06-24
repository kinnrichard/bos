# bŏs Documentation Index

## Overview

bŏs is a client/job/task management system designed for IT company technicians to efficiently serve clients. The system tracks:
- **Clients** - Companies or organizations being served
- **Jobs** - Work orders and projects for clients
- **Tasks** - Individual work items within jobs
- **Devices** - IT equipment associated with each client
- **People** - Contacts and personnel at client organizations

This documentation is optimized for AI development agents to understand the codebase structure, conventions, and patterns necessary for effective contribution.

## Quick Start for AI Agents

Before making any changes:
1. Read the [Phlex component guidelines](./architecture/frontend-architecture.md#phlex-components) - Phlex is unconventional
2. Review [Apple-like UI patterns](./architecture/ui-ux-spec.md) for CSS/JS work
3. Always write Playwright tests for new features
4. Run `rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json` after styling changes
5. Commit and push after each completed, tested story

## Documentation Structure

### Core Documentation
- [Product Requirements Document](./prd.md) - Business goals and feature specifications
- [Architecture Index](./architecture/index.md) - Technical architecture overview

### Essential Reading (Start Here)
1. [Coding Standards](./architecture/coding-standards.md) - Project conventions and style
2. [Phlex Best Practices](./architecture/frontend-architecture.md#phlex-components) - Critical for UI work
3. [Testing Strategy](./architecture/testing-strategy.md) - Playwright-first approach
4. [Tech Stack](./architecture/tech-stack.md) - Versions and constraints

### Architecture Documentation

#### Project Structure
- [Unified Project Structure](./architecture/unified-project-structure.md) - Where code belongs
- [Frontend Architecture](./architecture/frontend-architecture.md) - Phlex components and Stimulus
- [Backend Architecture](./architecture/backend-architecture.md) - Rails patterns and services

#### API and Data
- [REST API Specification](./architecture/rest-api-spec.md) - Endpoint documentation
- [Data Models](./architecture/data-models.md) - Business entity definitions
- [Database Schema](./architecture/database-schema.md) - PostgreSQL structure

#### UI/UX Guidelines
- [UI/UX Specification](./architecture/ui-ux-spec.md) - Apple-like interface patterns
- [Components Catalog](./architecture/components.md) - Phlex component library
- [Core Workflows](./architecture/core-workflows.md) - User interaction flows

#### Development Practices
- [Deployment Guide](./architecture/deployment-guide.md) - Kamal deployment process
- [Performance Guidelines](./architecture/performance-guidelines.md) - Optimization patterns
- [Troubleshooting Guide](./architecture/troubleshooting-guide.md) - Common issues

## Key Technologies

- **Backend**: Rails 8.0.2, Ruby 3.4.4, PostgreSQL
- **Frontend**: Phlex-Rails (components), Stimulus.js (behavior), SCSS (styling)
- **Testing**: Playwright (primary), Rails system tests
- **Deployment**: Kamal, Docker

## Critical Workflows for AI Agents

### After Making UI Changes
```bash
# Clear and rebuild all assets
rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json
```

### Testing Workflow
```bash
# Run Playwright tests for feature
bundle exec ruby test/playwright/[test_file].rb

# Run all tests before committing
bundle exec rails test:all
```

### Git Workflow
```bash
# After completing a story
rubocop -A  # Auto-fix style issues
git add .
git commit -m "Complete story: [description] —CC"
git push
```

## Project-Specific Conventions

1. **Phlex Components** - Ruby objects that render HTML, not ERB templates
2. **Stimulus Controllers** - Attach behavior to HTML via data attributes
3. **Apple-like UI** - Precise spacing, shadows, and animations matter
4. **Test Everything** - Playwright tests required for all UI changes
5. **Asset Pipeline** - Always rebuild after CSS/JS changes

## Getting Help

- Review existing Phlex components in `app/views/components/`
- Check Stimulus controllers in `app/javascript/controllers/`
- Reference Playwright tests in `test/playwright/`
- See working examples in the codebase before implementing new patterns

## Maintenance Notes

This documentation should be updated when:
- New architectural patterns are introduced
- Major dependencies are added or upgraded
- Testing strategies change
- UI/UX guidelines evolve