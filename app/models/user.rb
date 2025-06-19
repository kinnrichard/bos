class User < ApplicationRecord
  has_many :activity_logs
  has_many :assigned_jobs, class_name: 'Job', foreign_key: 'assigned_to_id'
  has_many :assigned_tasks, class_name: 'Task', foreign_key: 'assigned_to_id'
  has_many :technician_jobs, through: :job_technicians, source: :job
  has_many :job_technicians
  
  enum :role, {
    admin: 0,
    technician: 1,
    customer_specialist: 2,
    superadmin: 3
  }
  
  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :role, presence: true
  
  before_validation :downcase_email
  
  # Thread-safe current user storage
  thread_cattr_accessor :current_user
  
  def can_delete?(resource)
    return true if superadmin?
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
end
