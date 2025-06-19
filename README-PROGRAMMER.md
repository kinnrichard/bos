# Case Management App - Technical Specification

I'm building a case management web app using Rails 8.0.2, Phlex, and Motion. The app manages Clients, Cases, Tasks, and Technicians with an Apple-inspired design language (similar to macOS 26).

## Technical Stack
- Rails 8.0.2 
- Phlex for all views and layouts (no ERB)
- Motion for components that need reactive state (search, drag-drop)
- Stimulus for simple interactions (clicks, hovers, focus management)
- PostgreSQL database
- Dark mode only (no light mode support)
- NO Turbo (keeping it simple)

## Component Strategy

### Use Phlex (default) for:
- All layouts and views
- Static components (navigation, cards, lists)
- Components that render once with server data
- Any component without client-side state

### Use Motion for:
- Search with live results
- Drag and drop interfaces
- Real-time updates
- Components with complex client state
- Forms with dynamic fields

### Use Stimulus for:
- Simple clicks (open/close, toggle)
- Focus management
- Keyboard shortcuts
- One-off DOM manipulations

## Phlex Patterns
Components are Ruby classes inheriting from ApplicationComponent. Use this DSL:
- HTML tags as methods: div, h1, nav, ul, li, etc.
- Attributes as keyword arguments: div(class: "sidebar", id: "main")
- Content in blocks: h1 { "Title" } or h1 { @user.name }
- Conditional rendering: div { "Active" if @case.active? }
- Iteration: @items.each { |item| li { item.name } }

Example Phlex component:
```ruby
class Sidebar < ApplicationComponent
  def initialize(current_user:, active_section: nil)
    @current_user = current_user
    @active_section = active_section
  end

  def template
    aside(class: "sidebar bg-gray-900 w-64 h-screen flex flex-col") do
      logo_section
      navigation_section
      bottom_section
    end
  end

  private

  def navigation_section
    nav(class: "flex-1 px-4 py-6") do
      section_header("Cases")
      nav_item("My Cases", icon: "👤", badge: my_cases_count)
      nav_item("Unassigned", icon: "❓", badge: unassigned_count)
      # etc...
    end
  end
  
  def nav_item(text, icon:, badge: nil)
    a(href: "#", class: "nav-item", data: { action: "click->navigation#navigate" }) do
      span { icon }
      span { text }
      badge_count(badge) if badge
    end
  end
end
```

## Motion Patterns
Use Motion for reactive components:

```ruby
# Search component with live results
class SearchBox < Motion::Component
  state :query, ""
  state :results, []
  state :focused, false
  
  def search
    return self.results = [] if query.blank?
    
    clients = Client.where("name ILIKE ?", "%#{query}%").limit(5)
    cases = Case.where("title ILIKE ?", "%#{query}%").limit(5)
    
    self.results = {
      clients: clients,
      cases: cases
    }
  end
  
  def view
    div(class: "relative") do
      input(
        type: "search",
        placeholder: "Search for Client or Case",
        value: query,
        class: "search-input",
        data: { action: "focus->search#open blur->search#close" },
        oninput: ->(e) { 
          self.query = e.target.value
          search
        }
      )
      
      if focused && (query.present? || true) # Always show "New Client"
        search_dropdown
      end
    end
  end
  
  private
  
  def search_dropdown
    div(class: "search-dropdown") do
      # Clients section
      div(class: "search-section") do
        h3 { "Clients" }
        
        # Always show "New Client..." option
        a(href: "/clients/new?name=#{query}", class: "search-result new-client") do
          "New Client..."
        end
        
        results[:clients]&.each do |client|
          a(href: "/clients/#{client.id}", class: "search-result") do
            client.name
          end
        end
      end
      
      # Cases section if any results
      if results[:cases]&.any?
        div(class: "search-section") do
          h3 { "Cases" }
          results[:cases].each do |case_record|
            a(href: "/cases/#{case_record.id}", class: "search-result") do
              case_record.title
            end
          end
        end
      end
    end
  end
end

# Task list with drag-and-drop
class TaskList < Motion::Component
  state :tasks, -> { @case.tasks.ordered }
  
  def reorder(task_id, new_position)
    task = tasks.find { |t| t.id == task_id.to_i }
    old_position = tasks.index(task)
    
    # Update in-memory state for instant feedback
    tasks.delete_at(old_position)
    tasks.insert(new_position, task)
    
    # Persist to database
    task.insert_at(new_position + 1) # acts_as_list is 1-indexed
    
    refresh!
  end
  
  def view
    div(
      class: "task-list",
      data: { controller: "sortable" }
    ) do
      tasks.each_with_index do |task, index|
        div(
          class: "task-item",
          data: { 
            task_id: task.id,
            sortable_handle: true
          },
          "data-drag-end": ->(e) { 
            reorder(e.target.dataset.taskId, e.newIndex) 
          }
        ) do
          render TaskItem.new(task: task)
        end
      end
    end
  end
end
```

## Design System
- Font: -apple-system, BlinkMacSystemFont, Inter, sans-serif
- Accent color: #00A3FF
- Background: Dark grays (#1C1C1E, #2C2C2E)
- Text: Light grays (#F2F2F7 primary, #C7C7CC secondary)
- Borders: #38383A
- Interactive elements: Subtle hover states with background color changes
- Spacing: Use consistent 4px grid (p-1, p-2, p-4, etc.)
- Border radius: rounded-lg for cards, rounded for buttons

## Data Models

```ruby
# Client
class Client < ApplicationRecord
  has_many :people, dependent: :destroy
  has_many :devices, dependent: :destroy
  has_many :cases, dependent: :destroy
  has_many :invoices, dependent: :destroy
  has_many :logs, as: :loggable
  
  enum client_type: { residential: 0, commercial: 1 }
  
  validates :name, presence: true, uniqueness: { case_sensitive: false }
  
  before_validation :normalize_name
  
  private
  
  def normalize_name
    self.name = name.strip.squeeze(" ") if name
  end
end

# Case
class Case < ApplicationRecord
  belongs_to :client
  has_many :case_assignments, dependent: :destroy
  has_many :technicians, through: :case_assignments, source: :user
  has_many :case_people, dependent: :destroy
  has_many :people, through: :case_people
  has_many :tasks, -> { order(position: :asc) }, dependent: :destroy
  has_many :notes, as: :notable, dependent: :destroy
  has_many :logs, as: :loggable
  
  enum status: {
    open: 0,
    in_progress: 1,
    paused: 2,
    waiting_for_customer: 3,
    waiting_for_appointment: 4,
    completed: 5,
    cancelled: 6
  }
  
  enum priority: {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
    proactive_followup: 4
  }
end

# Task
class Task < ApplicationRecord
  belongs_to :case
  belongs_to :assigned_to, class_name: "User", optional: true
  has_many :notes, as: :notable, dependent: :destroy
  has_many :logs, as: :loggable
  has_many :time_entries, dependent: :destroy
  
  acts_as_list scope: :case
  
  enum status: {
    new: 0,
    in_progress: 1,
    paused: 2,
    completed: 3,
    cancelled: 4
  }
  
  def total_time_spent
    time_entries.sum(:duration)
  end
end

# Person
class Person < ApplicationRecord
  belongs_to :client
  has_many :contact_methods, dependent: :destroy
  has_many :case_people, dependent: :destroy
  has_many :cases, through: :case_people
  
  validates :name, presence: true
end

# ContactMethod
class ContactMethod < ApplicationRecord
  belongs_to :person
  
  enum contact_type: { phone: 0, email: 1, address: 2 }
  
  validates :value, presence: true
end

# Log
class Log < ApplicationRecord
  belongs_to :user
  belongs_to :loggable, polymorphic: true
  
  scope :recent, -> { order(created_at: :desc) }
end

# TimeEntry
class TimeEntry < ApplicationRecord
  belongs_to :task
  belongs_to :user
  
  validates :started_at, presence: true
end
```

## Key UI Components

### Static Components (Phlex)

1. **Sidebar** - Navigation with badge counts
2. **Header** - Contains search and add note button  
3. **EmptyState** - Home page greeting
4. **ClientCard** - Icon-based navigation menu
5. **LogEntry** - Formatted activity logs
6. **TaskItem** - Individual task display (non-interactive parts)

### Reactive Components (Motion)

1. **SearchBox** - Live search with dropdown results
2. **TaskList** - Drag-and-drop reordering
3. **NotePopover** - Add note with file attachments
4. **TimeTracker** - Live time tracking display

### Simple Interactions (Stimulus)

```javascript
// navigation_controller.js - Handle sidebar clicks
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  navigate(event) {
    event.preventDefault()
    // Handle navigation without full page refresh
    window.location.href = event.currentTarget.href
  }
}

// popover_controller.js - Simple show/hide
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]
  
  toggle() {
    this.contentTarget.classList.toggle("hidden")
  }
  
  hide(event) {
    if (!this.element.contains(event.target)) {
      this.contentTarget.classList.add("hidden")
    }
  }
}

// sortable_controller.js - Initialize drag-and-drop
import { Controller } from "@hotwired/stimulus"
import Sortable from 'sortablejs'

export default class extends Controller {
  connect() {
    this.sortable = Sortable.create(this.element, {
      handle: '[data-sortable-handle]',
      animation: 150,
      onEnd: (event) => {
        // Motion handles the actual reordering
        const dragEndEvent = new CustomEvent('drag-end', {
          detail: { oldIndex: event.oldIndex, newIndex: event.newIndex }
        })
        event.item.dispatchEvent(dragEndEvent)
      }
    })
  }
}
```

## Example Home View Structure

```ruby
# app/views/home/show_view.rb
class Home::ShowView < ApplicationView
  def initialize(current_user:)
    @current_user = current_user
  end
  
  def template
    div(class: "flex h-screen bg-gray-900") do
      render Sidebar.new(
        current_user: @current_user,
        active_section: :home
      )
      
      main(class: "flex-1 flex flex-col") do
        render Header.new(current_user: @current_user)
        
        div(class: "flex-1 flex items-center justify-center") do
          render EmptyState.new(user: @current_user)
        end
      end
    end
  end
end

# app/views/components/header.rb  
class Header < ApplicationComponent
  def initialize(current_user:)
    @current_user = current_user
  end
  
  def template
    header(class: "header bg-gray-800 border-b border-gray-700") do
      div(class: "flex items-center justify-end px-6 py-4") do
        # Note button with popover
        div(class: "relative mr-4", data: { controller: "popover" }) do
          button(
            class: "btn-icon",
            data: { action: "click->popover#toggle" }
          ) { "+" }
          
          div(
            class: "hidden",
            data: { 
              popover_target: "content",
              action: "click@window->popover#hide"
            }
          ) do
            mount NotePopover.new(user: @current_user)
          end
        end
        
        # Search box (Motion component)
        mount SearchBox.new
      end
    end
  end
end

# app/views/components/empty_state.rb
class EmptyState < ApplicationComponent
  def initialize(user:)
    @user = user
  end
  
  def template
    div(class: "text-center") do
      h1(class: "text-3xl text-gray-100 mb-4") do
        "#{greeting}, #{@user.name}!"
      end
      
      p(class: "text-gray-400") do
        plain "Get started by opening "
        a(href: "/cases?filter=mine", class: "text-blue-400") { "My Cases" }
        plain "."
      end
      
      p(class: "text-gray-400") do
        plain "You can also "
        a(
          href: "#",
          class: "text-blue-400",
          data: { action: "click->search#focus" }
        ) { "search" }
        plain " for a client or case."
      end
    end
  end
  
  private
  
  def greeting
    hour = Time.current.hour
    case hour
    when 0..11 then "Good morning"
    when 12..17 then "Good afternoon"
    else "Good evening"
    end
  end
end
```

## Component Organization

```
app/
  views/
    application_view.rb        # Base class for views
    components/
      application_component.rb # Base class for Phlex components
      # Static Phlex components
      sidebar.rb
      header.rb
      empty_state.rb
      task_item.rb
      log_entry.rb
      # Motion components  
      search_box.rb
      task_list.rb
      note_popover.rb
    layouts/
      application_layout.rb
    home/
      show_view.rb
    clients/
      show_view.rb
      index_view.rb
    cases/
      show_view.rb
```

## Key Implementation Notes

1. **Motion components are mounted**, not rendered:
   ```ruby
   mount SearchBox.new  # Motion component
   render Sidebar.new   # Phlex component
   ```

2. **Keep Motion state minimal** - only what needs to be reactive

3. **Use data attributes** for Stimulus hooks on Phlex components

4. **Avoid mixing Motion and complex Stimulus** in the same component

5. **Server calls in Motion** should update state, which triggers re-renders

## UI Specifications

### Home Page
- Search box at top right for searching Clients or Cases
- Plus button (left of search) shows popover for adding notes to Inbox
- Sidebar with:
  - Faultless (logo/brand)
  - 🕘 Recents
  - **Cases** section:
    - 👤 My Cases (with count badge)
    - ❓ Unassigned (with count badge)
    - 👥 Assigned to Others
    - ☑️ Closed
  - 📜 Logs (bottom-anchored if space)
  - ⚙️ Settings (bottom-anchored if space)
- Main view shows centered greeting:
  - "Good morning/afternoon/evening, [Username]!"
  - "Get started by opening My Cases."
  - "You can also search for a client or case."

### Search Behavior
- Real-time results grouped by type
- Clients section always first
- Always shows "New Client..." option (even with no matches)
- Client names must be unique (case-insensitive, whitespace-normalized)

### Client View
- Client name at top
- Icon-based navigation:
  - 👤 People
  - 💻 Devices
  - 💼 Cases (with count)
  - 🗓️ Schedule (with count)
  - 🧾 Invoices
  - ℹ️ Client Info
  - 📜 Logs

### Case Management
- Cases have:
  - Status: Open, In Progress, Paused, Waiting for Customer, Waiting for Scheduled Appointment, Successfully Completed, Cancelled
  - Priority: Critical, High, Normal, Low, Proactive Followup
  - Can be assigned to multiple technicians
  - Can involve multiple people from client
  - Optional due date/time and start date/time
  - List of tasks (main view content)

### Tasks
- Have status: New, In Progress, Paused, Successfully Completed, Cancelled
- Can be reordered by dragging
- Can be assigned to any technician assigned to the case
- Can have notes (text and/or attachments)
- Track time spent in "In Progress" status

### Activity Logging
All actions are logged with timestamp and user:
- "Oliver created 🏢 Acme"
- "Oliver viewed Acme"
- "Oliver renamed Acme to Acme, Inc."
- "Oliver created 💼 Server Migration for 🏢 Acme, Inc."
- "Oliver added ☑️ Transfer data to new PC to 💼 Server Migration"
- "Oliver marked 💼 Server Migration 🟢 In Progress"
- "Oliver assigned 💼 Server Migration to himself"
- "Oliver marked ☑️ Transfer data to new PC ☑️ Complete"

## Development Instructions

Please build this application following these specifications, using Phlex for most components, Motion for reactive state, and minimal Stimulus for simple interactions. Start with the home screen layout including the static Phlex sidebar, header with Motion search component, and empty state.

Observe all of the images in ./mockups/ before building the UI. The very background of the web page will be solid black, and on top of that will be a rounded dark-gray rectangle, just like shown in the mockups.

When you're finished with a feature, use Puppeteer to test the UI and UX, take and observe screenshots, and then make any tweaks needed to improve the behavior. Once you've reached a small milestone (like getting the rounded rectangle to look like the mockup) and you've checked for bugs, commit it to git and push it to the remote server.

Remember:
- No ERB templates - everything is Phlex
- Motion only for components with client-side state
- Stimulus only for simple DOM interactions
- No Turbo - keep it simple
- Dark mode only
- macOS 26-inspired design language