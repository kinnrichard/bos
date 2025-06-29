class JobSerializer < ApplicationSerializer
  set_type :jobs

  attributes :title, :description, :status, :priority

  timestamp_attributes :created_at, :updated_at

  attribute :due_on
  attribute :due_time
  attribute :start_on
  attribute :start_time

  # Relationships - clean and simple with UUID primary keys
  belongs_to :client
  belongs_to :created_by, serializer: :user

  has_many :technicians, serializer: :user
  has_many :people
  has_many :tasks
  has_many :notes
  has_many :scheduled_date_times

  # Computed attributes
  attribute :status_label do |job|
    job.status&.humanize&.titleize
  end

  attribute :priority_label do |job|
    job.priority&.humanize&.titleize
  end

  attribute :is_overdue do |job|
    if job.due_on && job.due_time
      due_datetime = Time.zone.parse("#{job.due_on} #{job.due_time}")
      due_datetime < Time.current && !job.successfully_completed?
    else
      false
    end
  end

  attribute :task_counts do |job|
    {
      total: job.tasks.count,
      completed: job.tasks.where(status: "successfully_completed").count,
      pending: job.tasks.where(status: "new_task").count,
      in_progress: job.tasks.where(status: "in_progress").count
    }
  end
end
