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
          div(class: "logs-container", data: { controller: "logs-scroll" }) do
            div(class: "page-header") do
              h1 { "Activity Logs" }
            end

            if @logs.any?
              div(class: "logs-table-container") do
                table(class: "logs-table") do
                  thead do
                    tr do
                      th(class: "logs-table__user") { "User" }
                      th(class: "logs-table__action") { "Action" }
                      th(class: "logs-table__time") { "Time" }
                    end
                  end
                  tbody do
                    # Reverse the logs so newest are at bottom
                    @logs.reverse.each_with_index do |log, index|
                      render_log_row(log, index)
                    end
                  end
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

      def render_log_row(log, index)
        tr(class: "logs-table__row #{'logs-table__row--alt' if index.odd?}") do
          # User column with avatar
          td(class: "logs-table__user-cell") do
            div(class: "user-info") do
              div(class: "user-avatar") do
                get_user_initials(log.user)
              end
              span(class: "user-name") { log.user&.name || "System" }
            end
          end

          # Action column
          td(class: "logs-table__action-cell") do
            plain log.message
          end

          # Time column
          td(class: "logs-table__time-cell") do
            time(datetime: log.created_at.iso8601, title: log.created_at.to_s) do
              format_log_timestamp(log.created_at)
            end
          end
        end
      end

      def get_user_initials(user)
        return "S" unless user
        user.name.split.map(&:first).join.upcase[0..1]
      end
    end
  end
end
