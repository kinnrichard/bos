class PersonSerializer < ApplicationSerializer
  set_type :users

  attributes :name, :email, :role

  timestamp_attributes :created_at, :updated_at

  # Name components
  attribute :first_name do |user|
    user.first_name
  end

  attribute :last_name do |user|
    parts = user.name.split
    parts.size > 1 ? parts[1..].join(" ") : nil
  end

  attribute :full_name do |user|
    user.name
  end

  # API compatibility attribute
  attribute :status do |user|
    "active"
  end

  # Role and permissions
  attribute :is_active do |user|
    true
  end

  attribute :is_technician do |user|
    user.technician?
  end

  attribute :is_admin do |user|
    user.admin?
  end

  attribute :can_manage_jobs do |user|
    user.technician? || user.admin? || user.owner?
  end

  # Additional timestamps
  attribute :last_seen_at do |user|
    user.updated_at
  end

  # Relationships
  has_many :assigned_tasks, serializer: TaskSerializer
  has_many :created_jobs, serializer: JobSerializer
  has_many :technician_jobs, serializer: JobSerializer
  has_many :notes, serializer: NoteSerializer
end
