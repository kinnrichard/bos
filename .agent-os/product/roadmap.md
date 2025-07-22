# Product Roadmap

> Last Updated: 2025-07-21
> Version: 1.0.0
> Status: Active Development

## Phase 0: Already Completed

The following features have been implemented:

- [x] Client management system - Full CRUD with unique codes and relationships
- [x] Job/work order tracking - Complete workflow with status management
- [x] Task management - Drag-and-drop with real-time updates via Zero.js
- [x] User authentication - JWT-based auth with role management
- [x] Activity logging - Comprehensive audit trail system
- [x] Device management - Client device tracking with assignments
- [x] Real-time synchronization - Zero.js integration for instant updates
- [x] Personnel management - Contact tracking with multiple methods
- [x] Responsive UI - SvelteKit SPA with Tailwind CSS
- [x] API architecture - Rails API with proper serialization
- [x] Testing infrastructure - Playwright E2E and Vitest unit tests

## Phase 1: Zero.js Custom Mutations (Current - 2 weeks)

**Goal:** Implement custom business logic mutations for enhanced real-time capabilities
**Success Criteria:** Complex operations execute instantly with proper conflict resolution

### Must-Have Features

- [ ] Zero.js custom mutator framework - Set up mutation infrastructure `M`
- [ ] Job status mutations - Atomic status transitions with validation `M`
- [ ] Task reordering mutations - Conflict-free concurrent reordering `L`
- [ ] Bulk operations - Multi-select actions with optimistic updates `M`

### Should-Have Features

- [ ] Offline queue management - Mutation replay on reconnection `M`
- [ ] Mutation testing framework - Ensure reliability of custom logic `S`

### Dependencies

- Zero.js documentation and best practices
- Existing Zero schema and sync setup

## Phase 2: Microsoft 365 Integration (3 weeks)

**Goal:** Provide visibility into client email system management
**Success Criteria:** Seamless OAuth flow with useful email insights displayed

### Must-Have Features

- [ ] OAuth 2.0 authentication - Microsoft identity platform integration `L`
- [ ] Email system dashboard - Show mailbox status and configuration `M`
- [ ] Client email mapping - Link M365 tenants to clients `S`
- [ ] Permission management - Granular access control for email data `M`

### Should-Have Features

- [ ] Email analytics - Usage patterns and common issues `M`
- [ ] Automated alerts - Proactive monitoring of email problems `L`
- [ ] Audit log integration - M365 events in activity timeline `M`

### Dependencies

- Internal Ruby gem for M365 integration
- Microsoft Graph API access
- Azure AD app registration

## Phase 3: Financial Management (4 weeks)

**Goal:** Replace QuickBooks with integrated invoicing and basic accounting
**Success Criteria:** Complete invoice-to-payment workflow with financial reporting

### Must-Have Features

- [ ] Invoice generation - Create from jobs with line items `L`
- [ ] Payment tracking - Record and reconcile payments `M`
- [ ] Basic general ledger - Double-entry accounting system `XL`
- [ ] Financial reports - P&L, cash flow, aging reports `L`
- [ ] Bank integration - Import transactions via Plaid `M`

### Should-Have Features

- [ ] Recurring invoices - Subscription billing support `M`
- [ ] Expense tracking - Categorized expense management `M`
- [ ] Tax preparation - Export data for tax filing `L`

### Dependencies

- Plaid API integration
- PDF generation for invoices
- Accounting expertise for GL design

## Phase 4: Advanced Automation (3 weeks)

**Goal:** Reduce manual work through intelligent automation
**Success Criteria:** 50% reduction in repetitive tasks

### Must-Have Features

- [ ] Template system - Job and task templates with variables `L`
- [ ] Automated workflows - Trigger actions based on events `L`
- [ ] Smart scheduling - AI-assisted appointment optimization `XL`
- [ ] Bulk communications - Email/SMS campaigns to clients `M`

### Should-Have Features

- [ ] Predictive analytics - Workload and revenue forecasting `L`
- [ ] Custom fields - User-defined data structures `M`
- [ ] API webhooks - Third-party integrations `S`

### Dependencies

- Background job infrastructure
- Email/SMS service providers
- ML model for scheduling (optional)

## Phase 5: Enterprise Features (4 weeks)

**Goal:** Support larger organizations and complex workflows
**Success Criteria:** Platform scales to 100+ users with advanced controls

### Must-Have Features

- [ ] Multi-tenant support - Separate brands/divisions `XL`
- [ ] Advanced permissions - Granular role-based access `L`
- [ ] White labeling - Custom branding per tenant `M`
- [ ] Compliance tools - GDPR, SOC2 compliance features `L`
- [ ] Enterprise SSO - SAML/OIDC integration `M`

### Should-Have Features

- [ ] SLA management - Track and report on service levels `M`
- [ ] Resource planning - Capacity and utilization tracking `L`
- [ ] Executive dashboards - High-level KPI visualization `M`

### Dependencies

- Infrastructure scaling considerations
- Enterprise authentication providers
- Compliance audit requirements