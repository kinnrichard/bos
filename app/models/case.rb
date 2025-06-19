class Case < ApplicationRecord
  self.table_name = "cases"
  belongs_to :client
  belongs_to :created_by, class_name: 'User'
  
  has_many :case_assignments, dependent: :destroy
  has_many :technicians, through: :case_assignments, source: :user
  has_many :case_people, dependent: :destroy
  has_many :people, through: :case_people
  has_many :tasks, dependent: :destroy
  has_many :notes, as: :notable, dependent: :destroy
  
  enum status: {
    open: 0,
    in_progress: 1,
    paused: 2,
    waiting_for_customer: 3,
    waiting_for_scheduled_appointment: 4,
    successfully_completed: 5,
    cancelled: 6
  }
  
  enum priority: {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
    proactive_followup: 4
  }
  
  validates :title, presence: true
  validates :status, presence: true
  validates :priority, presence: true
  
  # Scopes
  scope :my_cases, ->(user) { joins(:case_assignments).where(case_assignments: { user_id: user.id }) }
  scope :unassigned, -> { left_joins(:case_assignments).where(case_assignments: { id: nil }) }
  scope :assigned_to_others, ->(user) { 
    joins(:case_assignments)
    .where.not(case_assignments: { user_id: user.id })
    .distinct 
  }
  scope :closed, -> { where(status: [:successfully_completed, :cancelled]) }
  
  # Set defaults
  after_initialize :set_defaults, if: :new_record?
  
  private
  
  def set_defaults
    self.status ||= :open
    self.priority ||= :normal
  end
end
