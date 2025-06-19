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
              class: "job-card-inline",
              data: { turbo: false } do
        # Status emoji
        span(class: "job-status-emoji") { job_status_emoji(@job.status) }
        
        # Client and job name
        span(class: "job-name-section") do
          if @show_client
            span(class: "client-name-prefix") { "#{@job.client.name}:" }
            span { " " }
          end
          span(class: "job-name") { @job.title }
        end
        
        # Right side items
        span(class: "job-right-section") do
          # Priority emoji (if not normal)
          if @job.priority != 'normal'
            span(class: "job-priority-emoji") { priority_emoji(@job.priority) }
          end
          
          # Technician avatar
          if @job.technicians.any?
            @job.technicians.first(1).each do |tech|
              span(class: "technician-avatar") { tech.name.split.map(&:first).join.upcase[0..1] }
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