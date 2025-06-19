# frozen_string_literal: true

module Components
  class Header < Base
    def initialize(current_user:, toolbar_items: nil)
      @current_user = current_user
      @toolbar_items = toolbar_items
    end

    def view_template
      header(class: "header") do
        # Left side toolbar items
        div(class: "header-left") do
          # Sidebar toggle button (always visible)
          button(
            type: "button",
            class: "btn-icon sidebar-toggle-btn",
            data: { action: "click->sidebar#toggle" },
            title: "Toggle sidebar"
          ) { "☰" }
          
          # Custom toolbar items from views
          if @toolbar_items
            @toolbar_items.call(self)
          end
        end
        
        # Right side standard items
        div(class: "header-right") do
          # Add note button with popover
          div(class: "relative", data: { controller: "popover" }) do
            button(
              type: "button",
              class: "btn-icon",
              data: { action: "click->popover#toggle" },
              style: "line-height: 30px;"
            ) { "+" }
            
            # Popover will be added later with Motion
            div(
              class: "hidden popover",
              data: { popover_target: "content" }
            ) do
              div(class: "popover-header") do
                h3 { "New Task" }
              end
              div(class: "popover-content") do
                textarea(
                  class: "popover-input",
                  placeholder: "Add a task to your inbox...",
                  rows: 3
                )
              end
            end
          end

          # Search box with autocomplete
          div(
            class: "search-container", 
            data: { 
              controller: "search",
              search_url_value: "/clients/search"
            }
          ) do
            # Magnifying glass icon
            span(class: "search-icon")
            
            input(
              type: "search",
              class: "search-input",
              placeholder: "Search",
              data: {
                search_target: "input",
                action: "input->search#search"
              }
            )
            
            # Search dropdown
            div(
              class: "search-dropdown hidden",
              data: { search_target: "dropdown" }
            ) do
              div(
                data: { search_target: "results" }
              ) { "" }
            end
          end
        end
      end
    end
  end
end