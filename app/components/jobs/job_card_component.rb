# frozen_string_literal: true

module Components
  module Jobs
    class JobCardComponent < Components::Base
    include Phlex::Rails::Helpers::LinkTo
    include Phlex::Rails::Helpers::TimeAgoInWords

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
        span(class: "job-status-emoji") { @job.status_emoji }

        # Client and job name
        span(class: "job-name-section") do
          if @show_client
            span(class: "client-name-prefix") { "#{@job.client.name}" }
          end
          span(class: "job-name") { @job.title }
        end

        # Right side items
        span(class: "job-right-section") do
          # Priority emoji (if not normal)
          if @job.priority != "normal"
            span(class: "job-priority-emoji") { @job.priority_emoji }
          end

          # Technician avatars - show all
          if @job.technicians.any?
            span(class: "technician-avatars") do
              @job.technicians.each do |tech|
                span(class: "technician-avatar", style: tech.avatar_style) { tech.initials }
              end
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
    end
  end
end
