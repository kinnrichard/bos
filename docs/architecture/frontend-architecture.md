# bŏs Frontend Architecture

## Overview

This document explains the frontend architecture of bŏs, focusing on our use of Phlex components for views and Stimulus controllers for JavaScript behavior. This is CRITICAL reading for AI agents working on any UI features.

## Quick Reference

**Key Technologies:**
- **Phlex**: Ruby objects that render HTML (NOT ERB templates!)
- **Stimulus**: Lightweight JavaScript framework for behavior
- **SCSS**: Styles using ITCSS architecture with dark theme
- **Turbo**: For page updates without full reloads

**Key Locations:**
- Components: `app/views/components/`
- Controllers: `app/javascript/controllers/`
- Styles: `app/assets/stylesheets/`

## Why Phlex?

### Traditional Rails Views (What We DON'T Use)
```erb
<!-- ❌ We DON'T use ERB templates -->
<!-- app/views/clients/_card.html.erb -->
<div class="client-card">
  <h3><%= client.name %></h3>
  <p><%= client.status %></p>
</div>
```

### Phlex Components (What We DO Use)
```ruby
# ✅ We use Phlex components
# app/views/components/client_card_component.rb
module Components
  class ClientCardComponent < ApplicationComponent
    def initialize(client:)
      @client = client
    end
    
    def view_template
      div(class: "client-card") do
        h3 { @client.name }
        p { @client.status }
      end
    end
  end
end
```

### Benefits of Phlex
1. **Type Safety**: Ruby methods catch errors at runtime
2. **Composability**: Components can render other components
3. **Testability**: Easy to unit test
4. **Performance**: No template lookup overhead
5. **IDE Support**: Full autocomplete and refactoring

## Phlex Component Patterns

### Basic Component Structure
```ruby
# app/views/components/example_component.rb
module Components
  class ExampleComponent < ApplicationComponent
    # Constructor defines the component's interface
    def initialize(title:, subtitle: nil, **options)
      @title = title
      @subtitle = subtitle
      @options = options
    end
    
    # view_template is the main rendering method
    def view_template
      div(class: component_classes, **@options) do
        render_header
        render_content
      end
    end
    
    private
    
    # Break complex components into methods
    def render_header
      header(class: "component-header") do
        h2 { @title }
        p { @subtitle } if @subtitle
      end
    end
    
    def render_content
      div(class: "component-content") do
        yield if block_given? # Allow content injection
      end
    end
    
    def component_classes
      tokens(
        "example-component",
        @options[:class]
      )
    end
  end
end
```

### Component Composition
```ruby
# Components rendering other components
class ClientDetailComponent < ApplicationComponent
  def initialize(client:)
    @client = client
  end
  
  def view_template
    div(class: "client-detail") do
      # Render other components
      render Components::UI::CardComponent.new do
        render Components::UI::HeadingComponent.new(
          text: @client.name,
          level: 1
        )
        
        render Components::ClientInfoComponent.new(
          client: @client
        )
        
        render Components::JobListComponent.new(
          jobs: @client.jobs
        )
      end
    end
  end
end
```

### Conditional Rendering
```ruby
class StatusBadgeComponent < ApplicationComponent
  def initialize(status:)
    @status = status
  end
  
  def view_template
    return unless @status.present? # Don't render if no status
    
    span(class: badge_classes) do
      status_text
    end
  end
  
  private
  
  def badge_classes
    tokens(
      "badge",
      status_class
    )
  end
  
  def status_class
    case @status
    when "active" then "badge--success"
    when "inactive" then "badge--danger"
    when "pending" then "badge--warning"
    else "badge--default"
    end
  end
  
  def status_text
    @status.humanize
  end
end
```

### Form Components
```ruby
class ClientFormComponent < ApplicationComponent
  def initialize(client:, url:)
    @client = client
    @url = url
  end
  
  def view_template
    form_with(model: @client, url: @url, class: "client-form") do |f|
      div(class: "form-group") do
        render Components::Forms::TextFieldComponent.new(
          form: f,
          field: :name,
          label: "Client Name",
          required: true
        )
      end
      
      div(class: "form-group") do
        render Components::Forms::SelectComponent.new(
          form: f,
          field: :status,
          label: "Status",
          options: status_options
        )
      end
      
      div(class: "form-actions") do
        render Components::UI::ButtonComponent.new(
          text: submit_text,
          type: :submit,
          variant: :primary
        )
      end
    end
  end
  
  private
  
  def status_options
    [
      ["Active", "active"],
      ["Inactive", "inactive"],
      ["Pending", "pending"]
    ]
  end
  
  def submit_text
    @client.persisted? ? "Update Client" : "Create Client"
  end
end
```

## Stimulus Integration

### Connecting Stimulus to Phlex
```ruby
# Phlex component with Stimulus behavior
class DropdownComponent < ApplicationComponent
  def initialize(label:, items:, **options)
    @label = label
    @items = items
    @options = options
  end
  
  def view_template
    div(
      # Stimulus controller declaration
      data: {
        controller: "dropdown",
        dropdown_positioning_value: "fixed"
      },
      class: "dropdown"
    ) do
      button(
        # Stimulus target
        data: { dropdown_target: "button" },
        # Stimulus action
        data_action: "click->dropdown#toggle",
        class: "button button--ghost",
        type: "button"
      ) do
        @label
        render_chevron
      end
      
      div(
        # Multiple Stimulus attributes
        data: {
          dropdown_target: "menu",
          transition_enter: "transition ease-out duration-100",
          transition_enter_start: "opacity-0 scale-95",
          transition_enter_end: "opacity-100 scale-100"
        },
        class: "dropdown-menu hidden"
      ) do
        @items.each do |item|
          render_menu_item(item)
        end
      end
    end
  end
  
  private
  
  def render_chevron
    svg(class: "chevron", viewBox: "0 0 20 20", fill: "currentColor") do |s|
      s.path(
        fill_rule: "evenodd",
        d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
        clip_rule: "evenodd"
      )
    end
  end
  
  def render_menu_item(item)
    a(
      href: item[:url],
      class: "dropdown-item",
      data_action: "click->dropdown#close"
    ) do
      item[:label]
    end
  end
end
```

### Stimulus Controller Pattern
```javascript
// app/javascript/controllers/dropdown_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button", "menu"]
  static values = { 
    positioning: { type: String, default: "absolute" }
  }
  
  connect() {
    // Setup when component connects
    this.handleClickOutside = this.handleClickOutside.bind(this)
    this.detectScrollableContainer()
  }
  
  disconnect() {
    // Cleanup when component disconnects
    document.removeEventListener("click", this.handleClickOutside)
  }
  
  toggle() {
    if (this.menuTarget.classList.contains("hidden")) {
      this.open()
    } else {
      this.close()
    }
  }
  
  open() {
    this.menuTarget.classList.remove("hidden")
    this.updatePosition()
    document.addEventListener("click", this.handleClickOutside)
    
    // Dispatch custom event
    this.dispatch("opened")
  }
  
  close() {
    this.menuTarget.classList.add("hidden")
    document.removeEventListener("click", this.handleClickOutside)
    
    // Dispatch custom event
    this.dispatch("closed")
  }
  
  handleClickOutside(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }
  
  detectScrollableContainer() {
    // Auto-detect if in scrollable container
    let parent = this.element.parentElement
    while (parent) {
      const overflow = window.getComputedStyle(parent).overflow
      if (overflow === "auto" || overflow === "scroll") {
        this.positioningValue = "fixed"
        break
      }
      parent = parent.parentElement
    }
  }
  
  updatePosition() {
    if (this.positioningValue === "fixed") {
      // Position relative to viewport
      const rect = this.buttonTarget.getBoundingClientRect()
      this.menuTarget.style.position = "fixed"
      this.menuTarget.style.top = `${rect.bottom}px`
      this.menuTarget.style.left = `${rect.left}px`
    }
  }
}
```

## Component Rendering in Controllers

### Rendering from Rails Controllers
```ruby
class ClientsController < ApplicationController
  def index
    @clients = Client.active.includes(:jobs)
    
    # Render Phlex component instead of ERB view
    render Components::Clients::IndexComponent.new(
      clients: @clients,
      current_user: current_user
    )
  end
  
  def show
    @client = Client.find(params[:id])
    
    render Components::Clients::ShowComponent.new(
      client: @client,
      can_edit: policy(@client).edit?
    )
  end
  
  def new
    @client = Client.new
    
    render Components::Clients::FormComponent.new(
      client: @client,
      url: clients_path
    )
  end
end
```

### Turbo Frame Integration
```ruby
class JobsComponent < ApplicationComponent
  def initialize(client:)
    @client = client
  end
  
  def view_template
    turbo_frame_tag "client_jobs" do
      div(class: "jobs-section") do
        render_header
        render_job_list
      end
    end
  end
  
  private
  
  def render_header
    div(class: "section-header") do
      h2 { "Jobs" }
      
      # Link will update only this turbo frame
      link_to "New Job", 
        new_client_job_path(@client),
        class: "button button--primary",
        data: { turbo_frame: "client_jobs" }
    end
  end
  
  def render_job_list
    if @client.jobs.any?
      ul(class: "job-list") do
        @client.jobs.each do |job|
          render Components::JobItemComponent.new(job: job)
        end
      end
    else
      render_empty_state
    end
  end
  
  def render_empty_state
    div(class: "empty-state") do
      p { "No jobs yet" }
      link_to "Create first job",
        new_client_job_path(@client),
        class: "button button--ghost"
    end
  end
end
```

## Testing Phlex Components

### Unit Testing Components
```ruby
# test/components/client_card_component_test.rb
require "test_helper"

class ClientCardComponentTest < ViewComponent::TestCase
  test "renders client information" do
    client = clients(:acme)
    component = Components::ClientCardComponent.new(client: client)
    
    render_inline(component)
    
    assert_selector ".client-card"
    assert_text client.name
    assert_text client.status
  end
  
  test "applies custom CSS classes" do
    client = clients(:acme)
    component = Components::ClientCardComponent.new(
      client: client,
      class: "custom-class"
    )
    
    render_inline(component)
    
    assert_selector ".client-card.custom-class"
  end
  
  test "handles nil values gracefully" do
    client = Client.new(name: "Test")
    component = Components::ClientCardComponent.new(client: client)
    
    assert_nothing_raised do
      render_inline(component)
    end
  end
end
```

## Common Patterns and Solutions

### Loading States
```ruby
class AsyncContentComponent < ApplicationComponent
  def view_template
    div(
      data: {
        controller: "async-content",
        async_content_url_value: @url
      }
    ) do
      # Initial loading state
      div(data: { async_content_target: "loading" }) do
        render Components::UI::SpinnerComponent.new
      end
      
      # Content will be inserted here
      div(
        data: { async_content_target: "content" },
        class: "hidden"
      )
      
      # Error state
      div(
        data: { async_content_target: "error" },
        class: "hidden error-message"
      ) do
        "Failed to load content"
      end
    end
  end
end
```

### Modal Components
```ruby
class ModalComponent < ApplicationComponent
  def initialize(title:, size: :medium, &content)
    @title = title
    @size = size
    @content = content
  end
  
  def view_template
    div(
      data: {
        controller: "modal",
        action: "keydown.esc->modal#close"
      },
      class: "modal-backdrop hidden"
    ) do
      div(class: modal_classes) do
        render_header
        render_body
        render_footer
      end
    end
  end
  
  private
  
  def modal_classes
    tokens(
      "modal-content",
      size_class
    )
  end
  
  def size_class
    {
      small: "modal--small",
      medium: "modal--medium",
      large: "modal--large"
    }[@size]
  end
  
  def render_header
    header(class: "modal-header") do
      h2 { @title }
      button(
        data_action: "click->modal#close",
        class: "modal-close",
        type: "button",
        aria_label: "Close"
      ) do
        "×"
      end
    end
  end
  
  def render_body
    div(class: "modal-body", &@content)
  end
  
  def render_footer
    footer(class: "modal-footer") do
      yield if block_given?
    end
  end
end
```

### Data Tables
```ruby
class DataTableComponent < ApplicationComponent
  def initialize(columns:, rows:, **options)
    @columns = columns
    @rows = rows
    @options = options
  end
  
  def view_template
    div(class: "table-wrapper") do
      table(class: table_classes) do
        render_header
        render_body
      end
    end
  end
  
  private
  
  def table_classes
    tokens(
      "data-table",
      @options[:class]
    )
  end
  
  def render_header
    thead do
      tr do
        @columns.each do |column|
          th(class: "table-header") { column[:label] }
        end
      end
    end
  end
  
  def render_body
    tbody do
      @rows.each do |row|
        tr(class: "table-row") do
          @columns.each do |column|
            td(class: "table-cell") do
              render_cell(row, column)
            end
          end
        end
      end
    end
  end
  
  def render_cell(row, column)
    value = row.public_send(column[:key])
    
    if column[:component]
      render column[:component].new(value: value, row: row)
    else
      value.to_s
    end
  end
end
```

## Performance Considerations

### 1. Component Caching
```ruby
class ExpensiveComponent < ApplicationComponent
  def view_template
    # Cache the rendered output
    cache_key = ["expensive_component", @model.cache_key_with_version]
    
    Rails.cache.fetch(cache_key, expires_in: 1.hour) do
      render_expensive_content
    end
  end
end
```

### 2. Lazy Loading
```ruby
class LazyImageComponent < ApplicationComponent
  def initialize(src:, alt:, **options)
    @src = src
    @alt = alt
    @options = options
  end
  
  def view_template
    img(
      data: {
        controller: "lazy-image",
        lazy_image_src_value: @src
      },
      src: placeholder_src,
      alt: @alt,
      loading: "lazy",
      class: "lazy-image",
      **@options
    )
  end
  
  private
  
  def placeholder_src
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3C/svg%3E"
  end
end
```

### 3. Virtual Scrolling for Large Lists
```ruby
class VirtualListComponent < ApplicationComponent
  def initialize(items:, item_height: 50)
    @items = items
    @item_height = item_height
  end
  
  def view_template
    div(
      data: {
        controller: "virtual-scroll",
        virtual_scroll_item_height_value: @item_height,
        virtual_scroll_total_items_value: @items.count
      },
      class: "virtual-list"
    ) do
      # Only render visible items
      div(data: { virtual_scroll_target: "content" })
    end
  end
end
```

## Common Pitfalls

### 1. Don't Mix ERB and Phlex
```ruby
# ❌ BAD - Don't use ERB syntax in Phlex
def view_template
  div do
    <%= @user.name %>  # This won't work!
  end
end

# ✅ GOOD - Use Ruby methods
def view_template
  div do
    @user.name
  end
end
```

### 2. Always Escape User Content
```ruby
# ❌ BAD - XSS vulnerability
def view_template
  div { raw(@user_content) }
end

# ✅ GOOD - Content is escaped by default
def view_template
  div { @user_content }
end

# ✅ GOOD - When you need HTML, sanitize it
def view_template
  div { sanitize(@user_content, tags: %w[b i em strong]) }
end
```

### 3. Don't Forget Data Attributes for Stimulus
```ruby
# ❌ BAD - Stimulus won't connect
def view_template
  div(class: "dropdown") do
    # Missing data-controller!
  end
end

# ✅ GOOD - Proper Stimulus setup
def view_template
  div(
    data: { controller: "dropdown" },
    class: "dropdown"
  ) do
    # Component content
  end
end
```

## Resources

- [Phlex Documentation](https://phlex.fun)
- [Stimulus Handbook](https://stimulus.hotwired.dev)
- [Turbo Handbook](https://turbo.hotwired.dev)
- Component examples in `app/views/components/`