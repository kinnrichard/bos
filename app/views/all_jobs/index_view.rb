module Views
  module AllJobs
    class IndexView < Views::Base
      
      def initialize(jobs:, page_title:, active_section:, technicians:, available_statuses:, 
                     current_filter:, selected_technician_ids:, selected_statuses:)
        @jobs = jobs
        @page_title = page_title
        @active_section = active_section
        @technicians = technicians
        @available_statuses = available_statuses
        @current_filter = current_filter
        @selected_technician_ids = selected_technician_ids
        @selected_statuses = selected_statuses
      end
      
      def view_template
        render_layout(
          title: @page_title,
          current_user: current_user,
          active_section: @active_section
        ) do
          div(class: "header-with-actions") do
            h1(class: "section-title") { @page_title }
            
            div(class: "header-actions") do
              # Filter dropdown
              render_filter_dropdown
              
              # Add "All Jobs" link for admins
              if (current_user.admin? || current_user.superadmin?) && @current_filter
                link_to "All Jobs", jobs_path, class: "button button-secondary"
              end
            end
          end
          
          if @jobs.any?
            div(class: "jobs-list") do
              @jobs.each do |job|
                render_job_card(job)
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
      
      def render_job_card(job)
        link_to client_job_path(job.client, job), 
                class: "job-card",
                data: { turbo: false } do
          div(class: "job-card-header") do
            h3(class: "job-title") { job.title }
            div(class: "job-meta") do
              span(class: "client-name") { job.client.name }
              span(class: "separator") { "•" }
              span(class: "job-date") { "Created #{time_ago_in_words(job.created_at)} ago" }
            end
          end
          
          div(class: "job-status-row") do
            # Status
            span(class: "status-badge status-#{job.status}") do
              span(class: "status-emoji") { job_status_emoji(job.status) }
              span { status_label(job.status) }
            end
            
            # Priority
            if job.priority != 'normal'
              span(class: "priority-badge priority-#{job.priority}") do
                span(class: "priority-emoji") { priority_emoji(job.priority) }
                span { priority_label(job.priority) }
              end
            end
            
            # Assignees
            if job.technicians.any?
              span(class: "assignee-info") do
                job.technicians.each_with_index do |tech, index|
                  span(class: "technician-initials") { tech.name.split.map(&:first).join.upcase[0..1] }
                  span { tech.name } if index == 0 && job.technicians.count == 1
                end
                span { " +#{job.technicians.count - 1}" } if job.technicians.count > 1
              end
            else
              span(class: "assignee-info unassigned") { "Unassigned" }
            end
            
            # Task count
            if job.tasks.any?
              span(class: "task-count") do
                completed = job.tasks.where(status: 'successfully_completed').count
                total = job.tasks.count
                "#{completed}/#{total} tasks"
              end
            end
          end
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
      
      def current_user
        # TODO: Replace with actual current user
        User.first
      end
    end
  end
end