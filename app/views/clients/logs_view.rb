# frozen_string_literal: true

module Views
  module Clients
    class LogsView < Views::Base
      include Phlex::Rails::Helpers::Routes

      def initialize(client:, logs:, current_user:)
        @client = client
        @logs = logs
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "#{@client.name} Logs - Faultless",
          current_user: @current_user,
          active_section: :client_logs,
          client: @client
        ) do
          div(class: "logs-container", data: { controller: "logs-scroll logs-collapsible" }) do
            div(class: "page-header") do
              h1 { "Activity Log for #{@client.name}" }
            end

            if @logs.any?
              div(class: "logs-table-container") do
                table(class: "logs-table") do
                  tbody do
                    # Organize logs into groups
                    log_groups = organize_logs_by_context(@logs.reverse)

                    log_groups.each do |group|
                      render_log_group(group)
                    end
                  end
                end
              end
            else
              div(class: "empty-state") do
                p { "No activity logs for this client yet." }
              end
            end
          end
        end
      end

      private

      def organize_logs_by_context(logs)
        groups = []

        # Group logs by job for this client
        logs_by_job = {}
        general_logs = []

        logs.each do |log|
          if log.job_id
            # Has job context
            logs_by_job[log.job_id] ||= {
              job: log.job,
              logs: []
            }
            logs_by_job[log.job_id][:logs] << log
          else
            # No job - general client logs
            general_logs << log
          end
        end

        # Convert to array and sort by job title
        job_groups = logs_by_job.values.sort_by do |group|
          group[:job]&.title || "zzz"
        end

        # Add general logs section if any
        if general_logs.any?
          groups << {
            job: nil,
            logs: general_logs,
            is_general: true
          }
        end

        # Add job groups
        groups.concat(job_groups)

        groups
      end

      def render_log_group(group)
        # Render header row
        header_class = if group[:is_general]
          "logs-group-header logs-group-header--general"
        else
          "logs-group-header"
        end

        collapsed_class = " logs-group--collapsed"

        tr(class: "#{header_class}#{collapsed_class}", data: { action: "click->logs-collapsible#toggle", logs_collapsible_target: "header" }) do
          td(colspan: 3) do
            div(class: "logs-group-header-content") do
              span(class: "logs-group-toggle", data: { logs_collapsible_target: "toggle" }) do
                # Chevron right (collapsed state)
                svg(
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 11.6895 16.9629",
                  width: "8",
                  height: "12",
                  class: "chevron-right",
                  style: "display: block;"
                ) do |s|
                  s.path(
                    d: "M11.6895 8.47656C11.6895 8.23242 11.5918 8.00781 11.4062 7.83203L3.67188 0.253906C3.49609 0.0878906 3.28125 0 3.02734 0C2.5293 0 2.13867 0.380859 2.13867 0.888672C2.13867 1.13281 2.23633 1.35742 2.39258 1.52344L9.50195 8.47656L2.39258 15.4297C2.23633 15.5957 2.13867 15.8105 2.13867 16.0645C2.13867 16.5723 2.5293 16.9531 3.02734 16.9531C3.28125 16.9531 3.49609 16.8652 3.67188 16.6895L11.4062 9.12109C11.5918 8.93555 11.6895 8.7207 11.6895 8.47656Z",
                    fill: "currentColor"
                  )
                end

                # Chevron down (expanded state)
                svg(
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 17.3242 10.4004",
                  width: "12",
                  height: "8",
                  class: "chevron-down",
                  style: "display: none;"
                ) do |s|
                  s.path(
                    d: "M8.48633 10.4004C8.73047 10.4004 8.97461 10.3027 9.14062 10.1172L16.6992 2.37305C16.8652 2.20703 16.9629 1.99219 16.9629 1.74805C16.9629 1.24023 16.582 0.849609 16.0742 0.849609C15.8301 0.849609 15.6055 0.947266 15.4395 1.10352L7.95898 8.75L9.00391 8.75L1.52344 1.10352C1.36719 0.947266 1.14258 0.849609 0.888672 0.849609C0.380859 0.849609 0 1.24023 0 1.74805C0 1.99219 0.0976562 2.20703 0.263672 2.38281L7.82227 10.1172C8.00781 10.3027 8.23242 10.4004 8.48633 10.4004Z",
                    fill: "currentColor"
                  )
                end
              end

              if group[:is_general]
                span(class: "logs-group-title") { "General Client Activity" }
              else
                # Job
                if group[:job]
                  span(class: "logs-group-job") do
                    plain "💼 #{group[:job].title}"
                  end
                end
              end

              span(class: "logs-group-count") { "(#{group[:logs].count})" }
            end
          end
        end

        # Group logs by date within this context
        logs_by_date = group[:logs].group_by { |log| log.created_at.to_date }
        row_index = 0

        logs_by_date.each do |date, logs|
          # Render date header with column headers (initially hidden if collapsed)
          tr(class: "logs-table__date-header logs-group-content", data: { logs_collapsible_target: "content" }) do
            td(class: "logs-table__date-header-cell") do
              span(class: "date-header-user") { "User" }
            end
            td(class: "logs-table__date-header-cell", colspan: 2) do
              div(class: "date-header-action-time") do
                span(class: "date-header-action") { "Action" }
                span(class: "date-header-time") { format_date_header(date) }
              end
            end
          end

          # Group identical logs within this date
          grouped_logs = group_identical_logs(logs)

          # Render grouped logs for this date
          grouped_logs.each do |log_group|
            render_log_row(log_group, row_index, "logs-group-content")
            row_index += 1
          end
        end
      end

      def format_log_timestamp(timestamp)
        timestamp.strftime("%-I:%M %p")
      end

      def format_date_header(date)
        today = Time.current.to_date
        yesterday = today - 1

        if date == today
          "Today, #{date.strftime('%B %-d, %Y')}"
        elsif date == yesterday
          "Yesterday, #{date.strftime('%B %-d, %Y')}"
        else
          "#{date.strftime('%A, %B %-d, %Y')}"
        end
      end

      def format_grouped_times(logs)
        # Get unique times (ignoring seconds)
        unique_times = logs.map { |l| l.created_at.strftime("%-I:%M %p") }.uniq

        case unique_times.size
        when 1
          # All at the same minute
          plain unique_times.first
        when 2
          # Exactly two unique times
          plain "#{unique_times.first} and #{unique_times.last}"
        else
          # More than two unique times - show range
          times = logs.map(&:created_at).sort
          first_time = times.first.strftime("%-I:%M %p")
          last_time = times.last.strftime("%-I:%M %p")
          plain "#{first_time} - #{last_time}"
        end
      end

      def render_log_row(log_group, index, extra_class = nil)
        log = log_group[:representative]
        logs = log_group[:logs]
        count = logs.size

        row_classes = [ "logs-table__row" ]
        row_classes << "logs-table__row--alt" if index.odd?
        row_classes << extra_class if extra_class

        tr(class: row_classes.join(" "), data: { logs_collapsible_target: "content" }) do
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
            render_log_message_with_links(log)
            if count > 1
              span(class: "log-count-badge") { "#{count}×" }
            end
          end

          # Time column
          td(class: "logs-table__time-cell") do
            if count == 1
              time(datetime: log.created_at.iso8601, title: log.created_at.to_s) do
                format_log_timestamp(log.created_at)
              end
            else
              # Format grouped times
              format_grouped_times(logs)
            end
          end
        end
      end

      def get_user_initials(user)
        return "S" unless user
        user.initials
      end

      def group_identical_logs(logs)
        grouped = []

        logs.each do |log|
          # Skip logs with nil messages (filtered out unimportant updates)
          next if log.message.nil?

          # Create a key for grouping (user + message)
          key = "#{log.user_id}-#{log.message}"

          # Find existing group or create new one
          group = grouped.find { |g| g[:key] == key }

          if group
            group[:logs] << log
          else
            grouped << {
              key: key,
              logs: [ log ],
              representative: log
            }
          end
        end

        grouped
      end

      def render_log_message_with_links(log)
        message = log.message
        rendered_parts = []

        # Handle the main loggable object
        if log.loggable_id && log.loggable_type && should_link_loggable?(log.action)
          emoji = log.loggable_type_emoji
          name = log.loggable_name
          pattern = "#{emoji} #{name}"

          if message.include?(pattern) && path = get_loggable_path(log)
            parts = message.split(pattern, 2)
            rendered_parts << parts[0]
            rendered_parts << { type: :link, path: path, text: pattern }
            message = parts[1] || ""
          end
        end

        # Check for job references in task-related actions
        if log.loggable_type == "Task" && log.loggable && (log.action == "created" || log.action == "added")
          # The task has a job, get the job from the task
          if log.loggable.respond_to?(:job) && log.loggable.job
            job = log.loggable.job
            job_pattern = "💼 #{job.title}"

            if message.include?(job_pattern) && job.client
              parts = message.split(job_pattern, 2)
              rendered_parts << parts[0] if parts[0] && !parts[0].empty?
              rendered_parts << { type: :link, path: client_job_path(job.client, job), text: job_pattern }
              message = parts[1] || ""
            end
          end
        end

        # Render any remaining message
        rendered_parts << message if message && !message.empty?

        # Now render all parts
        rendered_parts.each do |part|
          if part.is_a?(Hash) && part[:type] == :link
            link_to(part[:path], class: "logs-link") do
              b { part[:text] }
            end
          else
            plain part
          end
        end
      end

      def should_link_loggable?(action)
        # Don't link for actions where the object doesn't exist anymore
        ![ "deleted" ].include?(action)
      end

      def get_loggable_path(log)
        case log.loggable_type
        when "Client"
          client_path(log.loggable_id) if log.loggable_id
        when "Job"
          # If we have job_id on the log, use that with client_id
          if log.job_id && log.client_id
            client_job_path(log.client_id, log.job_id)
          elsif log.loggable_id
            # Fallback to just job path
            job_path(log.loggable_id)
          end
        when "Task"
          task_path(log.loggable_id) if log.loggable_id
        when "Person"
          person_path(log.loggable_id) if log.loggable_id
        else
          nil
        end
      rescue
        # Handle cases where routes might not exist
        nil
      end
    end
  end
end
