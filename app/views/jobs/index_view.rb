# frozen_string_literal: true

module Views
  module Jobs
    class IndexView < Views::Base
      def initialize(client:, jobs:, current_user:)
        @client = client
        @jobs = jobs
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Jobs - #{@client.name}",
          current_user: @current_user,
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
                  render Components::Jobs::JobCardComponent.new(job: job, show_client: false, show_description: true, client: @client)
                end
              end
            else
              empty_state
            end
          end
        end
      end
      
      private
      
      
      def empty_state
        div(class: "empty-state-wrapper") do
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
end