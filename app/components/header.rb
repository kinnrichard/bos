# frozen_string_literal: true

module Components
  class Header < Base
    def initialize(current_user:)
      @current_user = current_user
    end

    def view_template
      header(class: "header") do
        # Add note button with popover
        div(class: "relative", data: { controller: "popover" }) do
          button(
            type: "button",
            class: "btn-icon",
            data: { action: "click->popover#toggle" }
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

        # Search box - placeholder for now, will be Motion component
        div(class: "search-container") do
          input(
            type: "search",
            class: "search-input",
            placeholder: "Search"
          )
        end
      end
    end
  end
end