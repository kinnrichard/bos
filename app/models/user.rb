class User < ApplicationRecord
  include Loggable

  has_secure_password validations: false

  has_many :activity_logs
  has_many :assigned_jobs, class_name: "Job", foreign_key: "assigned_to_id"
  has_many :assigned_tasks, class_name: "Task", foreign_key: "assigned_to_id"
  has_many :job_assignments
  has_many :technician_jobs, through: :job_assignments, source: :job
  has_many :scheduled_date_time_users, dependent: :destroy
  has_many :scheduled_date_times, through: :scheduled_date_time_users
  has_many :notes, dependent: :destroy
  has_many :created_jobs, class_name: "Job", foreign_key: "created_by_id", dependent: :nullify
  has_many :refresh_tokens, dependent: :destroy
  has_many :revoked_tokens, dependent: :destroy

  enum :role, {
    admin: 0,
    technician: 1,
    customer_specialist: 2,
    owner: 3
  }

  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true
  validates :password, length: { minimum: 6 }, if: :password_required?

  before_validation :downcase_email
  before_validation :strip_name

  # Thread-safe current user storage
  thread_cattr_accessor :current_user

  def can_delete?(resource)
    case resource
    when Device, Person
      # Only owners and admins can delete devices and people
      owner? || admin?
    when Job
      # Owners can delete any job
      return true if owner?

      # Other roles can only delete their own jobs within 5 minutes
      return false unless technician? || customer_specialist? || admin?

      if resource.respond_to?(:created_by_id) && resource.created_by_id == id
        resource.created_at > 5.minutes.ago
      else
        false
      end
    else
      # Default behavior for other resources
      return true if owner?
      return false unless technician? || customer_specialist? || admin?

      # Can delete their own resources within 5 minutes
      if resource.respond_to?(:created_by_id) && resource.created_by_id == id
        resource.created_at > 5.minutes.ago
      else
        false
      end
    end
  end

  # UserDisplay integration
  def display
    @display ||= UserDisplay.new(self)
  end

  # Delegate display methods
  delegate :initials, :avatar_color, :avatar_style, :avatar_html,
           :display_name, :short_name, :display_email, :role_label,
           to: :display

  def first_name
    name.split.first if name.present?
  end

  private

  def downcase_email
    self.email = email.downcase if email.present?
  end

  def strip_name
    self.name = name.strip if name.present?
  end

  def password_required?
    new_record? || password.present?
  end
end
