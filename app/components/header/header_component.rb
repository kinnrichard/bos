# frozen_string_literal: true

module Components
  module Header
    class HeaderComponent < Components::Base
    def initialize(current_user:, toolbar_items: nil, sidebar_hidden: false)
      @current_user = current_user
      @toolbar_items = toolbar_items
      @sidebar_hidden = sidebar_hidden
    end

    def view_template
      header(class: "header", data: { controller: "header-job" }) do
        # Left side toolbar items
        div(class: "header-left") do
          # Sidebar toggle button (only visible when sidebar is hidden)
          button(
            type: "button",
            class: "btn-icon sidebar-toggle-btn",
            style: @sidebar_hidden ? "display: flex;" : "display: none;",
            data: {
              action: "click->sidebar#toggle",
              sidebar_target: "toggleButton"
            },
            title: "Toggle sidebar"
          ) do
            svg(
              xmlns: "http://www.w3.org/2000/svg",
              viewBox: "0 0 23.3887 17.9785",
              width: "20",
              height: "16",
              style: "display: block;"
            ) do |s|
              s.path(
                d: "M7.44141 16.7188L8.97461 16.7188L8.97461 1.28906L7.44141 1.28906ZM4.12109 17.9785L19.1504 17.9785C21.6113 17.9785 23.0273 16.4941 23.0273 13.8574L23.0273 4.13086C23.0273 1.49414 21.6113 0 19.1504 0L4.12109 0C1.49414 0 0 1.49414 0 4.13086L0 13.8574C0 16.4941 1.49414 17.9785 4.12109 17.9785ZM4.13086 16.4062C2.50977 16.4062 1.57227 15.4785 1.57227 13.8574L1.57227 4.13086C1.57227 2.50977 2.50977 1.57227 4.13086 1.57227L18.8965 1.57227C20.5176 1.57227 21.4551 2.50977 21.4551 4.13086L21.4551 13.8574C21.4551 15.4785 20.5176 16.4062 18.8965 16.4062ZM5.56641 5.20508C5.85938 5.20508 6.12305 4.94141 6.12305 4.6582C6.12305 4.36523 5.85938 4.11133 5.56641 4.11133L3.4668 4.11133C3.17383 4.11133 2.91992 4.36523 2.91992 4.6582C2.91992 4.94141 3.17383 5.20508 3.4668 5.20508ZM5.56641 7.73438C5.85938 7.73438 6.12305 7.4707 6.12305 7.17773C6.12305 6.88477 5.85938 6.64062 5.56641 6.64062L3.4668 6.64062C3.17383 6.64062 2.91992 6.88477 2.91992 7.17773C2.91992 7.4707 3.17383 7.73438 3.4668 7.73438ZM5.56641 10.2539C5.85938 10.2539 6.12305 10.0098 6.12305 9.7168C6.12305 9.42383 5.85938 9.16992 5.56641 9.16992L3.4668 9.16992C3.17383 9.16992 2.91992 9.42383 2.91992 9.7168C2.91992 10.0098 3.17383 10.2539 3.4668 10.2539Z",
                fill: "currentColor"
              )
            end
          end

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
              style: "display: flex; align-items: center; justify-content: center;"
            ) do
              svg(
                xmlns: "http://www.w3.org/2000/svg",
                viewBox: "0 0 16.4746 16.123",
                width: "16",
                height: "16",
                style: "display: block;"
              ) do |s|
                s.path(
                  d: "M8.93555 15.2441L8.93555 0.869141C8.93555 0.400391 8.53516 0 8.05664 0C7.57812 0 7.1875 0.400391 7.1875 0.869141L7.1875 15.2441C7.1875 15.7129 7.57812 16.1133 8.05664 16.1133C8.53516 16.1133 8.93555 15.7129 8.93555 15.2441ZM0.869141 8.92578L15.2441 8.92578C15.7129 8.92578 16.1133 8.53516 16.1133 8.05664C16.1133 7.57812 15.7129 7.17773 15.2441 7.17773L0.869141 7.17773C0.400391 7.17773 0 7.57812 0 8.05664C0 8.53516 0.400391 8.92578 0.869141 8.92578Z",
                  fill: "currentColor"
                )
              end
            end

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

          # User menu
          if @current_user
            div(class: "user-menu") do
              button(
                class: "user-menu-button",
                data: {
                  action: "click->header-job#toggleUserMenuPopover"
                }
              ) do
                span(class: "user-avatar user-avatar-sm", style: @current_user.avatar_style) do
                  @current_user.initials
                end
              end
            end
          end
        end
      end
    end
    end
  end
end
