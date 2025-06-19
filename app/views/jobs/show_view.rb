# frozen_string_literal: true

module Views
  module Jobs
    class ShowView < Views::Base
      def initialize(client:, job:)
        @client = client
        @job = job
      end

      def view_template
        render_layout(
          title: "#{@job.title} - #{@client.name}",
          current_user: current_user,
          active_section: :jobs,
          client: @client
        ) do
          div(class: "job-detail-container") do
            div(class: "job-header") do
              div do
                h1 { @job.title }
                div(class: "job-status-priority") do
                  span(class: "job-status-badge #{@job.status}") do
                    status_emoji(@job) + " " + @job.status.humanize
                  end
                  span(class: "job-priority-badge #{@job.priority}") do
                    @job.priority.humanize
                  end
                end
              end
              
              div(class: "job-actions") do
                link_to("Edit", edit_client_job_path(@client, @job), class: "btn btn-secondary")
                if current_user.can_delete?(@job)
                  delete_form_with_confirmation(
                    url: client_job_path(@client, @job),
                    message: "Are you sure you want to delete the job '#{@job.title}'? This will also delete all associated tasks and notes.",
                    checkbox_label: "I understand this will permanently delete this job and all its data"
                  ) { "Delete" }
                end
              end
            end
            
            # Job Details Section
            div(class: "job-info-section") do
              h2 { "Job Details" }
              
              div(class: "info-grid") do
                div(class: "info-item") do
                  div(class: "info-label") { "STATUS" }
                  div(class: "info-value") do
                    span(class: "job-status-badge #{@job.status}") do
                      status_emoji(@job) + " " + @job.status.humanize
                    end
                  end
                end
                
                div(class: "info-item") do
                  div(class: "info-label") { "PRIORITY" }
                  div(class: "info-value") do
                    span(class: "job-priority-badge #{@job.priority}") do
                      @job.priority.humanize
                    end
                  end
                end
                
                div(class: "info-item") do
                  div(class: "info-label") { "CREATED BY" }
                  div(class: "info-value") { @job.created_by.name }
                end
                
                div(class: "info-item") do
                  div(class: "info-label") { "CREATED" }
                  div(class: "info-value") { @job.created_at.strftime("%B %d, %Y at %I:%M %p") }
                end
                
                if @job.start_on_date
                  div(class: "info-item") do
                    div(class: "info-label") { "SCHEDULED DATE" }
                    div(class: "info-value") { @job.start_on_date.strftime("%B %d, %Y") }
                  end
                end
              end
              
              if @job.description.present?
                div(style: "margin-top: 24px;") do
                  h3(class: "info-label", style: "margin-bottom: 8px;") { "DESCRIPTION" }
                  div(class: "description-content") { @job.description }
                end
              end
            end
            
            # Assigned Technicians Section
            if @job.technicians.any?
              div(class: "job-info-section") do
                h2 { "Assigned Technicians" }
                div(class: "technicians-list") do
                  @job.technicians.each do |technician|
                    div(class: "technician-item") do
                      span(class: "technician-icon") { "👤" }
                      span { technician.name }
                      span(class: "technician-role") { technician.role.humanize }
                    end
                  end
                end
              end
            end
            
            # Related People Section
            if @job.people.any?
              div(class: "job-info-section") do
                h2 { "Related People" }
                div(class: "people-list") do
                  @job.people.each do |person|
                    div(class: "person-item") do
                      link_to(client_person_path(@client, person), class: "person-link") do
                        span(class: "person-icon") { "👤" }
                        span { person.name }
                      end
                    end
                  end
                end
              end
            end
            
            # Tasks Section
            div(class: "job-info-section") do
              div(class: "section-header") do
                h2 { "Tasks" }
                button(class: "btn btn-secondary btn-sm", data: { action: "click->job#addTask" }) do
                  "+ Add Task"
                end
              end
              
              if @job.tasks.any?
                div(class: "tasks-list") do
                  @job.tasks.order(:position).each do |task|
                    task_item(task)
                  end
                end
              else
                p(class: "empty-message") { "No tasks yet. Add a task to get started." }
              end
            end
            
            # Notes Section
            div(class: "job-info-section") do
              div(class: "section-header") do
                h2 { "Notes" }
                button(class: "btn btn-secondary btn-sm", data: { action: "click->job#addNote" }) do
                  "+ Add Note"
                end
              end
              
              if @job.notes.any?
                div(class: "notes-list") do
                  @job.notes.order(created_at: :desc).each do |note|
                    note_item(note)
                  end
                end
              else
                p(class: "empty-message") { "No notes yet." }
              end
            end
          end
        end
      end
      
      private
      
      def status_emoji(job)
        case job.status
        when 'open' then '🔵'
        when 'in_progress' then '🟢'
        when 'paused' then '⏸️'
        when 'waiting_for_customer' then '⏳'
        when 'waiting_for_scheduled_appointment' then '📅'
        when 'successfully_completed' then '✅'
        when 'cancelled' then '❌'
        else '❓'
        end
      end
      
      def task_item(task)
        div(class: "task-item", data: { task_id: task.id }) do
          div(class: "task-status") { task.status_emoji }
          div(class: "task-content") do
            div(class: "task-title") { task.title }
            if task.notes.any?
              div(class: "task-notes-count") { "#{task.notes.count} notes" }
            end
          end
          if task.assigned_to
            div(class: "task-assignee") { task.assigned_to.name }
          end
        end
      end
      
      def note_item(note)
        div(class: "note-item") do
          div(class: "note-header") do
            span(class: "note-author") { note.user.name }
            span(class: "note-date") { note.created_at.strftime("%b %d, %Y at %I:%M %p") }
          end
          div(class: "note-content") { note.content }
        end
      end
      
      def current_user
        # TODO: Replace with actual current user from authentication
        User.first || User.create!(
          name: 'System User',
          email: 'system@example.com',
          role: :admin
        )
      end
    end
  end
end