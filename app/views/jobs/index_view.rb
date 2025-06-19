# frozen_string_literal: true

module Views
  module Jobs
    class IndexView < Views::Base
      def initialize(client:, jobs:)
        @client = client
        @jobs = jobs
      end

      def view_template
        render_layout(
          title: "Jobs - #{@client.name}",
          current_user: current_user,
          active_section: :jobs,
          client: @client
        ) do
          div(class: "jobs-container") do
            render Components::PageHeader.new(
              title: "Jobs",
              action_text: "New Job",
              action_path: new_client_job_path(@client)
            )
            
            if @jobs.any?
              div(class: "jobs-list") do
                @jobs.each do |job|
                  job_card(job)
                end
              end
            else
              empty_state
            end
          end
        end
      end
      
      private
      
      def job_card(job)
        div(class: "job-card") do
          link_to(client_job_path(@client, job), class: "job-card-link") do
            div(class: "job-header") do
              div do
                h3 { job.title }
                div(class: "job-meta") do
                  span(class: "job-status #{job.status}") { status_with_emoji(job.status) }
                  span(class: "job-priority #{job.priority}") { "• " + job.priority.humanize }
                  if job.technicians.any?
                    span(class: "job-assignees") do
                      "• Assigned to: #{job.technicians.map(&:name).join(', ')}"
                    end
                  end
                end
              end
              
              if job.tasks.any?
                div(class: "job-tasks-summary") do
                  completed = job.tasks.where(status: :successfully_completed).count
                  total = job.tasks.count
                  span { "#{completed}/#{total} tasks" }
                end
              end
            end
            
            if job.description.present?
              p(class: "job-description") { job.description.truncate(150) }
            end
            
            div(class: "job-footer") do
              span(class: "job-created") { "Created #{time_ago_in_words(job.created_at)} ago" }
              if job.start_on_date
                span(class: "job-scheduled") { "• Scheduled: #{job.start_on_date.strftime('%b %d, %Y')}" }
              end
            end
          end
        end
      end
      
      
      def empty_state
        render Components::GenericEmptyState.new(
          title: "No jobs yet",
          message: "Create your first job to get started.",
          action_text: "New Job",
          action_path: new_client_job_path(@client)
        )
      end
      
    end
  end
end