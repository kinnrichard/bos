# frozen_string_literal: true

module Views
  module AllJobs
    class IndexView
      class AdvancedFilterButton < Components::Base
        include Phlex::Rails::Helpers::LinkTo
        include Phlex::Rails::Helpers::FormWith

        def initialize(technicians:, available_statuses:, selected_technician_ids:, selected_statuses:, current_filter:)
          @technicians = technicians
          @available_statuses = available_statuses
          @selected_technician_ids = selected_technician_ids
          @selected_statuses = selected_statuses
          @current_filter = current_filter
        end

        def view_template
          div(class: "filter-button-wrapper", data: { controller: "advanced-filter" }) do
            button(
              type: "button",
              class: "btn-icon filter-trigger",
              data: {
                action: "click->advanced-filter#toggle",
                advanced_filter_target: "trigger"
              },
              title: "Filter jobs",
              aria: { label: "Filter jobs", expanded: "false" }
            ) do
              # Filter icon with indicator
              div(class: "filter-icon-wrapper") do
                svg(
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 20.2832 19.9316",
                  width: "20",
                  height: "20",
                  class: "filter-icon"
                ) do |s|
                  # Outer circle
                  s.path(
                    d: "M9.96094 19.9219C15.459 19.9219 19.9219 15.459 19.9219 9.96094C19.9219 4.46289 15.459 0 9.96094 0C4.46289 0 0 4.46289 0 9.96094C0 15.459 4.46289 19.9219 9.96094 19.9219ZM9.96094 18.2617C5.37109 18.2617 1.66016 14.5508 1.66016 9.96094C1.66016 5.37109 5.37109 1.66016 9.96094 1.66016C14.5508 1.66016 18.2617 5.37109 18.2617 9.96094C18.2617 14.5508 14.5508 18.2617 9.96094 18.2617Z",
                    fill: "currentColor"
                  )
                  # Filter lines
                  s.path(
                    d: "M4.64844 8.03711L15.293 8.03711C15.7227 8.03711 16.0352 7.76367 16.0352 7.34375C16.0352 6.93359 15.7227 6.66016 15.293 6.66016L4.64844 6.66016C4.20898 6.66016 3.90625 6.93359 3.90625 7.34375C3.90625 7.76367 4.20898 8.03711 4.64844 8.03711ZM6.09375 11.2695L13.8477 11.2695C14.2773 11.2695 14.5801 10.9961 14.5801 10.5762C14.5801 10.166 14.2773 9.89258 13.8477 9.89258L6.09375 9.89258C5.6543 9.89258 5.35156 10.166 5.35156 10.5762C5.35156 10.9961 5.6543 11.2695 6.09375 11.2695ZM7.59766 14.5117L12.334 14.5117C12.7637 14.5117 13.0762 14.2285 13.0762 13.8184C13.0762 13.4082 12.7637 13.1348 12.334 13.1348L7.59766 13.1348C7.16797 13.1348 6.86523 13.4082 6.86523 13.8184C6.86523 14.2285 7.16797 14.5117 7.59766 14.5117Z",
                    fill: "currentColor"
                  )
                end

                # Active filter indicator
                if has_active_filters?
                  span(class: "filter-indicator")
                end
              end
            end

            # Job-style popover
            div(
              class: "job-popover filter-popover hidden",
              data: { advanced_filter_target: "popover" }
            ) do
              # Arrow
              div(class: "popover-arrow")

              # Header
              div(class: "popover-header") do
                h3 { "Filter Jobs" }
                button(
                  type: "button",
                  class: "popover-close-btn",
                  data: { action: "click->advanced-filter#close" },
                  aria: { label: "Close filter" }
                ) do
                  svg(
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "16",
                    height: "16",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    stroke_width: "2",
                    stroke_linecap: "round",
                    stroke_linejoin: "round"
                  ) do |s|
                    s.line(x1: "18", y1: "6", x2: "6", y2: "18")
                    s.line(x1: "6", y1: "6", x2: "18", y2: "18")
                  end
                end
              end

              div(class: "popover-content") do
                form_with(
                  url: jobs_path,
                  method: :get,
                  local: true,
                  data: { advanced_filter_target: "form" }
                ) do |f|
                  f.hidden_field :filter, value: @current_filter

                  # Status section
                  div(class: "popover-section") do
                    h3 { "Status" }
                    div(class: "dropdown-container", data: { controller: "dropdown" }) do
                      button(
                        type: "button",
                        class: "dropdown-button",
                        data: {
                          action: "click->dropdown#toggle",
                          dropdown_target: "button"
                        }
                      ) do
                        span(class: "dropdown-value") do
                          if @selected_statuses.any?
                            if @selected_statuses.size == 1
                              span(class: "status-emoji") { job_status_emoji(@selected_statuses.first) }
                              span { job_status_label(@selected_statuses.first) }
                            else
                              span { "#{@selected_statuses.size} selected" }
                            end
                          else
                            span { "All statuses" }
                          end
                        end
                        span(class: "dropdown-arrow") { "▼" }
                      end

                      div(
                        class: "dropdown-menu hidden",
                        data: { dropdown_target: "menu" }
                      ) do
                        @available_statuses.each do |status|
                          label(class: "status-option") do
                            input(
                              type: "checkbox",
                              name: "statuses[]",
                              value: status,
                              checked: @selected_statuses.include?(status),
                              class: "status-checkbox"
                            )
                            span(class: "status-emoji") { job_status_emoji(status) }
                            span { job_status_label(status) }
                          end
                        end
                      end
                    end
                  end

                  # Assigned to section
                  div(class: "popover-section") do
                    h3 { "Assigned to" }
                    div(class: "dropdown-container", data: { controller: "dropdown" }) do
                      button(
                        type: "button",
                        class: "dropdown-button",
                        data: {
                          action: "click->dropdown#toggle",
                          dropdown_target: "button"
                        }
                      ) do
                        span(class: "dropdown-value") do
                          if @selected_technician_ids.any?
                            selected = @technicians.select { |t| @selected_technician_ids.include?(t.id.to_s) }
                            if selected.size == 1
                              technician_icon(selected.first)
                              span { selected.first.name }
                            else
                              span { "#{selected.size} selected" }
                            end
                          else
                            span { "All technicians" }
                          end
                        end
                        span(class: "dropdown-arrow") { "▼" }
                      end

                      div(
                        class: "dropdown-menu hidden",
                        data: { dropdown_target: "menu" }
                      ) do
                        @technicians.each do |technician|
                          label(class: "status-option") do
                            input(
                              type: "checkbox",
                              name: "technician_ids[]",
                              value: technician.id,
                              checked: @selected_technician_ids.include?(technician.id.to_s),
                              class: "status-checkbox"
                            )
                            technician_icon(technician)
                            span { technician.name }
                          end
                        end
                      end
                    end
                  end

                  # Actions section
                  div(class: "popover-actions") do
                    button(
                      type: "button",
                      class: "delete-button",
                      data: { action: "click->advanced-filter#clear" }
                    ) { "Clear Filters" }

                    f.submit "Apply", class: "apply-button"
                  end
                end
              end
            end
          end
        end

        private

        def has_active_filters?
          @selected_technician_ids.any? || @selected_statuses.any?
        end


        def user_color(user)
          # Generate consistent color based on user name
          colors = [ "#FF9500", "#FF5E5B", "#FFCC00", "#34C759", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55" ]
          colors[user.name.sum % colors.length]
        end

        # Remove duplicate method - now using IconsHelper

        # Remove duplicate status_label method - now using IconsHelper
      end
    end
  end
end
