# frozen_string_literal: true

module Components
  module Jobs
    class SchedulePopoverComponent < Components::Base
      def initialize(job:, current_user:)
        @job = job
        @current_user = current_user
        @scheduled_dates = @job.scheduled_date_times.includes(:users).order(:scheduled_date, :scheduled_time)
      end

      def view_template
        div(
          class: "popover job-popover schedule-popover hidden",
          data: { 
            job_target: "schedulePopover",
            controller: "schedule-popover",
            schedule_popover_job_id_value: @job.id
          }
        ) do
          # Arrow
          div(class: "popover-arrow")
          
          # Content
          div(class: "popover-content") do
            render_header
            render_existing_dates
            render_add_new_section
          end
        end
      end

      private

      def render_header
        div(class: "popover-section") do
          h3 { "Schedule Dates & Times" }
        end
      end

      def render_existing_dates
        return if @scheduled_dates.empty?
        
        div(class: "popover-section") do
          @scheduled_dates.group_by(&:scheduled_type).each do |type, dates|
            render_date_group(type, dates)
          end
        end
      end

      def render_date_group(type, dates)
        div(class: "schedule-group") do
          h4 { ScheduledDateTime.scheduled_types[type.to_sym] }
          
          dates.each do |date|
            render_scheduled_date_item(date)
          end
        end
      end

      def render_scheduled_date_item(scheduled_date)
        div(class: "scheduled-date-item", data: { scheduled_date_id: scheduled_date.id }) do
          div(class: "date-info") do
            span(class: "date-text") { scheduled_date.display_datetime }
            
            if scheduled_date.users.any?
              div(class: "assigned-users") do
                scheduled_date.users.each do |user|
                  span(class: "user-tag") { user.name }
                end
              end
            end
            
            if scheduled_date.notes.present?
              div(class: "date-notes") { scheduled_date.notes }
            end
          end
          
          div(class: "date-actions") do
            button(
              type: "button",
              class: "btn-icon btn-sm",
              data: { action: "click->schedule-popover#editDate" },
              title: "Edit"
            ) { "✏️" }
            
            button(
              type: "button",
              class: "btn-icon btn-sm btn-danger",
              data: { action: "click->schedule-popover#deleteDate" },
              title: "Delete"
            ) { "🗑️" }
          end
        end
      end

      def render_add_new_section
        div(class: "popover-section add-schedule-section") do
          h4 { "Add New Date" }
          
          div(class: "schedule-form", data: { schedule_popover_target: "form" }) do
            # Type selector
            div(class: "form-group") do
              label(class: "form-label") { "Type" }
              select(
                class: "form-input",
                data: { schedule_popover_target: "typeSelect" }
              ) do
                ScheduledDateTime.scheduled_types.each do |value, label|
                  option(value: value) { label }
                end
              end
            end
            
            # Date input
            div(class: "form-group") do
              label(class: "form-label") { "Date" }
              input(
                type: "date",
                class: "form-input",
                data: { 
                  schedule_popover_target: "dateInput",
                  action: "change->schedule-popover#dateChanged"
                },
                required: true
              )
            end
            
            # Time input (optional) - hidden until date is selected
            div(class: "form-group hidden", data: { schedule_popover_target: "timeGroup" }) do
              label(class: "form-label") { "Time (optional)" }
              input(
                type: "time",
                class: "form-input",
                data: { schedule_popover_target: "timeInput" }
              )
            end
            
            # User assignment
            div(class: "form-group") do
              label(class: "form-label") { "Assign Technicians (optional)" }
              div(class: "dropdown-container", data: { 
        controller: "dropdown",
        dropdown_positioning_value: "fixed"  # Use fixed positioning for dropdown in scrollable popover
      }) do
                button(
                  type: "button",
                  class: "dropdown-button",
                  data: { 
                    action: "click->dropdown#toggle",
                    dropdown_target: "button"
                  }
                ) do
                  span(class: "dropdown-value", data: { schedule_popover_target: "technicianDisplay" }) do
                    span { "Select technicians..." }
                  end
                  span(class: "dropdown-arrow") { "▼" }
                end
                div(
                  class: "dropdown-menu multi-select-dropdown hidden",
                  data: { dropdown_target: "menu" }
                ) do
                  User.where(role: [:technician, :admin, :owner]).order(:name).each do |user|
                    div(
                      class: "assignee-option",
                      data: { 
                        action: "click->schedule-popover#toggleTechnician",
                        technician_id: user.id
                      }
                    ) do
                      technician_icon(user)
                      span { user.name }
                      input(
                        type: "checkbox",
                        class: "hidden-checkbox",
                        value: user.id,
                        data: { schedule_popover_target: "userCheckbox" }
                      )
                    end
                  end
                end
              end
            end
            
            # Actions
            div(class: "form-actions") do
              button(
                type: "button",
                class: "button button--primary",
                data: { action: "click->schedule-popover#addDate" }
              ) { "Add Date" }
            end
          end
        end
      end
    end
    
    def technician_icon(technician)
      # For now, use initials. Could be replaced with actual avatars
      initials = technician.name.split.map(&:first).join.upcase[0..1]
      span(class: "technician-initials") { initials }
    end
  end
end