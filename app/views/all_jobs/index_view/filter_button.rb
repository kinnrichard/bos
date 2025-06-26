# frozen_string_literal: true

module Views
  module AllJobs
    class IndexView
      class FilterButton < Components::Base
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
          div(class: "filter-button-container", data: { controller: "filter-dropdown" }) do
            button(
              type: "button",
              class: "btn-icon",
              data: {
                action: "click->filter-dropdown#toggle",
                filter_dropdown_target: "button"
              },
              title: "Filter jobs"
            ) do
              # Filter icon (funnel)
              svg(
                xmlns: "http://www.w3.org/2000/svg",
                width: "20",
                height: "20",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                stroke_width: "2",
                stroke_linecap: "round",
                stroke_linejoin: "round"
              ) do |s|
                s.polygon(points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3")
              end
            end

            render_filter_popover
          end
        end

        private

        def render_filter_popover
          div(class: "filter-popover hidden", data: { filter_dropdown_target: "menu" }) do
            div(class: "popover-header") do
              h3 { "Filter Jobs" }
              button(
                type: "button",
                class: "popover-close",
                data: { action: "click->filter-dropdown#close" }
              ) { "×" }
            end

            div(class: "popover-content") do
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
          # Note: "open" status shows as "New" in the UI
          return "New" if status == "open"
          JobStatus.find(status)&.label || status.humanize
        end
      end
    end
  end
end
