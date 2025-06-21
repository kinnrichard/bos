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
                  width: "20",
                  height: "20",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  stroke_width: "2",
                  stroke_linecap: "round",
                  stroke_linejoin: "round",
                  class: "filter-icon"
                ) do |s|
                  s.polygon(points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3")
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
                              span(class: "status-emoji") { status_emoji(@selected_statuses.first) }
                              span { status_label(@selected_statuses.first) }
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
                            span(class: "status-emoji") { status_emoji(status) }
                            span { status_label(status) }
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
        
        def technician_icon(user)
          span(
            class: "assignee-icon",
            style: "background-color: #{user_color(user)};"
          ) do
            user.name.split.map(&:first).join.upcase[0..1]
          end
        end
        
        def user_color(user)
          # Generate consistent color based on user name
          colors = ["#FF9500", "#FF5E5B", "#FFCC00", "#34C759", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55"]
          colors[user.name.sum % colors.length]
        end
        
        def status_emoji(status)
          case status
          when 'open' then '⚫'
          when 'in_progress' then '🟢'
          when 'paused' then '🟡'
          when 'waiting_for_customer' then '🟣'
          when 'waiting_for_scheduled_appointment' then '🔵'
          when 'successfully_completed' then '✅'
          when 'cancelled' then '❌'
          else '⚪'
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
end