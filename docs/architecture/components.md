# bŏs Component Catalog

## Overview

This document catalogs all reusable Phlex components in the bŏs application. Components follow a consistent pattern with BEM naming conventions and are organized by purpose.

## Component Architecture

### Base Component

All components inherit from `Components::Base` which provides:
- Rails helper integration
- BEM naming convention helpers
- CSRF token access
- Flash message access
- Current user access

```ruby
class Components::MyComponent < Components::Base
  def view_template
    div(class: bem_block) do
      # Component content
    end
  end
end
```

## Working with Raw HTML and SVG

### Inserting Raw HTML

Use `unsafe_raw` when you need to insert HTML strings directly (use with caution!):

```ruby
# Example: Inserting JavaScript
script do
  unsafe_raw <<~JS
    // Check sidebar state before page renders
    if (localStorage.getItem('sidebarHidden') === 'true') {
      document.documentElement.classList.add('sidebar-hidden');
    }
  JS
end

# Example: Inserting content from Rails helpers
if content_for?(:head)
  unsafe_raw(content_for(:head))
end

# Example: Inserting HTML from a variable
html_content = "<strong>Bold text</strong>"
div do
  unsafe_raw(html_content)  # Renders the HTML, not escaped text
end
```

**Important**: Only use `unsafe_raw` with trusted content. Never use it with user input to avoid XSS vulnerabilities.

### Working with SVG

Phlex provides native SVG support. Use snake_case for SVG attributes (they'll be converted to kebab-case):

```ruby
# Example: Filter icon
svg(
  xmlns: "http://www.w3.org/2000/svg",
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",  # becomes viewBox in HTML
  fill: "none",
  stroke: "currentColor",
  stroke_width: "2",      # becomes stroke-width
  stroke_linecap: "round", # becomes stroke-linecap
  stroke_linejoin: "round" # becomes stroke-linejoin
) do |s|
  s.polygon(points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3")
end

# Example: Chevron icon
svg(
  class: "icon",
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  stroke_width: "2"
) do |s|
  s.polyline(points: "6 9 12 15 18 9")
end

# Example: Circle with path
svg(xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24") do |s|
  s.circle(cx: "12", cy: "12", r: "10", fill: "#00A3FF")
  s.path(
    d: "M9 12l2 2 4-4",
    stroke: "white",
    stroke_width: "2",
    fill: "none"
  )
end
```

**SVG Attribute Naming Rules:**
- Use snake_case in Ruby (e.g., `stroke_width`, `stroke_linecap`)
- Phlex automatically converts to kebab-case in HTML (e.g., `stroke-width`, `stroke-linecap`)
- Single-word attributes stay the same (e.g., `fill`, `stroke`, `points`)

## UI Components

### ButtonComponent

A versatile button component supporting multiple variants, sizes, and states.

**Location:** `app/components/ui/button_component.rb`

**Usage:**
```ruby
render Components::Ui::ButtonComponent.new(
  variant: :primary,    # :primary, :secondary, :danger, :ghost
  size: :medium,        # :small, :medium, :large
  type: :button,        # :button, :submit, :reset
  disabled: false,
  full_width: false,
  loading: false,
  icon: "✨",
  href: "/clients",     # Makes it a link styled as button
  data: { turbo_method: :delete },
  html_options: { class: "custom-class" }
) { "Click me" }
```

**Variants:**
- `primary` - Blue accent button for main actions
- `secondary` - Gray button for secondary actions
- `danger` - Red button for destructive actions
- `ghost` - Transparent button for tertiary actions

**CSS:** `app/assets/stylesheets/components/ui/button.scss`

### BadgeComponent

Status indicators and labels with color-coded variants.

**Location:** `app/components/ui/badge_component.rb`

**Usage:**
```ruby
render Components::Ui::BadgeComponent.new(
  text: "Active",
  icon: "●",
  variant: :success,    # :default, :success, :warning, :danger, :info, :purple
  size: :medium,        # :small, :medium, :large
  rounded: true,
  clickable: false
)

# Or with block content:
render Components::Ui::BadgeComponent.new(variant: :info) do
  "Custom content"
end
```

**Variants:**
- `default` - Gray for neutral information
- `success` - Green for positive states
- `warning` - Yellow/orange for warnings
- `danger` - Red for errors or critical states
- `info` - Blue for informational states
- `purple` - Purple for special states

**CSS:** `app/components/ui/badge.scss`

### FormInputComponent

Consistent form input styling with label support.

**Location:** `app/components/ui/form_input_component.rb`

**Usage:**
```ruby
render Components::Ui::FormInputComponent.new(
  form: form,
  field: :name,
  label: "Client Name",
  type: :text,
  required: true,
  placeholder: "Enter client name",
  help_text: "Use the official company name",
  html_options: { autofocus: true }
)
```

**Supported Types:**
- Text inputs (text, email, password, tel, url)
- Textareas
- Select dropdowns
- Date/time inputs

## Layout Components

### HeaderComponent

Main application header with user menu and navigation.

**Location:** `app/components/header/header_component.rb`

**Usage:**
```ruby
render Components::Header::HeaderComponent.new(
  current_user: current_user,
  current_path: request.path
)
```

**Features:**
- Logo/brand
- Search functionality
- User dropdown menu
- Responsive design

### SidebarComponent

Navigation sidebar with grouped menu items.

**Location:** `app/components/sidebar/sidebar_component.rb`

**Usage:**
```ruby
render Components::Sidebar::SidebarComponent.new(
  current_user: current_user,
  current_path: request.path
)
```

**Features:**
- Section grouping
- Active state indication
- Role-based menu items
- Collapsible sections

### PageHeaderComponent

Consistent page headers with title and optional action button.

**Location:** `app/components/page_header/page_header_component.rb`

**Usage:**
```ruby
render Components::PageHeader::PageHeaderComponent.new(
  title: "Clients",
  action_text: "New Client",
  action_path: new_client_path
) do
  # Additional content (e.g., filters, stats)
  div(class: "page-stats") { "Showing 25 of 100" }
end
```

## Content Components

### EmptyStateComponent

User-friendly empty state with personalized greeting.

**Location:** `app/components/empty_state/empty_state_component.rb`

**Usage:**
```ruby
render Components::EmptyState::EmptyStateComponent.new(
  user: current_user
)
```

**Features:**
- Time-based greeting
- Action prompts
- Search integration

### GenericEmptyStateComponent

Customizable empty state for various contexts.

**Location:** `app/components/empty_state/generic_empty_state_component.rb`

**Usage:**
```ruby
render Components::EmptyState::GenericEmptyStateComponent.new(
  title: "No jobs found",
  description: "Create your first job to get started",
  icon: "📋",
  action_text: "Create Job",
  action_path: new_job_path
)
```

### InfoGridComponent

Display key-value information in a grid layout.

**Location:** `app/components/info_grid/info_grid_component.rb`

**Usage:**
```ruby
render Components::InfoGrid::InfoGridComponent.new(
  items: [
    { label: "Status", value: "Active", badge: :success },
    { label: "Created", value: "Jan 15, 2024" },
    { label: "Owner", value: current_user.name, link: user_path(current_user) }
  ],
  columns: 3
)
```

## Modal Components

### Base Modal

Base modal component for consistent dialog behavior.

**Location:** `app/components/modal.rb`

**Features:**
- Backdrop with blur
- Close button
- Keyboard escape support
- Focus management

### DeleteConfirmationModalComponent

Specialized modal for delete confirmations.

**Location:** `app/components/modal/delete_confirmation_modal_component.rb`

**Usage:**
```ruby
render Components::Modal::DeleteConfirmationModalComponent.new(
  title: "Delete Client?",
  message: "This will permanently delete the client and all associated data.",
  confirm_text: "Delete Client",
  confirm_path: client_path(@client),
  confirm_method: :delete
)
```

## Job Components

### JobCardComponent

Compact job display card with status and priority.

**Location:** `app/components/jobs/job_card_component.rb`

**Usage:**
```ruby
render Components::Jobs::JobCardComponent.new(
  job: @job,
  show_client: true,
  show_tasks: false,
  clickable: true
)
```

**Features:**
- Status badge
- Priority indicator
- Due date display
- Task progress
- Client info (optional)

### SchedulePopoverComponent

Date/time scheduling interface in a popover.

**Location:** `app/components/jobs/schedule_popover_component.rb`

**Usage:**
```ruby
render Components::Jobs::SchedulePopoverComponent.new(
  schedulable: @job,
  position: :bottom,
  trigger_id: "schedule-button"
)
```

## Form Components

### FormContainerComponent

Consistent form wrapper with styling.

**Location:** `app/components/forms/form_container_component.rb`

**Usage:**
```ruby
render Components::Forms::FormContainerComponent.new(
  title: "Edit Client",
  description: "Update client information"
) do
  # Form content
end
```

### FormErrorsComponent

Display validation errors consistently.

**Location:** `app/components/forms/form_errors_component.rb`

**Usage:**
```ruby
render Components::Forms::FormErrorsComponent.new(
  resource: @client,
  full_messages: true
)
```

### FormActionsComponent

Consistent form button layout.

**Location:** `app/components/forms/form_actions_component.rb`

**Usage:**
```ruby
render Components::Forms::FormActionsComponent.new(
  submit_text: "Save Changes",
  cancel_path: clients_path,
  show_delete: true,
  delete_path: client_path(@client)
)
```

## Component Best Practices

### 1. Initialization

Always use keyword arguments for clarity:
```ruby
# Good
ButtonComponent.new(variant: :primary, size: :large)

# Avoid
ButtonComponent.new(:primary, :large)
```

### 2. BEM Naming

Use the provided BEM helpers:
```ruby
def view_template
  div(class: bem_block) do                    # "job-card"
    h3(class: bem_element("title")) { ... }   # "job-card__title"
    div(class: bem_modifier("urgent")) { ... } # "job-card--urgent"
  end
end
```

### 3. Composition

Prefer composition over inheritance:
```ruby
def view_template
  div do
    render HeaderComponent.new(...)
    render ButtonComponent.new(...)
  end
end
```

### 4. Data Attributes

Use data attributes for JavaScript interaction:
```ruby
div(
  data: {
    controller: "dropdown",
    dropdown_trigger_value: "click"
  }
)
```

### 5. Styling

- Define component styles in matching SCSS files
- Use CSS variables for consistency
- Follow the dark theme color palette
- Keep animations subtle and functional

### 6. Accessibility

- Include proper ARIA attributes
- Ensure keyboard navigation
- Provide focus states
- Use semantic HTML

### 7. Testing

Write Playwright tests for interactive components:
```ruby
# spec/system/components/button_component_spec.rb
it "changes appearance when clicked" do
  visit "/test"
  button = find(".button--primary")
  expect(button).to have_css(".button--loading")
end
```

## Creating New Components

1. **Location**: Place in appropriate subdirectory under `app/components/`
2. **Naming**: Use descriptive names ending with `Component`
3. **Inheritance**: Extend `Components::Base`
4. **Documentation**: Add to this catalog with examples
5. **Styling**: Create matching SCSS file
6. **Testing**: Write component tests

Example structure:
```
app/components/
  my_feature/
    special_widget_component.rb
app/assets/stylesheets/components/
  my_feature/
    special_widget.scss
```

## Component Lifecycle

1. **Initialize**: Set instance variables from arguments
2. **view_template**: Define the HTML structure
3. **Private methods**: Extract complex logic
4. **Helpers**: Use BEM helpers for consistent naming

Remember: Phlex components are Ruby objects that generate HTML. Keep them simple, focused, and reusable.