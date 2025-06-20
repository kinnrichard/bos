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
          active_section: @active_section
        ) do
          div(class: "header-with-actions") do
            h1(class: "section-title") { @page_title }
            
            div(class: "header-actions") do
              # Filter dropdown
              render_filter_dropdown
              
              # Add "All Jobs" link for admins
              if (@current_user.admin? || @current_user.superadmin?) && @current_filter
                link_to "All Jobs", jobs_path, class: "button button-secondary"
              end
            end
          end
          
          if @jobs.any?
            div(class: "jobs-list") do
              @jobs.each do |job|
                render Components::JobCard.new(job: job, show_client: true, show_description: false)
              end
            end
          else
            div(class: "empty-state") do
              p(class: "empty-message") { "No jobs found." }
            end
          end
        end
      end
      
      private
      
      def render_filter_dropdown
        div(class: "filter-dropdown", data: { controller: "filter-dropdown" }) do
          button(
            class: "button button-secondary",
            data: { action: "click->filter-dropdown#toggle" }
          ) do
            span { "Filter" }
            span(class: "dropdown-arrow") { "▼" }
          end
          
          div(class: "filter-dropdown-menu hidden", data: { filter_dropdown_target: "menu" }) do
            form_with(url: jobs_path, method: :get, local: true) do |f|
              # Keep current filter
              f.hidden_field :filter, value: @current_filter
              
              # Technician filter
              div(class: "filter-section") do
                h4 { "Technicians" }
                div(class: "checkbox-group") do
                  @technicians.each do |technician|
                    div(class: "checkbox-item") do
                      f.check_box :technician_ids, 
                        { multiple: true, checked: @selected_technician_ids.include?(technician.id.to_s) }, 
                        technician.id, 
                        nil
                      label(for: "technician_ids_#{technician.id}") { technician.name }
                    end
                  end
                end
              end
              
              # Status filter
              div(class: "filter-section") do
                h4 { "Status" }
                div(class: "checkbox-group") do
                  @available_statuses.each do |status|
                    div(class: "checkbox-item") do
                      f.check_box :statuses, 
                        { multiple: true, checked: @selected_statuses.include?(status) }, 
                        status, 
                        nil
                      label(for: "statuses_#{status}") { status_label(status) }
                    end
                  end
                end
              end
              
              # Apply button
              div(class: "filter-actions") do
                f.submit "Apply Filters", class: "button button-primary"
                link_to "Clear", jobs_path(filter: @current_filter), class: "button button-secondary"
              end
            end
          end
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
    end
  end
end