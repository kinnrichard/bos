# frozen_string_literal: true

module Views
  module Users
    class SettingsView < Views::Base
      def initialize(user:, current_user:)
        @user = user
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Settings",
          current_user: @current_user,
          active_section: :settings
        ) do
          div(class: "page-container") do
            div(class: "page-content") do
              render Components::PageHeader::PageHeaderComponent.new(
                title: "User Settings"
              )

              div(class: "form-container") do
                form_with(model: @user, url: update_settings_user_path(@user), method: :patch) do |f|
                  div(class: "form-section") do
                    h3(class: "form-section-title") { "Task Management" }
                    
                    div(class: "form-group") do
                      div(class: "checkbox-group") do
                        f.check_box :resort_tasks_on_status_change, 
                          class: "form-checkbox",
                          id: "resort_tasks"
                        f.label :resort_tasks_on_status_change, 
                          "Automatically re-sort tasks when status changes",
                          for: "resort_tasks",
                          class: "checkbox-label"
                      end
                      p(class: "form-help-text") do
                        "When enabled, tasks will automatically reorder by status (New → In Progress → Paused → Completed → Cancelled) whenever you change a task's status."
                      end
                    end
                  end

                  div(class: "form-actions") do
                    f.submit "Save Settings", class: "btn btn-primary"
                    link_to "Cancel", root_path, class: "btn btn-secondary"
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