# frozen_string_literal: true

module Components
  module Jobs
    class StreamlinedSchedulePopoverComponent < Components::Base
      def initialize(job:, current_user:, scheduled_dates: nil, available_technicians: nil)
        @job = job
        @current_user = current_user
        @scheduled_dates = scheduled_dates || []
        @available_technicians = available_technicians || []
      end

      def view_template
        div(
          class: "popover job-popover schedule-popover streamlined-schedule-popover hidden",
          data: {
            job_target: "schedulePopover",
            controller: "streamlined-schedule",
            streamlined_schedule_job_id_value: @job.id,
            streamlined_schedule_client_id_value: @job.client_id
          }
        ) do
          # Arrow
          div(class: "popover-arrow") do
            svg(xmlns: "http://www.w3.org/2000/svg", width: "16", height: "8", viewBox: "0 0 16 8", style: "display: block; overflow: visible;") do |s|
              # Create clean triangle with crisp edges
              s.path(
                d: "M7 1 L1 8 L15 8 Z",
                fill: "var(--bg-secondary)",
                stroke: "var(--border-primary)",
                stroke_width: "1",
                stroke_linejoin: "miter",
                vector_effect: "non-scaling-stroke"
              )
            end
          end

          # Content
          div(class: "popover-content") do
            render_header
            render_calendar_section
            render_existing_dates
          end
        end
      end

      private

      def render_header
        div(class: "popover-header") do
          h3 { "Schedule Date" }
        end
      end

      def render_calendar_section
        div(class: "calendar-section", data: { streamlined_schedule_target: "calendarSection" }) do
          # Calendar input
          div(class: "calendar-container") do
            input(
              type: "date",
              class: "calendar-input",
              data: {
                streamlined_schedule_target: "dateInput",
                action: "change->streamlined-schedule#dateSelected"
              },
              min: Date.today.to_s
            )
          end

          # Quick action buttons (shown after date selection)
          div(class: "quick-actions hidden", data: { streamlined_schedule_target: "quickActions" }) do
            h4 { "Schedule as:" }

            div(class: "action-buttons") do
              button(
                type: "button",
                class: "action-button",
                data: {
                  action: "click->streamlined-schedule#scheduleAppointment",
                  schedule_type: "appointment"
                }
              ) do
                span(class: "action-icon") { "📅" }
                span { "Appointment" }
              end

              button(
                type: "button",
                class: "action-button",
                data: {
                  action: "click->streamlined-schedule#scheduleFollowup",
                  schedule_type: "follow_up"
                }
              ) do
                span(class: "action-icon") { "🔄" }
                span { "Follow-up" }
              end

              button(
                type: "button",
                class: "action-button",
                data: {
                  action: "click->streamlined-schedule#scheduleDueDate",
                  schedule_type: "due_date"
                }
              ) do
                span(class: "action-icon") { "⏰" }
                span { "Due Date" }
              end

              button(
                type: "button",
                class: "action-button",
                data: {
                  action: "click->streamlined-schedule#scheduleStartDate",
                  schedule_type: "start_date"
                }
              ) do
                span(class: "action-icon") { "▶️" }
                span { "Start Date" }
              end
            end
          end

          # Optional details section (hidden by default)
          div(class: "optional-details hidden", data: { streamlined_schedule_target: "optionalDetails" }) do
            # Time input (required for appointments)
            div(class: "form-group hidden", data: { streamlined_schedule_target: "timeGroup" }) do
              label(class: "form-label") { "Time" }
              div(class: "time-inputs") do
                input(
                  type: "time",
                  class: "form-input time-input",
                  data: { streamlined_schedule_target: "startTimeInput" },
                  step: "900" # 15-minute increments
                )

                div(class: "arrival-window hidden", data: { streamlined_schedule_target: "arrivalWindow" }) do
                  span(class: "time-separator") { "to" }
                  input(
                    type: "time",
                    class: "form-input time-input",
                    data: { streamlined_schedule_target: "endTimeInput" },
                    step: "900"
                  )
                  label(class: "checkbox-label") do
                    input(
                      type: "checkbox",
                      data: {
                        streamlined_schedule_target: "arrivalWindowCheckbox",
                        action: "change->streamlined-schedule#toggleArrivalWindow"
                      }
                    )
                    span { "Arrival window" }
                  end
                end
              end
            end

            # Technician assignment
            div(class: "form-group", data: { streamlined_schedule_target: "technicianGroup" }) do
              label(class: "form-label") { "Assign to (optional)" }
              div(class: "technician-select") do
                @available_technicians.each do |tech|
                  label(class: "technician-option") do
                    input(
                      type: "checkbox",
                      value: tech.id,
                      data: { streamlined_schedule_target: "technicianCheckbox" }
                    )
                    span(class: "technician-badge") do
                      tech.name.split.map(&:first).join.upcase[0..1]
                    end
                    span { tech.name }
                  end
                end
              end
            end

            # Notes
            div(class: "form-group") do
              label(class: "form-label") { "Notes (optional)" }
              textarea(
                class: "form-input notes-input",
                placeholder: "Add any notes...",
                rows: 2,
                data: { streamlined_schedule_target: "notesInput" }
              )
            end

            # Action buttons
            div(class: "form-actions") do
              button(
                type: "button",
                class: "button button--secondary",
                data: { action: "click->streamlined-schedule#cancelSchedule" }
              ) { "Cancel" }

              button(
                type: "button",
                class: "button button--primary",
                data: {
                  action: "click->streamlined-schedule#saveSchedule",
                  streamlined_schedule_target: "saveButton"
                }
              ) { "Save" }
            end
          end
        end
      end

      def render_existing_dates
        return if !@scheduled_dates.is_a?(Array) || @scheduled_dates.empty?

        div(class: "existing-dates-section") do
          h4 { "Scheduled Dates" }

          @scheduled_dates.group_by(&:scheduled_type).each do |type, dates|
            div(class: "date-group") do
              h5 { ScheduledDateTime.scheduled_types[type.to_sym] }

              dates.each do |date|
                render_scheduled_date_item(date)
              end
            end
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

          button(
            type: "button",
            class: "btn-icon btn-sm btn-danger",
            data: { action: "click->streamlined-schedule#deleteDate" },
            title: "Delete"
          ) { "🗑️" }
        end
      end
    end
  end
end
