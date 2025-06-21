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
            
            render_advanced_popover
          end
        end
        
        private
        
        def has_active_filters?
          @selected_technician_ids.any? || @selected_statuses.any?
        end
        
        def render_advanced_popover
          div(
            class: "advanced-filter-popover hidden",
            data: { advanced_filter_target: "popover" }
          ) do
            # Arrow pointer
            div(class: "popover-arrow")
            
            # Popover content
            div(class: "popover-wrapper") do
              # Header
              div(class: "popover-header") do
                h3(class: "popover-title") { "Filter Jobs" }
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
              
              # Form content
              form_with(
                url: jobs_path,
                method: :get,
                local: true,
                class: "filter-form",
                data: { advanced_filter_target: "form" }
              ) do |f|
                f.hidden_field :filter, value: @current_filter
                
                div(class: "popover-body") do
                  # Status dropdown
                  div(class: "filter-field") do
                    label(class: "filter-label") { "STATUS" }
                    div(
                      class: "multiselect-dropdown",
                      data: { 
                        controller: "multiselect",
                        multiselect_selected_value: @selected_statuses.to_json
                      }
                    ) do
                      button(
                        type: "button",
                        class: "dropdown-trigger",
                        data: { 
                          action: "click->multiselect#toggle",
                          multiselect_target: "trigger"
                        }
                      ) do
                        div(class: "dropdown-value") do
                          if @selected_statuses.any?
                            span(class: "selected-count") { "#{@selected_statuses.size} selected" }
                          else
                            span(class: "placeholder") { "Select status" }
                          end
                        end
                        span(class: "dropdown-arrow") { "▼" }
                      end
                      
                      div(
                        class: "dropdown-menu hidden",
                        data: { multiselect_target: "menu" }
                      ) do
                        @available_statuses.each do |status|
                          label(class: "dropdown-option") do
                            input(
                              type: "checkbox",
                              name: "statuses[]",
                              value: status,
                              checked: @selected_statuses.include?(status),
                              data: { action: "change->multiselect#updateSelection" }
                            )
                            span(class: "option-content") do
                              span(class: "status-indicator #{status_color_class(status)}")
                              span(class: "option-label") { status_label(status) }
                            end
                          end
                        end
                      end
                    end
                  end
                  
                  # Assigned to dropdown
                  div(class: "filter-field") do
                    label(class: "filter-label") { "ASSIGNED TO" }
                    div(
                      class: "multiselect-dropdown",
                      data: { 
                        controller: "multiselect",
                        multiselect_selected_value: @selected_technician_ids.to_json
                      }
                    ) do
                      button(
                        type: "button",
                        class: "dropdown-trigger",
                        data: { 
                          action: "click->multiselect#toggle",
                          multiselect_target: "trigger"
                        }
                      ) do
                        div(class: "dropdown-value") do
                          if @selected_technician_ids.any?
                            render_selected_technicians
                          else
                            span(class: "placeholder") { "Select technicians" }
                          end
                        end
                        span(class: "dropdown-arrow") { "▼" }
                      end
                      
                      div(
                        class: "dropdown-menu hidden",
                        data: { multiselect_target: "menu" }
                      ) do
                        @technicians.each do |technician|
                          label(class: "dropdown-option") do
                            input(
                              type: "checkbox",
                              name: "technician_ids[]",
                              value: technician.id,
                              checked: @selected_technician_ids.include?(technician.id.to_s),
                              data: { action: "change->multiselect#updateSelection" }
                            )
                            span(class: "option-content") do
                              span(class: "user-avatar") do
                                technician.name.split.map(&:first).join.upcase[0..1]
                              end
                              span(class: "option-label") { technician.name }
                            end
                          end
                        end
                      end
                    end
                  end
                end
                
                # Actions
                div(class: "popover-footer") do
                  button(
                    type: "button",
                    class: "btn-secondary",
                    data: { action: "click->advanced-filter#clear" }
                  ) { "Clear All" }
                  
                  f.submit "Apply Filters", class: "btn-primary"
                end
              end
            end
          end
        end
        
        def render_selected_technicians
          selected = @technicians.select { |t| @selected_technician_ids.include?(t.id.to_s) }
          
          if selected.size == 1
            div(class: "selected-single") do
              span(class: "user-avatar small") do
                selected.first.name.split.map(&:first).join.upcase[0..1]
              end
              span { selected.first.name }
            end
          else
            span(class: "selected-count") { "#{selected.size} selected" }
          end
        end
        
        def status_color_class(status)
          case status
          when 'open' then 'status-new'
          when 'in_progress' then 'status-in-progress'
          when 'paused' then 'status-paused'
          when 'waiting_for_customer' then 'status-waiting'
          when 'waiting_for_scheduled_appointment' then 'status-scheduled'
          when 'successfully_completed' then 'status-completed'
          when 'cancelled' then 'status-cancelled'
          else 'status-default'
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