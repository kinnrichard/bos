module Views
  module Feedback
    class BugReportView < Views::Base
      def initialize(current_user:)
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Report a Bug - Faultless",
          current_user: @current_user,
          hide_sidebar: true
        ) do
          main_content
        end
      end

      private

      def main_content
        div(class: "modal-backdrop", data: {
          controller: "bug-report"
        }) do
          div(class: "modal-overlay", data: {
            bug_report_target: "overlay",
            action: "click->bug-report#close"
          })

          div(class: "modal-container") do
            div(class: "modal-content") do
              # Header
              div(class: "modal-header") do
                h2 { "Report a Bug" }
                button(
                  type: "button",
                  class: "modal-close",
                  data: { action: "click->bug-report#close" }
                ) { "×" }
              end

            form_with(
              url: feedback_path,
              method: :post,
              class: "bug-report-form",
              data: { bug_report_target: "form" }
            ) do |f|
              input(type: "hidden", name: "type", value: "bug")
              input(type: "hidden", name: "page_url", data: { bug_report_target: "pageUrl" })
              input(type: "hidden", name: "user_agent", data: { bug_report_target: "userAgent" })
              input(type: "hidden", name: "viewport_size", data: { bug_report_target: "viewportSize" })
              input(type: "hidden", name: "console_logs", data: { bug_report_target: "consoleLogs" })
              input(type: "hidden", name: "screenshot", data: { bug_report_target: "screenshot" })

              div(class: "modal-body") do
                render Components::Ui::FormInputComponent.new(
                  form: f,
                  attribute: :title,
                  label: "Brief Description",
                  placeholder: "e.g., Button not working on job form",
                  required: true
                )

                render Components::Ui::FormInputComponent.new(
                  form: f,
                  attribute: :description,
                  type: :textarea,
                  label: "Detailed Description",
                  placeholder: "Please describe what happened, what you expected to happen, and steps to reproduce the issue",
                  required: true
                )

                div(class: "screenshot-preview", data: { bug_report_target: "screenshotPreview" }) do
                  p(class: "screenshot-status") { "Capturing screenshot..." }
                end
              end

              # Footer
              div(class: "modal-footer") do
                render Components::Ui::ButtonComponent.new(
                  variant: :secondary,
                  type: :button,
                  data: { action: "click->bug-report#close" }
                ) { "Cancel" }

                render Components::Ui::ButtonComponent.new(
                  variant: :primary,
                  type: :submit,
                  data: { bug_report_target: "submitButton" }
                ) { "Submit Bug Report" }
              end
            end
          end
        end
      end
    end
    end
  end
end
