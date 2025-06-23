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
            schedule_popover_job_id_value: @job.id,
            schedule_popover_client_id_value: @job.client_id
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
              div(class: "dropdown-container", data: {
                controller: "dropdown",
                dropdown_positioning_value: "fixed",
                action: "dropdown:select->schedule-popover#typeSelected"
              }) do
                button(
                  type: "button",
                  class: "dropdown-button",
                  data: {
                    action: "click->dropdown#toggle",
                    dropdown_target: "button"
                  }
                ) do
                  span(data: { dropdown_target: "display", schedule_popover_target: "typeDisplay" }) do
                    "Due Date" # Default to first option
                  end
                  span(class: "dropdown-arrow") { "▼" }
                end
                div(
                  class: "dropdown-menu hidden",
                  data: { dropdown_target: "menu" }
                ) do
                  ScheduledDateTime.scheduled_types.each do |value, label|
                    button(
                      type: "button",
                      class: "dropdown-option",
                      data: {
                        action: "click->dropdown#select",
                        value: value,
                        label: label
                      }
                    ) do
                      span(class: "dropdown-label") { label }
                    end
                  end
                end
                # Hidden input for form value
                input(
                  type: "hidden",
                  data: { dropdown_target: "value", schedule_popover_target: "typeSelect" },
                  value: "scheduled_work" # Default value
                )
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
              label(class: "form-label") { "Time" }
              input(
                type: "time",
                class: "form-input",
                data: { schedule_popover_target: "timeInput" }
              )
            end

            # User assignment
            div(class: "form-group") do
              label(class: "form-label") { "Technician(s)" }
              div(class: "dropdown-container", data: {
                controller: "dropdown",
                dropdown_positioning_value: "fixed",
                dropdown_mode_value: "multi",
                dropdown_close_on_select_value: false,
                placeholder: "Select technicians...",
                action: "dropdown:select->schedule-popover#techniciansSelected"
              }) do
                button(
                  type: "button",
                  class: "dropdown-button",
                  data: {
                    action: "click->dropdown#toggle",
                    dropdown_target: "button"
                  }
                ) do
                  span(data: { dropdown_target: "display", schedule_popover_target: "technicianDisplay" }) do
                    "Select technicians..."
                  end
                  span(class: "dropdown-arrow") { "▼" }
                end
                div(
                  class: "dropdown-menu hidden",
                  data: { dropdown_target: "menu" }
                ) do
                  User.where(role: [ :technician, :admin, :owner ]).order(:name).each do |user|
                    button(
                      type: "button",
                      class: "dropdown-option",
                      data: {
                        action: "click->dropdown#select",
                        value: user.id,
                        label: user.name
                      }
                    ) do
                      span(class: "dropdown-icon dropdown-badge") { user.name.split.map(&:first).join.upcase[0..1] }
                      span(class: "dropdown-label") { user.name }
                      input(
                        type: "checkbox",
                        class: "dropdown-value",
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
  end
end
