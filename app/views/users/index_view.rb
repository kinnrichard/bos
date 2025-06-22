# frozen_string_literal: true

module Views
  module Users
    class IndexView < Views::Base
      def initialize(users:, current_user:)
        @users = users
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Users - Faultless",
          current_user: @current_user,
          active_section: :settings
        ) do
          div(class: "users-container") do
            div(class: "page-header") do
              h1 { "Users" }
              render Components::Ui::ButtonComponent.new(
                href: new_user_path,
                variant: :primary
              ) { "New User" }
            end

            if @users.any?
              div(class: "users-table-container") do
                table(class: "users-table") do
                  thead do
                    tr do
                      th { "Name" }
                      th { "Email" }
                      th { "Role" }
                      th { "Created" }
                      th(class: "actions-column") { "Actions" }
                    end
                  end
                  tbody do
                    @users.each do |user|
                      render_user_row(user)
                    end
                  end
                end
              end
            else
              div(class: "empty-state") do
                p { "No users yet." }
              end
            end
          end
        end
      end

      private

      def render_user_row(user)
        tr(class: "user-row") do
          td { user.name }
          td { user.email }
          td do
            span(class: "role-badge role-#{user.role}") { user.role.humanize }
          end
          td { user.created_at.strftime("%B %-d, %Y") }
          td(class: "actions-column") do
            div(class: "action-buttons") do
              render Components::Ui::ButtonComponent.new(
                href: edit_user_path(user),
                size: :small
              ) { "Edit" }

              if user != @current_user
                delete_form_with_confirmation(
                  url: user_path(user),
                  message: "Are you sure you want to delete #{user.name}? This action cannot be undone."
                ) do
                  "Delete"
                end
              end
            end
          end
        end
      end
    end
  end
end
