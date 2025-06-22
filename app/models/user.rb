class User < ApplicationRecord
  has_secure_password validations: false

  has_many :activity_logs
  has_many :assigned_jobs, class_name: "Job", foreign_key: "assigned_to_id"
  has_many :assigned_tasks, class_name: "Task", foreign_key: "assigned_to_id"
  has_many :technician_jobs, through: :job_technicians, source: :job
  has_many :job_technicians
  has_many :scheduled_date_time_users, dependent: :destroy
  has_many :scheduled_date_times, through: :scheduled_date_time_users

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

  # Thread-safe current user storage
  thread_cattr_accessor :current_user

  def can_delete?(resource)
    return true if owner?
    return false unless technician? || customer_specialist? || admin?

    # Technicians can delete their own resources within 5 minutes
    if resource.respond_to?(:created_by_id) && resource.created_by_id == id
      resource.created_at > 5.minutes.ago
    else
      admin?
    end
  end

  private

  def downcase_email
    self.email = email.downcase if email.present?
  end

  def password_required?
    new_record? || password.present?
  end
end
