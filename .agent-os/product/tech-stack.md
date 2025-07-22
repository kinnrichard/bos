# Technical Stack

> Last Updated: 2025-07-21
> Version: 1.0.0

## Core Technologies

### Backend

- **Application Framework:** Ruby on Rails 8.0.2 (API mode)
- **API Architecture:** RESTful JSON API with JWT authentication
- **Background Jobs:** Solid Queue (database-backed)
- **Caching:** Solid Cache (database-backed)
- **WebSockets:** Action Cable with Solid Cable adapter

### Frontend

- **JavaScript Framework:** SvelteKit 2.22.2 with Svelte 5.35.4
- **State Management:** Zero.js 0.21 for real-time sync
- **HTTP Client:** Axios 1.10.0 with interceptors
- **Build Tool:** Vite 6.0.0
- **Type Safety:** TypeScript 5.0.0

### Database

- **Database System:** PostgreSQL 
- **Real-time Sync:** Zero.js with PostgreSQL upstream
- **Soft Deletion:** Discard gem 1.3
- **Ordering:** Positioning gem for drag-and-drop

### Styling

- **CSS Framework:** Tailwind CSS 3.4.16
- **CSS Processing:** PostCSS with Autoprefixer
- **Component Styling:** Scoped styles in Svelte components
- **UI Components:** Melt UI for Svelte 0.86.6

### Testing

- **E2E Testing:** Playwright 1.53.2
- **Unit Testing:** Vitest 3.2.4
- **Rails Testing:** Minitest with Capybara
- **Coverage:** Vitest Coverage with V8

### Development Tools

- **Process Manager:** Foreman for multi-service development
- **Code Quality:** ESLint 9.7.0, Prettier 3.3.3
- **Security:** Brakeman for Rails security scanning
- **Ruby Style:** Rubocop Rails Omakase

### Infrastructure

- **Application Hosting:** Self-hosted or cloud VPS (flexible)
- **Database Hosting:** PostgreSQL on same infrastructure
- **Asset Hosting:** Rails asset pipeline (API mode - minimal assets)
- **Deployment Solution:** Kamal (Docker-based deployment)
- **Container Runtime:** Docker with Thruster for HTTP acceleration

### External Services

- **Version Control:** Git with GitHub
- **Icon Library:** Custom SVG icons in /static/icons
- **Font Provider:** System fonts (no external provider)
- **Microsoft 365:** Custom Ruby gem for integration (planned)

### Import Strategy

- **Frontend:** ES Modules (native Vite/SvelteKit)
- **Backend:** Ruby bundler with Gemfile
- **Package Management:** npm for frontend, bundler for backend

### Code Repository

- **Repository URL:** Private repository (contact for access)
- **Monorepo Structure:** Rails backend + SvelteKit frontend in same repo
- **Branch Strategy:** Git flow with main/develop/feature branches