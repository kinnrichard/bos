# frozen_string_literal: true

module Components
  class JobCard < Base
    include Phlex::Rails::Helpers::LinkTo
    include Phlex::Rails::Helpers::TimeAgoInWords
    include JobStatusHelper
    
    def initialize(job:, show_client: true, show_description: false, client: nil)
      @job = job
      @show_client = show_client
      @show_description = show_description
      @client = client
    end
    
    def view_template
      link_to job_path, 
              class: "job-card",
              data: { turbo: false } do
        div(class: "job-card-header") do
          h3(class: "job-title") { @job.title }
          div(class: "job-meta") do
            if @show_client
              span(class: "client-name") { @job.client.name }
              span(class: "separator") { "•" }
            end
            span(class: "job-date") { "Created #{time_ago_in_words(@job.created_at)} ago" }
            if @job.start_on_date
              span(class: "separator") { "•" }
              span(class: "job-scheduled") { "Scheduled: #{@job.start_on_date.strftime('%b %d, %Y')}" }
            end
          end
        end
        
        if @show_description && @job.description.present?
          div(class: "job-description") do
            plain @job.description.truncate(150)
          end
        end
        
        div(class: "job-status-row") do
          # Status
          span(class: "status-badge status-#{@job.status}") do
            span(class: "status-emoji") { job_status_emoji(@job.status) }
            span { status_label(@job.status) }
          end
          
          # Priority
          if @job.priority != 'normal'
            span(class: "priority-badge priority-#{@job.priority}") do
              span(class: "priority-emoji") { priority_emoji(@job.priority) }
              span { priority_label(@job.priority) }
            end
          end
          
          # Assignees
          if @job.technicians.any?
            span(class: "assignee-info") do
              @job.technicians.each_with_index do |tech, index|
                span(class: "technician-initials") { tech.name.split.map(&:first).join.upcase[0..1] }
                span { tech.name } if index == 0 && @job.technicians.count == 1
              end
              span { " +#{@job.technicians.count - 1}" } if @job.technicians.count > 1
            end
          else
            span(class: "assignee-info unassigned") { "Unassigned" }
          end
          
          # Task count
          if @job.tasks.any?
            span(class: "task-count") do
              completed = @job.tasks.where(status: 'successfully_completed').count
              total = @job.tasks.count
              "#{completed}/#{total} tasks"
            end
          end
        end
      end
    end
    
    private
    
    def job_path
      if @client
        client_job_path(@client, @job)
      else
        client_job_path(@job.client, @job)
      end
    end
    
    def job_status_emoji(status)
      case status
      when 'open' then '⚫'
      when 'in_progress' then '🟢'
      when 'paused' then '⏸️'
      when 'successfully_completed' then '☑️'
      when 'cancelled' then '❌'
      else '❓'
      end
    end
    
    def status_label(status)
      case status
      when 'open' then 'New'
      when 'in_progress' then 'In Progress'
      when 'paused' then 'Paused'
      when 'waiting_for_customer' then 'Waiting for customer'
      when 'waiting_for_scheduled_appointment' then 'Waiting for scheduled appointment'
      when 'successfully_completed' then 'Successfully Completed'
      when 'cancelled' then 'Cancelled'
      else status.humanize
      end
    end
    
    def priority_emoji(priority)
      case priority
      when 'critical' then '🔥'
      when 'high' then '❗'
      when 'low' then '➖'
      when 'proactive_followup' then '💬'
      else ''
      end
    end
    
    def priority_label(priority)
      case priority
      when 'proactive_followup' then 'Proactive Followup'
      else priority.humanize
      end
    end
  end
end