# frozen_string_literal: true

module Views
  module Logs
    class IndexView < Views::Base
      include Phlex::Rails::Helpers::Routes

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
          div(class: "logs-container", data: { controller: "logs-scroll logs-collapsible" }) do
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
                p { "No activity logs yet." }
              end
            end
          end
        end
      end

      private

      def organize_logs_by_context(logs)
        groups = []

        # Group logs by context (client + job combination)
        logs_by_context = {}
        general_logs = []
        cross_reference_logs = []

        logs.each do |log|
          if log.client_id && log.job_id
            # Has both client and job
            key = "#{log.client_id}-#{log.job_id}"
            logs_by_context[key] ||= {
              client: log.client,
              job: log.job,
              logs: []
            }
            logs_by_context[key][:logs] << log
          elsif log.client_id && !log.job_id
            # Has client but no job
            key = "#{log.client_id}-general"
            logs_by_context[key] ||= {
              client: log.client,
              job: nil,
              logs: []
            }
            logs_by_context[key][:logs] << log
          elsif !log.client_id && !log.job_id
            # No client or job - general logs
            general_logs << log
          else
            # Edge case: has job but no client (shouldn't happen)
            cross_reference_logs << log
          end
        end

        # Convert to array and sort
        context_groups = logs_by_context.values.sort_by do |group|
          # Sort by client name, then by job title
          [ group[:client]&.name || "zzz", group[:job]&.title || "zzz" ]
        end

        # Add general logs section if any
        if general_logs.any?
          groups << {
            client: nil,
            job: nil,
            logs: general_logs,
            is_general: true
          }
        end

        # Add context groups
        groups.concat(context_groups)

        # Add cross-reference section if any
        if cross_reference_logs.any?
          groups << {
            client: nil,
            job: nil,
            logs: cross_reference_logs,
            is_cross_reference: true
          }
        end

        groups
      end

      def render_log_group(group)
        # Render header row
        header_class = if group[:is_general]
          "logs-group-header logs-group-header--general"
        elsif group[:is_cross_reference]
          "logs-group-header logs-group-header--cross-reference"
        else
          "logs-group-header"
        end

        collapsed_class = " logs-group--collapsed"

        tr(class: "#{header_class}#{collapsed_class}", data: { action: "click->logs-collapsible#toggle", logs_collapsible_target: "header" }) do
          td(colspan: 3) do
            div(class: "logs-group-header-content") do
              span(class: "logs-group-toggle", data: { logs_collapsible_target: "toggle" }) { "▶" }

              if group[:is_general]
                span(class: "logs-group-title") { "General Activity" }
              elsif group[:is_cross_reference]
                span(class: "logs-group-title") { "Cross-References" }
              else
                # Client and possibly job
                if group[:client]
                  span(class: "logs-group-client") do
                    emoji = group[:client].business? ? "🏢" : "🏠"
                    plain "#{emoji} #{group[:client].name}"
                  end

                  if group[:job]
                    span(class: "logs-group-separator") { " • " }
                    span(class: "logs-group-job") do
                      plain "💼 #{group[:job].title}"
                    end
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
          # Render date header (initially hidden if collapsed)
          tr(class: "logs-table__date-header logs-group-content", data: { logs_collapsible_target: "content" }) do
            td(colspan: 3) { format_date_header(date) }
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
              if log.user
                div(class: "user-avatar user-avatar-sm", style: log.user.avatar_style) do
                  log.user.initials
                end
              else
                div(class: "user-avatar user-avatar-sm", style: "background-color: #8E8E93;") do
                  "S"
                end
              end
              span(class: "user-name") { log.user&.name || "System" }
            end
          end

          # Action column
          td(class: "logs-table__action-cell") do
            if count > 1
              span(class: "log-count") { "#{count} × " }
            end
            render_log_message_with_links(log)
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
