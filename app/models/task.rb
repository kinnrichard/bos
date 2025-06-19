class Task < ApplicationRecord
  belongs_to :job
  belongs_to :assigned_to, class_name: 'User', optional: true
  
  has_many :notes, as: :notable, dependent: :destroy
  
  enum status: {
    new_task: 0,
    in_progress: 1,
    paused: 2,
    successfully_completed: 3,
    cancelled: 4
  }
  
  validates :title, presence: true
  validates :status, presence: true
  
  # For drag and drop reordering
  acts_as_list scope: :job
  
  # Set defaults
  after_initialize :set_defaults, if: :new_record?
  
  # Status emoji helpers
  def status_emoji
    case status
    when 'new_task' then '⚫️'
    when 'in_progress' then '🟢'
    when 'paused' then '⏸️'
    when 'successfully_completed' then '☑️'
    when 'cancelled' then '❌'
    end
  end
  
  private
  
  def set_defaults
    self.status ||= :new_task
  end
end
