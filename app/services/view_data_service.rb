# frozen_string_literal: true

# Service to prepare data for views, avoiding database queries in view components
class ViewDataService
  class << self
    # Prepare data for schedule popover component
    def schedule_popover_data(job:)
      {
        scheduled_dates: job.scheduled_date_times.includes(:users).order(:scheduled_date, :scheduled_time),
        available_technicians: available_technicians
      }
    end

    # Prepare data for job assignment dropdowns
    def job_assignment_data
      {
        available_technicians: available_technicians
      }
    end

    # Prepare data for people index view
    def people_index_data(people:)
      # Preload contact methods to avoid N+1
      people_with_contacts = people.includes(:contact_methods)

      # Build a hash of existing contact types for each person
      contact_types_by_person = {}
      people_with_contacts.each do |person|
        contact_types_by_person[person.id] = person.contact_methods.pluck(:contact_type)
      end

      {
        people: people_with_contacts,
        contact_types_by_person: contact_types_by_person
      }
    end

    # Prepare data for task list component
    def task_list_data(tasks_tree:)
      # Collect all task IDs from the tree
      task_ids = []
      collect_task_ids(tasks_tree, task_ids)

      # Preload last status changes for all tasks at once
      last_status_changes = ActivityLog
        .where(loggable_type: "Task", loggable_id: task_ids)
        .where(action: "status_changed")
        .where("metadata->>'new_status' = ?", "in_progress")
        .group(:loggable_id)
        .maximum(:created_at)

      # Precompute time in progress for all tasks
      time_in_progress = {}
      tasks_tree.each do |node|
        compute_time_in_progress(node, time_in_progress)
      end

      {
        last_status_changes: last_status_changes,
        time_in_progress: time_in_progress
      }
    end

    # Prepare data for job card component
    def job_card_data(jobs:)
      # Preload associations to avoid N+1
      jobs.includes(:client, :technicians)
    end

    private

    def available_technicians
      @available_technicians ||= User.where(role: [ :technician, :admin, :owner ]).order(:name).to_a
    end

    def collect_task_ids(tasks_tree, task_ids)
      tasks_tree.each do |node|
        task_ids << node[:task].id
        collect_task_ids(node[:subtasks], task_ids) if node[:subtasks].any?
      end
    end

    def compute_time_in_progress(node, time_in_progress)
      task = node[:task]
      # For now, use the existing method but this should be optimized later
      time_in_progress[task.id] = task.time_in_progress

      # Recurse for subtasks
      node[:subtasks].each do |subtask_node|
        compute_time_in_progress(subtask_node, time_in_progress)
      end if node[:subtasks].any?
    end
  end
end
