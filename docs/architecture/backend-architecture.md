# bŏs Backend Architecture

## Overview

This document describes the backend architecture of bŏs, a Rails 8 application following conventional Rails patterns with some modern enhancements. The backend handles business logic, data persistence, authentication, and API responses.

## Quick Reference

**Key Technologies:**
- Rails 8.0.2 with Ruby 3.4.4
- PostgreSQL database
- Solid Queue for background jobs
- Solid Cache for caching
- Bcrypt for authentication

**Key Patterns:**
- RESTful controllers
- Skinny controllers, fat models
- Concerns for shared behavior
- Service objects for complex operations

## Architecture Layers

### 1. Request Flow

```
Browser Request
    ↓
Routes (config/routes.rb)
    ↓
Controller (app/controllers/)
    ↓
Model/Service (app/models/, app/services/)
    ↓
Database (PostgreSQL)
    ↓
Response (Phlex Component)
```

### 2. MVC Structure

```
app/
├── controllers/       # Handle HTTP requests
├── models/           # Business logic & data
├── views/            # Phlex components (NOT ERB!)
├── services/         # Complex business operations
├── jobs/            # Background tasks
└── mailers/         # Email notifications
```

## Controllers

### Base Controller
```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  # Security
  protect_from_forgery with: :exception
  
  # Authentication
  before_action :require_authentication
  helper_method :current_user, :logged_in?
  
  private
  
  def current_user
    @current_user ||= User.find(session[:user_id]) if session[:user_id]
  end
  
  def logged_in?
    current_user.present?
  end
  
  def require_authentication
    unless logged_in?
      flash[:alert] = "You must be logged in to access this page"
      redirect_to login_path
    end
  end
  
  def require_admin
    unless current_user&.admin?
      flash[:alert] = "Unauthorized access"
      redirect_to root_path
    end
  end
end
```

### RESTful Controller Pattern
```ruby
# app/controllers/clients_controller.rb
class ClientsController < ApplicationController
  before_action :set_client, only: [:show, :edit, :update, :destroy]
  before_action :authorize_client, only: [:edit, :update, :destroy]
  
  # GET /clients
  def index
    @clients = Client.active
                     .includes(:jobs, :devices, :people)
                     .order(:name)
    
    # Filter if search params present
    @clients = @clients.search(params[:q]) if params[:q].present?
    
    # Render Phlex component
    render Components::Clients::IndexComponent.new(
      clients: @clients,
      current_user: current_user
    )
  end
  
  # GET /clients/1
  def show
    @jobs = @client.jobs.recent.includes(:tasks)
    @devices = @client.devices.ordered
    @people = @client.people.active
    
    render Components::Clients::ShowComponent.new(
      client: @client,
      jobs: @jobs,
      devices: @devices,
      people: @people
    )
  end
  
  # GET /clients/new
  def new
    @client = Client.new
    render Components::Clients::FormComponent.new(
      client: @client,
      url: clients_path
    )
  end
  
  # POST /clients
  def create
    @client = Client.new(client_params)
    
    if @client.save
      ActivityLog.create!(
        user: current_user,
        action: "created_client",
        trackable: @client
      )
      
      redirect_to @client, notice: "Client was successfully created."
    else
      render Components::Clients::FormComponent.new(
        client: @client,
        url: clients_path
      ), status: :unprocessable_entity
    end
  end
  
  # PATCH/PUT /clients/1
  def update
    if @client.update(client_params)
      ActivityLog.create!(
        user: current_user,
        action: "updated_client",
        trackable: @client
      )
      
      redirect_to @client, notice: "Client was successfully updated."
    else
      render Components::Clients::FormComponent.new(
        client: @client,
        url: client_path(@client)
      ), status: :unprocessable_entity
    end
  end
  
  # DELETE /clients/1
  def destroy
    @client.destroy!
    redirect_to clients_url, notice: "Client was successfully deleted."
  end
  
  private
  
  def set_client
    @client = Client.find(params[:id])
  end
  
  def authorize_client
    unless can_manage_client?(@client)
      redirect_to clients_path, alert: "Not authorized"
    end
  end
  
  def can_manage_client?(client)
    current_user.admin? || current_user.manages?(client)
  end
  
  def client_params
    params.require(:client).permit(
      :name, :code, :address, :phone, :email,
      :status, :notes, :billing_rate
    )
  end
end
```

### API Controllers
```ruby
# app/controllers/api/v1/clients_controller.rb
module Api
  module V1
    class ClientsController < Api::BaseController
      # Returns JSON instead of Phlex components
      def index
        clients = Client.active.includes(:jobs)
        render json: clients, 
               each_serializer: ClientSerializer,
               meta: { total: clients.count }
      end
      
      def show
        client = Client.find(params[:id])
        render json: client, serializer: ClientDetailSerializer
      end
    end
  end
end
```

## Models

### ActiveRecord Models
```ruby
# app/models/client.rb
class Client < ApplicationRecord
  # Constants
  STATUSES = %w[active inactive pending].freeze
  
  # Associations
  has_many :jobs, dependent: :destroy
  has_many :devices, dependent: :destroy
  has_many :people, dependent: :destroy
  has_many :tasks, through: :jobs
  has_many :activity_logs, as: :trackable
  
  # Validations
  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :code, presence: true, 
                   uniqueness: { case_sensitive: false },
                   format: { with: /\A[A-Z0-9]+\z/, message: "must be uppercase alphanumeric" }
  validates :status, inclusion: { in: STATUSES }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  
  # Callbacks
  before_validation :normalize_attributes
  after_create :create_default_settings
  
  # Scopes
  scope :active, -> { where(status: "active") }
  scope :inactive, -> { where(status: "inactive") }
  scope :with_recent_activity, -> { 
    joins(:jobs).where(jobs: { created_at: 30.days.ago.. }).distinct 
  }
  
  # Search
  scope :search, ->(query) {
    where("name ILIKE :q OR code ILIKE :q", q: "%#{query}%")
  }
  
  # Instance methods
  def display_name
    "#{name} (#{code})"
  end
  
  def total_hours_this_month
    tasks.completed
         .where(completed_at: Time.current.beginning_of_month..)
         .sum(:hours)
  end
  
  def active?
    status == "active"
  end
  
  def archive!
    transaction do
      update!(status: "inactive")
      jobs.active.update_all(status: "archived")
    end
  end
  
  private
  
  def normalize_attributes
    self.name = name&.strip
    self.code = code&.upcase&.strip
    self.email = email&.downcase&.strip
  end
  
  def create_default_settings
    # Create any default associated records
  end
end
```

### Concerns
```ruby
# app/models/concerns/trackable.rb
module Trackable
  extend ActiveSupport::Concern
  
  included do
    has_many :activity_logs, as: :trackable, dependent: :destroy
    
    after_create :log_creation
    after_update :log_update
    before_destroy :log_destruction
  end
  
  private
  
  def log_creation
    return if skip_activity_logging?
    
    ActivityLog.create!(
      user: Current.user,
      action: "created",
      trackable: self,
      details: attributes_for_logging
    )
  end
  
  def log_update
    return if skip_activity_logging? || !saved_changes?
    
    ActivityLog.create!(
      user: Current.user,
      action: "updated",
      trackable: self,
      details: saved_changes.except("updated_at")
    )
  end
  
  def log_destruction
    return if skip_activity_logging?
    
    ActivityLog.create!(
      user: Current.user,
      action: "destroyed",
      trackable_type: self.class.name,
      trackable_id: id,
      details: attributes_for_logging
    )
  end
  
  def skip_activity_logging?
    Current.skip_logging || self.is_a?(ActivityLog)
  end
  
  def attributes_for_logging
    attributes.except("created_at", "updated_at")
  end
end
```

## Service Objects

### Service Object Pattern
```ruby
# app/services/job_scheduler.rb
class JobScheduler
  class DoubleBookingError < StandardError; end
  
  def initialize(client:, technician:, scheduled_for:, duration: 2.hours)
    @client = client
    @technician = technician
    @scheduled_for = scheduled_for
    @duration = duration
  end
  
  def schedule
    validate_availability!
    
    ActiveRecord::Base.transaction do
      job = create_job
      create_tasks(job)
      send_notifications(job)
      job
    end
  end
  
  private
  
  attr_reader :client, :technician, :scheduled_for, :duration
  
  def validate_availability!
    if technician_busy?
      raise DoubleBookingError, 
        "#{technician.name} is already booked at #{scheduled_for}"
    end
  end
  
  def technician_busy?
    technician.jobs
              .where(scheduled_for: time_range)
              .exists?
  end
  
  def time_range
    scheduled_for..(scheduled_for + duration)
  end
  
  def create_job
    Job.create!(
      client: client,
      assigned_to: technician,
      scheduled_for: scheduled_for,
      estimated_duration: duration,
      status: "scheduled"
    )
  end
  
  def create_tasks(job)
    default_tasks.each do |task_template|
      job.tasks.create!(
        title: task_template[:title],
        description: task_template[:description],
        estimated_hours: task_template[:hours]
      )
    end
  end
  
  def default_tasks
    [
      { title: "Initial Assessment", description: "Evaluate client needs", hours: 0.5 },
      { title: "Implementation", description: "Complete requested work", hours: 1.0 },
      { title: "Documentation", description: "Update client records", hours: 0.5 }
    ]
  end
  
  def send_notifications(job)
    JobNotificationMailer.scheduled(job).deliver_later
    TechnicianNotifier.new(job).notify
  end
end

# Usage in controller
def create
  scheduler = JobScheduler.new(
    client: @client,
    technician: current_user,
    scheduled_for: params[:scheduled_for]
  )
  
  begin
    @job = scheduler.schedule
    redirect_to @job, notice: "Job scheduled successfully"
  rescue JobScheduler::DoubleBookingError => e
    redirect_back fallback_location: root_path, 
                  alert: e.message
  end
end
```

### Query Objects
```ruby
# app/queries/client_report_query.rb
class ClientReportQuery
  def initialize(start_date:, end_date:, status: nil)
    @start_date = start_date
    @end_date = end_date
    @status = status
  end
  
  def call
    scope = Client.includes(:jobs, :tasks)
    scope = scope.where(status: status) if status.present?
    
    scope.select(
      "clients.*",
      "COUNT(DISTINCT jobs.id) as job_count",
      "SUM(tasks.hours) as total_hours",
      "SUM(tasks.hours * clients.billing_rate) as total_revenue"
    )
    .joins(jobs: :tasks)
    .where(jobs: { created_at: start_date..end_date })
    .where(tasks: { status: "completed" })
    .group("clients.id")
    .order("total_revenue DESC")
  end
  
  private
  
  attr_reader :start_date, :end_date, :status
end

# Usage
results = ClientReportQuery.new(
  start_date: 1.month.ago,
  end_date: Date.current,
  status: "active"
).call
```

## Background Jobs

### Solid Queue Jobs
```ruby
# app/jobs/report_generator_job.rb
class ReportGeneratorJob < ApplicationJob
  queue_as :reports
  
  def perform(user, report_type, params = {})
    report = build_report(report_type, params)
    file = generate_file(report)
    
    ReportMailer.completed(user, file).deliver_later
  ensure
    file&.close
    file&.unlink if file&.path
  end
  
  private
  
  def build_report(type, params)
    case type
    when "client_summary"
      ClientSummaryReport.new(params)
    when "technician_hours"
      TechnicianHoursReport.new(params)
    else
      raise ArgumentError, "Unknown report type: #{type}"
    end
  end
  
  def generate_file(report)
    tempfile = Tempfile.new(["report", ".csv"])
    report.to_csv(tempfile)
    tempfile.rewind
    tempfile
  end
end

# Usage
ReportGeneratorJob.perform_later(
  current_user,
  "client_summary",
  { start_date: 1.month.ago, end_date: Date.current }
)
```

## Authentication

### Session-Based Auth
```ruby
# app/controllers/sessions_controller.rb
class SessionsController < ApplicationController
  skip_before_action :require_authentication, only: [:new, :create]
  
  def new
    redirect_to root_path if logged_in?
    render Components::Sessions::LoginComponent.new
  end
  
  def create
    user = User.find_by(email: params[:email].downcase)
    
    if user&.authenticate(params[:password])
      session[:user_id] = user.id
      user.update!(last_login_at: Time.current)
      
      redirect_to root_path, notice: "Welcome back, #{user.name}!"
    else
      flash.now[:alert] = "Invalid email or password"
      render Components::Sessions::LoginComponent.new, 
             status: :unprocessable_entity
    end
  end
  
  def destroy
    session.delete(:user_id)
    redirect_to login_path, notice: "You have been logged out"
  end
end
```

### User Model with Bcrypt
```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_secure_password
  
  # Roles
  ROLES = %w[admin technician viewer].freeze
  
  # Validations
  validates :email, presence: true, 
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :name, presence: true
  validates :role, inclusion: { in: ROLES }
  validates :password, length: { minimum: 8 }, if: :password_required?
  
  # Callbacks
  before_validation :normalize_email
  
  # Scopes
  scope :active, -> { where(active: true) }
  scope :technicians, -> { where(role: "technician") }
  scope :admins, -> { where(role: "admin") }
  
  # Role checks
  def admin?
    role == "admin"
  end
  
  def technician?
    role == "technician"
  end
  
  def can_manage?(resource)
    admin? || resource.assigned_to == self
  end
  
  private
  
  def normalize_email
    self.email = email&.downcase&.strip
  end
  
  def password_required?
    new_record? || password.present?
  end
end
```

## Database Queries

### Query Optimization
```ruby
# Bad - N+1 query
clients = Client.all
clients.each do |client|
  puts client.jobs.count  # Executes query for each client
end

# Good - Eager loading
clients = Client.includes(:jobs)
clients.each do |client|
  puts client.jobs.size   # No additional queries
end

# Better - Counter cache
class Client < ApplicationRecord
  has_many :jobs, counter_cache: true
end
# Now use client.jobs_count

# Complex eager loading
clients = Client.includes(
  :devices,
  :people,
  jobs: [:tasks, :assigned_to]
).where(status: "active")
```

### Database Indexes
```ruby
# db/migrate/xxx_add_indexes.rb
class AddIndexes < ActiveRecord::Migration[7.2]
  def change
    # Foreign keys (Rails adds these automatically now)
    # add_index :jobs, :client_id
    # add_index :jobs, :assigned_to_id
    
    # Lookup fields
    add_index :clients, :code, unique: true
    add_index :clients, :status
    add_index :users, :email, unique: true
    
    # Composite indexes for common queries
    add_index :jobs, [:client_id, :status]
    add_index :tasks, [:job_id, :status, :position]
    
    # Full text search
    execute <<-SQL
      CREATE INDEX clients_search_idx ON clients 
      USING gin(to_tsvector('english', name || ' ' || code))
    SQL
  end
end
```

## Caching

### Solid Cache Usage
```ruby
# Low-level caching
def expensive_calculation
  Rails.cache.fetch("stats/#{id}/monthly", expires_in: 1.hour) do
    jobs.completed
        .where(completed_at: 1.month.ago..)
        .sum(:total_hours)
  end
end

# Russian doll caching in Phlex
class ClientCardComponent < ApplicationComponent
  def view_template
    cache_key = ["client_card", @client, @client.jobs.maximum(:updated_at)]
    
    Rails.cache.fetch(cache_key, expires_in: 1.day) do
      render_card_content
    end
  end
end

# Cache clearing
class Client < ApplicationRecord
  after_update :clear_caches
  
  private
  
  def clear_caches
    Rails.cache.delete_matched("stats/#{id}/*")
  end
end
```

## Error Handling

### Application-Wide Error Handling
```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActionController::ParameterMissing, with: :bad_request
  
  private
  
  def not_found
    render Components::Errors::NotFoundComponent.new, 
           status: :not_found
  end
  
  def bad_request(exception)
    render Components::Errors::BadRequestComponent.new(
      message: exception.message
    ), status: :bad_request
  end
end
```

## API Design

### RESTful Routes
```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "dashboard#index"
  
  # Authentication
  get "login", to: "sessions#new"
  post "login", to: "sessions#create"
  delete "logout", to: "sessions#destroy"
  
  # Resources
  resources :clients do
    resources :jobs, shallow: true do
      resources :tasks do
        member do
          patch :complete
          patch :reorder
        end
      end
    end
    
    resources :devices
    resources :people
  end
  
  # API
  namespace :api do
    namespace :v1 do
      resources :clients, only: [:index, :show]
      resources :jobs, only: [:index, :show, :update]
    end
  end
  
  # Admin
  namespace :admin do
    resources :users
    resources :activity_logs, only: [:index]
  end
end
```

## Security Best Practices

1. **Strong Parameters** - Always whitelist allowed parameters
2. **CSRF Protection** - Enabled by default in ApplicationController
3. **SQL Injection** - Use parameterized queries, never string interpolation
4. **Authentication** - Require for all actions except public pages
5. **Authorization** - Check permissions before actions
6. **Secrets** - Use Rails credentials for sensitive data

## Performance Guidelines

1. **Use eager loading** to prevent N+1 queries
2. **Add database indexes** for foreign keys and lookup fields
3. **Cache expensive calculations** with Solid Cache
4. **Use counter caches** for association counts
5. **Paginate large datasets** with Pagy or Kaminari
6. **Background jobs** for slow operations
7. **Database views** for complex reports

## Testing Approach

See [Testing Strategy](./testing-strategy.md) for details, but key points:
- Controllers: Test request/response cycle
- Models: Test validations, scopes, and business logic
- Services: Test complex operations in isolation
- Jobs: Test job execution and side effects

## Common Patterns

### Form Objects
```ruby
# app/forms/client_form.rb
class ClientForm
  include ActiveModel::Model
  
  attr_accessor :name, :code, :email, :send_welcome
  
  validates :name, :code, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  
  def save
    return false unless valid?
    
    ActiveRecord::Base.transaction do
      client = Client.create!(client_attributes)
      send_welcome_email if send_welcome
      client
    end
  end
  
  private
  
  def client_attributes
    { name: name, code: code, email: email }
  end
  
  def send_welcome_email
    ClientMailer.welcome(client).deliver_later
  end
end
```

### Presenter Pattern
```ruby
# app/presenters/client_presenter.rb
class ClientPresenter
  delegate_missing_to :@client
  
  def initialize(client)
    @client = client
  end
  
  def status_badge
    {
      text: status.humanize,
      variant: status_variant
    }
  end
  
  def last_activity
    last_job = jobs.order(created_at: :desc).first
    return "No activity" unless last_job
    
    "#{time_ago_in_words(last_job.created_at)} ago"
  end
  
  private
  
  def status_variant
    case status
    when "active" then :success
    when "inactive" then :danger
    else :warning
    end
  end
end
```

Remember: Keep controllers thin, models focused on persistence and domain logic, and use service objects for complex operations.