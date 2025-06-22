# frozen_string_literal: true

module Views
  module Logs
    class IndexView < Views::Base
      def initialize(logs:, current_user:)
        @logs = logs
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Activity Logs - Faultless",
          current_user: @current_user,
          active_section: :logs
        ) do
          div(class: "logs-container") do
            div(class: "page-header") do
              h1 { "Activity Logs" }
            end

            if @logs.any?
              div(class: "logs-list") do
                @logs.each do |log|
                  render_log_item(log)
                end
              end
            else
              div(class: "empty-state") do
                p { "No activity logs yet." }
              end
            end
          end
        end
      end

      private

      def format_log_timestamp(timestamp)
        now = Time.current
        today = now.to_date
        yesterday = today - 1
        timestamp_date = timestamp.to_date

        time_str = timestamp.strftime("%-I:%M %p")

        if timestamp_date == today
          "Today at #{time_str}"
        elsif timestamp_date == yesterday
          "Yesterday at #{time_str}"
        elsif timestamp_date >= today - 6 && timestamp_date < today
          "#{timestamp.strftime('%A')} at #{time_str}"
        else
          timestamp.strftime("%B %-d at #{time_str}")
        end
      end

      def render_log_item(log)
        div(class: "log-item") do
          div(class: "log-message") do
            plain log.message
          end

          div(class: "log-timestamp") do
            time(datetime: log.created_at.iso8601, title: log.created_at.to_s) do
              format_log_timestamp(log.created_at)
            end
          end
        end
      end
    end
  end
end
