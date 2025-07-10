# bŏs Architecture Documentation

## Overview

This directory contains detailed technical documentation for the bŏs client/job/task management system. Each document focuses on specific architectural aspects to help AI agents understand and contribute effectively to the codebase.

## Documentation Categories

### 🏗️ Core Architecture
Essential documentation that every AI agent should review:

- **[Coding Standards](./coding-standards.md)** - Ruby, JavaScript, and CSS conventions
- **[Tech Stack](./tech-stack.md)** - Technologies, versions, and constraints  
- **[Unified Project Structure](./unified-project-structure.md)** - Directory organization and file placement
- **[Testing Strategy](./testing-strategy.md)** - Playwright-first testing approach

### 🎨 Frontend Architecture
Critical for UI/UX work - READ THESE FIRST for any frontend tasks:

- **[Frontend Architecture](./frontend-architecture.md)** ⚡ - Phlex components and Stimulus patterns
- **[UI/UX Specification](./ui-ux-spec.md)** 🍎 - Apple-like interface guidelines
- **[Components Catalog](./components.md)** - Reusable Phlex component library
- **[Core Workflows](./core-workflows.md)** - User interaction flows

### 🔧 Backend Architecture
Rails patterns and service design:

- **[Backend Architecture](./backend-architecture.md)** - Service layers and patterns
- **[REST API Specification](./rest-api-spec.md)** - Endpoint documentation
- **[Data Models](./data-models.md)** - Business entity specifications
- **[Database Schema](./database-schema.md)** - PostgreSQL table structures

### 🚀 Operations & Performance
Deployment and optimization:

- **[Deployment Guide](./deployment-guide.md)** - Kamal deployment process
- **[Performance Guidelines](./performance-guidelines.md)** - Optimization patterns
- **[Troubleshooting Guide](./troubleshooting-guide.md)** - Common issues and solutions

## Reading Order by Task Type

### For Frontend/UI Tasks
1. [Frontend Architecture](./frontend-architecture.md) - Understand Phlex first!
2. [UI/UX Specification](./ui-ux-spec.md) - Apple-like patterns
3. [Components Catalog](./components.md) - Reuse existing components
4. [Coding Standards](./coding-standards.md#scss-conventions) - CSS/SCSS rules

### For Backend/API Tasks
1. [Backend Architecture](./backend-architecture.md) - Service patterns
2. [Data Models](./data-models.md) - Entity relationships
3. [REST API Specification](./rest-api-spec.md) - Endpoint patterns
4. [Database Schema](./database-schema.md) - Table structures

### For Full-Stack Features
1. [Core Workflows](./core-workflows.md) - End-to-end flows
2. [Frontend Architecture](./frontend-architecture.md) - UI layer
3. [Backend Architecture](./backend-architecture.md) - Service layer
4. [Testing Strategy](./testing-strategy.md) - Test all layers

### For Bug Fixes
1. [Troubleshooting Guide](./troubleshooting-guide.md) - Known issues
2. [Testing Strategy](./testing-strategy.md) - Write regression tests
3. Architecture doc for affected area

## Key Architectural Decisions

### Why Phlex?
- Component-based architecture using Ruby objects instead of ERB templates
- Better encapsulation and testing
- Type-safe component interfaces
- See [Frontend Architecture](./frontend-architecture.md#why-phlex) for details

### Why Stimulus?
- Lightweight JavaScript framework that works with server-rendered HTML
- Progressive enhancement approach
- Integrates seamlessly with Turbo
- See [Frontend Architecture](./frontend-architecture.md#stimulus-controllers) for patterns

### Why Playwright?
- Modern, reliable browser automation
- Better than Puppeteer for testing (keep Puppeteer only for specific automation)
- Supports all browsers
- See [Testing Strategy](./testing-strategy.md#playwright-tests) for examples

## Quick Reference

### Critical Commands
```bash
# After CSS/JS changes
rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json

# Run tests
bundle exec ruby test/playwright/[test_name].rb

# Before committing
rubocop -A
```

### File Locations
- Phlex components: `app/views/components/`
- Stimulus controllers: `app/javascript/controllers/`
- SCSS files: `app/assets/stylesheets/`
- Playwright tests: `test/playwright/`

## Documentation Maintenance

Update these docs when:
- Introducing new patterns or components
- Changing architectural decisions
- Adding major features
- Discovering important gotchas