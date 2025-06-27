module Views
  module Admin
    class AutomationDashboardView < Views::Base
      def initialize(current_user:, stats:, recent_issues:, failed_issues:, automation_enabled:, feature_notifications_enabled:, active_section: nil)
        @current_user = current_user
        @stats = stats
        @recent_issues = recent_issues
        @failed_issues = failed_issues
        @automation_enabled = automation_enabled
        @feature_notifications_enabled = feature_notifications_enabled
        @active_section = active_section
      end

      def view_template
        render_layout(
          title: "Automation Dashboard - Faultless",
          current_user: @current_user,
          active_section: @active_section
        ) do
          main_content
        end
      end

      private

      def main_content
        div(class: "automation-dashboard") do
          # Header with controls
          div(class: "dashboard-header") do
            h1 { "Bug-to-PR Automation Dashboard" }

            div(class: "dashboard-controls") do
              # Bug automation toggle
              div(class: "control-group") do
                label { "Bug Automation:" }
                if @automation_enabled
                  span(class: "status-badge status-badge--success") { "ENABLED" }
                  button_to "Disable", toggle_automation_admin_automation_dashboard_path,
                    method: :post,
                    params: { enable: false },
                    class: "button button--small button--danger"
                else
                  span(class: "status-badge status-badge--danger") { "DISABLED" }
                  button_to "Enable", toggle_automation_admin_automation_dashboard_path,
                    method: :post,
                    params: { enable: true },
                    class: "button button--small button--primary"
                end
              end

              # Feature notifications toggle
              div(class: "control-group") do
                label { "Email Notifications:" }
                if @feature_notifications_enabled
                  span(class: "status-badge status-badge--success") { "ENABLED" }
                  button_to "Disable", toggle_notifications_admin_automation_dashboard_path,
                    method: :post,
                    params: { enable: false },
                    class: "button button--small button--danger"
                else
                  span(class: "status-badge status-badge--danger") { "DISABLED" }
                  button_to "Enable", toggle_notifications_admin_automation_dashboard_path,
                    method: :post,
                    params: { enable: true },
                    class: "button button--small button--primary"
                end
              end
            end
          end

          # Statistics cards
          div(class: "stats-grid") do
            stat_card("Bug Reports", @stats[:bug_reports], "bug-icon")
            stat_card("Feature Requests", @stats[:feature_requests], "feature-icon")
            stat_card("Auto-Fixed", @stats[:auto_fixed], "success-icon")
            stat_card("Stories Generated", @stats[:stories_generated], "story-icon")
            stat_card("Failed", @stats[:automation_failed], "error-icon")
            stat_card("In Progress", @stats[:in_progress], "progress-icon")
          end

          # Failed issues section
          if @failed_issues.any?
            div(class: "dashboard-section") do
              h2(class: "section-title") { "⚠️ Failed Automations (Requires Attention)" }

              div(class: "issues-list") do
                @failed_issues.each do |issue|
                  div(class: "issue-item issue-item--failed") do
                    div(class: "issue-header") do
                      a(href: issue[:url], target: "_blank", class: "issue-link") do
                        "##{issue[:number]}: #{issue[:title]}"
                      end
                    end
                    div(class: "issue-meta") do
                      span { "Created #{helpers.time_ago_in_words(issue[:created_at])} ago" }
                    end
                  end
                end
              end
            end
          end

          # Recent issues section
          div(class: "dashboard-section") do
            h2(class: "section-title") { "Recent Issues" }

            if @recent_issues.any?
              div(class: "issues-list") do
                @recent_issues.each do |issue|
                  div(class: "issue-item") do
                    div(class: "issue-header") do
                      a(href: issue[:url], target: "_blank", class: "issue-link") do
                        "##{issue[:number]}: #{issue[:title]}"
                      end
                      div(class: "issue-labels") do
                        issue[:labels].each do |label|
                          span(class: "label label--#{label}") { label }
                        end
                      end
                    end
                    div(class: "issue-meta") do
                      span { "#{issue[:state].capitalize} • Created #{helpers.time_ago_in_words(issue[:created_at])} ago" }
                    end
                  end
                end
              end
            else
              p(class: "empty-state") { "No recent issues found." }
            end
          end

          # Documentation links
          div(class: "dashboard-section") do
            h2(class: "section-title") { "Documentation & Resources" }

            div(class: "resource-links") do
              a(href: "/docs/claude-automation-setup.md", class: "resource-link") do
                "📚 Claude Automation Setup Guide"
              end
              a(href: "/docs/feature-request-workflow.md", class: "resource-link") do
                "📋 Feature Request Workflow"
              end
              a(href: "https://github.com/#{ENV['GIT_REPO'] || 'fluffyx/bos'}/labels",
                target: "_blank",
                class: "resource-link") do
                "🏷️ View All GitHub Labels"
              end
            end
          end
        end
      end

      def stat_card(title, value, icon_class)
        div(class: "stat-card") do
          div(class: "stat-icon #{icon_class}")
          div(class: "stat-content") do
            div(class: "stat-value") { value.to_s }
            div(class: "stat-title") { title }
          end
        end
      end
    end
  end
end
