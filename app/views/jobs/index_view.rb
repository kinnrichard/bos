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
            div(class: "page-header") do
              h1 { "Jobs" }
              link_to("New Job", new_client_job_path(@client), class: "btn btn-primary")
            end
            
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
                  span(class: "job-status #{job.status}") { status_emoji(job) + " " + job.status.humanize }
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
      
      def empty_state
        div(class: "empty-state") do
          h2 { "No jobs yet" }
          p { "Create your first job to get started." }
          link_to("New Job", new_client_job_path(@client), class: "btn btn-primary")
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