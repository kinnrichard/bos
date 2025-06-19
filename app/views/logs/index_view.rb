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
      
      def render_log_item(log)
        div(class: "log-item") do
          div(class: "log-message") do
            plain log.message
          end
          
          div(class: "log-timestamp") do
            time(datetime: log.created_at.iso8601, title: log.created_at.to_s) do
              helpers.time_ago_in_words(log.created_at) + " ago"
            end
          end
        end
      end
    end
  end
end