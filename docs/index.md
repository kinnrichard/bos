# bŏs Documentation Index

## Overview

bŏs is a client/job/task management system designed for IT company technicians to efficiently serve clients. The system tracks:
- **Clients** - Companies or organizations being served
- **Jobs** - Work orders and projects for clients
- **Tasks** - Individual work items within jobs
- **Devices** - IT equipment associated with each client
- **People** - Contacts and personnel at client organizations

This documentation is optimized for AI development agents to understand the current Svelte-based architecture and patterns necessary for effective contribution.

## Quick Start for AI Agents

Before making any changes:
1. Read the [Frontend Architecture](./architecture/frontend-architecture.md) - Svelte + TypeScript patterns
2. Review [Coding Standards](./architecture/coding-standards.md) - Current development practices
3. Always write Playwright tests for new features
4. Run `npm run check && npm run lint` before committing
5. Use `—CC` signature when committing changes

## Documentation Structure

### Core Documentation
- [Product Requirements Document](./architecture/prd.md) - Business goals and feature specifications
- [Architecture Index](./architecture/index.md) - Technical architecture overview

### Essential Reading (Start Here)
1. [Coding Standards](./architecture/coding-standards.md) - Project conventions and style
2. [Frontend Architecture](./architecture/frontend-architecture.md) - Svelte + TypeScript patterns
3. [Testing Guide](./testing-guide.md) - Comprehensive testing strategy
4. [API Specification](./api/API_SPECIFICATION.md) - JSON API documentation

### Architecture Documentation

#### Project Structure
- [Frontend Architecture](./architecture/frontend-architecture.md) - Svelte + TypeScript frontend
- [Backend Architecture](./architecture/backend-architecture.md) - Rails API patterns

#### API and Data
- [API Specification](./api/API_SPECIFICATION.md) - JSON API documentation
- [Data Models](./architecture/data-models.md) - Business entity definitions
- [Database Schema](./architecture/database-schema.md) - PostgreSQL structure

#### UI/UX Guidelines
- [UI/UX Specification](./architecture/ui-ux-spec.md) - Apple-like interface patterns
- [Core Workflows](./architecture/core-workflows.md) - User interaction flows

#### Development Practices
- [Debugging Guide](./architecture/debugging-guide.md) - Professional debugging with namespaced logging
- [Deployment Guide](./architecture/deployment-guide.md) - Kamal deployment process
- [Performance Guidelines](./architecture/performance-guidelines.md) - Optimization patterns
- [Troubleshooting Guide](./architecture/troubleshooting-guide.md) - Common issues

### Product Requirements Documents
- [Svelte Migration PRD](./PRDs/svelte-migration.md) - Frontend framework migration plan

### User Stories and Epics
- [Svelte Migration Stories](./stories/in-progress/SVELTE_MIGRATION_STORIES.md) - Implementation stories

### Development Guides
- [Testing Guide](./testing-guide.md) - Comprehensive testing strategy

### Migration Documentation
- [Legacy Rails API](./legacy/rails-api-spec.md) - Legacy Rails API documentation
- [Legacy Phlex Components](./legacy/phlex-migration.md) - Legacy component patterns


## Key Technologies

- **Backend**: Rails 8.0.2, Ruby 3.4.4, PostgreSQL (JSON API)
- **Frontend**: SvelteKit, Svelte 4, TypeScript, Tailwind CSS
- **Testing**: Playwright (primary), Rails Minitest
- **Deployment**: Kamal, Docker

## Critical Workflows for AI Agents

### Frontend Development
```bash
# Start development server
cd frontend && npm run dev

# Type checking and linting
npm run check
npm run lint

# Build for production
npm run build
```

### Backend Development
```bash
# Start Rails API server
rails server

# Run tests
rails test

# Fix style issues
rubocop -A
```

### Testing Workflow
```bash
# Run all frontend tests
cd frontend && npm test

# Run with visible browser
npm run test:headed

# Run specific test categories
npm run test:unit
npm run test:integration
```

### Git Workflow
```bash
# After completing a story
npm run check && npm run lint  # Frontend
rubocop -A                      # Backend
git add .
git commit -m "Complete story: [description] —CC"
git push
```

## Project-Specific Conventions

1. **Svelte Components** - TypeScript components with reactive state
2. **Tailwind CSS** - Utility-first styling with dark theme
3. **Apple-like UI** - Precise spacing, shadows, and animations matter
4. **Test Everything** - Playwright tests required for all UI changes
5. **JSON API** - Rails backend serves JSON, frontend consumes via API

## Getting Help

- Review existing Svelte components in `frontend/src/lib/components/`
- Check API endpoints in `app/controllers/api/v1/`
- Reference Playwright tests in `frontend/tests/`
- See working examples in the codebase before implementing new patterns

## Maintenance Notes

This documentation should be updated when:
- New architectural patterns are introduced
- Major dependencies are added or upgraded
- Testing strategies change
- UI/UX guidelines evolve