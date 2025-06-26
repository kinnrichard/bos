module Views
  module Feedback
    class BugReportView < Views::Base
      def page_title
        "Report a Bug"
      end

      def main_content
        div(class: "feedback-container", data: { controller: "bug-report" }) do
          div(class: "modal-overlay active", data: { bug_report_target: "overlay" })

          div(class: "modal active") do
            div(class: "modal-header") do
              h2 { "Report a Bug" }
              button(
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

              div(class: "form-group") do
                label(for: "title") { "Brief Description" }
                f.text_field :title,
                  required: true,
                  placeholder: "e.g., Button not working on job form",
                  class: "form-control"
              end

              div(class: "form-group") do
                label(for: "description") { "Detailed Description" }
                f.text_area :description,
                  required: true,
                  rows: 4,
                  placeholder: "Please describe what happened, what you expected to happen, and steps to reproduce the issue",
                  class: "form-control"
              end

              div(class: "screenshot-preview", data: { bug_report_target: "screenshotPreview" }) do
                p(class: "screenshot-status") { "Capturing screenshot..." }
              end

              div(class: "form-actions") do
                button(
                  type: "submit",
                  class: "button button--primary",
                  data: { bug_report_target: "submitButton" }
                ) { "Submit Bug Report" }

                button(
                  type: "button",
                  class: "button button--secondary",
                  data: { action: "click->bug-report#close" }
                ) { "Cancel" }
              end
            end
          end
        end
      end
    end
  end
end
