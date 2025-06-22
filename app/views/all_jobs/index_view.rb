module Views
  module AllJobs
    class IndexView < Views::Base
      
      def initialize(jobs:, page_title:, active_section:, technicians:, available_statuses:, 
                     current_filter:, selected_technician_ids:, selected_statuses:, current_user:)
        @jobs = jobs
        @page_title = page_title
        @active_section = active_section
        @technicians = technicians
        @available_statuses = available_statuses
        @current_filter = current_filter
        @selected_technician_ids = selected_technician_ids
        @selected_statuses = selected_statuses
        @current_user = current_user
      end
      
      def view_template
        render_layout(
          title: @page_title,
          current_user: @current_user,
          active_section: @active_section,
          toolbar_items: -> (component) { 
            component.render Views::AllJobs::IndexView::AdvancedFilterButton.new(
              technicians: @technicians,
              available_statuses: @available_statuses,
              selected_technician_ids: @selected_technician_ids,
              selected_statuses: @selected_statuses,
              current_filter: @current_filter
            )
          }
        ) do
          div(class: "header-with-actions") do
            h1(class: "section-title") { @page_title }
            
            div(class: "header-actions") do
              # Add "All Jobs" link for admins
              if (@current_user.admin? || @current_user.owner?) && @current_filter
                link_to "All Jobs", jobs_path, class: "button button-secondary"
              end
            end
          end
          
          if @jobs.any?
            div(class: "jobs-list") do
              @jobs.each do |job|
                render Components::Jobs::JobCardComponent.new(job: job, show_client: true, show_description: false)
              end
            end
          else
            div(class: "empty-state") do
              p(class: "empty-message") { "No jobs found." }
            end
          end
        end
      end
    end
  end
end