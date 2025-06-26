# frozen_string_literal: true

module Components
  module Tasks
    class InfoPopoverComponent < Components::Base
      def initialize(task:, current_user:, available_technicians: [])
        @task = task
        @current_user = current_user
        @available_technicians = available_technicians
      end

      def view_template
        div(
          class: "task-info-popover hidden",
          data: {
            controller: "task-info",
            task_info_task_id_value: @task.id,
            task_info_client_id_value: @task.job.client_id,
            task_info_job_id_value: @task.job_id
          }
        ) do
          # Arrow pointer
          div(class: "popover-arrow", data: { task_info_target: "arrow" }) do
            svg(xmlns: "http://www.w3.org/2000/svg", width: "16", height: "8", viewBox: "0 0 16 8", style: "display: block; overflow: visible;") do |s|
              s.path(
                d: "M7 1 L1 8 L15 8 Z",
                fill: "var(--bg-secondary)",
                stroke: "var(--border-primary)",
                stroke_width: "1",
                stroke_linejoin: "miter",
                vector_effect: "non-scaling-stroke"
              )
            end
          end

          # Popover content with scrolling
          div(class: "popover-content-scrollable") do
            # Header
            div(class: "popover-header") do
              h3 { "Task Info" }
              render_header_duration
            end

            # Timeline section (notes and status changes combined)
            render_timeline

            # Add note form at the bottom
            render_add_note_form
          end
        end
      end

      private

      def render_header_duration
        if @task.in_progress? || @task.time_in_progress > 0
          div(class: "header-duration") do
            if @task.in_progress?
              span(class: "timer-icon") { "⏱️" }
              span(class: "timer-display active", data: {
                task_info_target: "timer",
                duration: @task.time_in_progress
              }) { @task.formatted_time_in_progress || "0 min" }
            else
              span(class: "timer-icon") { "⏱️" }
              span(class: "timer-display") { @task.formatted_time_in_progress }
            end
          end
        end
      end

      def render_timeline
        div(class: "timeline-section") do
          div(class: "timeline-container", data: { task_info_target: "timelineContainer" }) do
            # Get all timeline items
            timeline_items = get_timeline_items

            if timeline_items.any?
              render_grouped_timeline_items(timeline_items)
            else
              # Always show created as first item
              render_timeline_header(nil, @task.created_at)
              render_timeline_item({
                type: :created,
                timestamp: @task.created_at,
                user: nil
              })
            end
          end
        end
      end

      def get_timeline_items
        items = []

        # Add created log
        created_log = @task.activity_logs.find_by(action: "created")
        if created_log
          items << {
            type: :created,
            timestamp: created_log.created_at,
            user: created_log.user,
            log: created_log
          }
        else
          items << {
            type: :created,
            timestamp: @task.created_at,
            user: nil
          }
        end

        # Add status changes
        status_logs = @task.activity_logs
          .where(action: "status_changed")
          .includes(:user)

        status_logs.each do |log|
          items << {
            type: :status_change,
            timestamp: log.created_at,
            user: log.user,
            status: log.metadata["new_status"],
            log: log
          }
        end

        # Add notes
        @task.notes.includes(:user).each do |note|
          items << {
            type: :note,
            timestamp: note.created_at,
            user: note.user,
            content: note.content,
            note: note
          }
        end

        # Sort by timestamp (oldest first)
        items.sort_by { |item| item[:timestamp] }
      end

      def render_grouped_timeline_items(items)
        current_user = nil
        current_date = nil

        items.each do |item|
          # Check if we need a new header
          item_date = item[:timestamp].to_date
          item_user = item[:user]

          if current_user != item_user || current_date != item_date
            render_timeline_header(item_user, item[:timestamp])
            current_user = item_user
            current_date = item_date
          end

          render_timeline_item(item)
        end
      end

      def render_timeline_header(user, timestamp)
        div(class: "timeline-header") do
          # Left side with icon and user name
          div(class: "timeline-header-left") do
            if user
              # Show user initials glyph
              span(class: "timeline-header-icon") do
                initials = user.name.split.map(&:first).join.upcase[0..1]
                span { initials }
              end
            end
            span(class: "timeline-header-user") { user&.name || "System" }
          end

          # Right side with date
          span(class: "timeline-header-date") { format_header_date(timestamp) }
        end
      end

      def format_header_date(timestamp)
        if timestamp.today?
          "Today"
        elsif timestamp.yesterday?
          "Yesterday"
        elsif timestamp.year == Time.current.year
          timestamp.strftime("%b %d")
        else
          timestamp.strftime("%b %d, %Y")
        end
      end

      def render_timeline_item(item)
        case item[:type]
        when :created
          render_created_item(item)
        when :status_change
          render_status_change_item(item)
        when :note
          render_note_item(item)
        end
      end

      def render_created_item(item)
        div(class: "timeline-item") do
          div(class: "timeline-row") do
            div(class: "timeline-content") do
              span(class: "timeline-emoji") { "⚫" }
              span(class: "timeline-label") { "Created" }
            end
            div(class: "timeline-time") do
              span { format_time_only(item[:timestamp]) }
            end
          end
        end
      end

      def render_status_change_item(item)
        div(class: "timeline-item") do
          div(class: "timeline-row") do
            div(class: "timeline-content") do
              span(class: "timeline-emoji") { status_emoji(item[:status]) }
              span(class: "timeline-label") { status_label(item[:status]) }
            end
            div(class: "timeline-time") do
              span { format_time_only(item[:timestamp]) }
            end
          end
        end
      end

      def render_note_item(item)
        div(class: "timeline-item timeline-item--note", data: { note_id: item[:note]&.id }) do
          div(class: "timeline-row") do
            div(class: "timeline-content") do
              span(class: "timeline-emoji") do
                svg(
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 19.8242 17.998",
                  width: "18",
                  height: "18",
                  style: "display: block;"
                ) do |s|
                  s.path(
                    d: "M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258Z",
                    fill: "currentColor",
                    fill_opacity: "0.85"
                  )
                  s.path(
                    d: "M4.61914 8.11523L14.873 8.11523C15.2148 8.11523 15.4785 7.8418 15.4785 7.5C15.4785 7.16797 15.2148 6.91406 14.873 6.91406L4.61914 6.91406C4.25781 6.91406 4.00391 7.16797 4.00391 7.5C4.00391 7.8418 4.25781 8.11523 4.61914 8.11523Z",
                    fill: "currentColor",
                    fill_opacity: "0.85"
                  )
                  s.path(
                    d: "M4.61914 11.0547L14.873 11.0547C15.2148 11.0547 15.4785 10.8008 15.4785 10.4688C15.4785 10.1172 15.2148 9.85352 14.873 9.85352L4.61914 9.85352C4.25781 9.85352 4.00391 10.1172 4.00391 10.4688C4.00391 10.8008 4.25781 11.0547 4.61914 11.0547Z",
                    fill: "currentColor",
                    fill_opacity: "0.85"
                  )
                  s.path(
                    d: "M4.61914 13.9941L11.1328 13.9941C11.4746 13.9941 11.7383 13.7402 11.7383 13.4082C11.7383 13.0664 11.4746 12.793 11.1328 12.793L4.61914 12.793C4.25781 12.793 4.00391 13.0664 4.00391 13.4082C4.00391 13.7402 4.25781 13.9941 4.61914 13.9941Z",
                    fill: "currentColor",
                    fill_opacity: "0.85"
                  )
                end
              end
              span(class: "timeline-note") { item[:content] }
            end
            div(class: "timeline-time") do
              span { format_time_only(item[:timestamp]) }
            end
          end
        end
      end

      def render_add_note_form
        div(class: "add-note-section") do
          textarea(
            class: "note-input",
            placeholder: "Add a note...",
            rows: 2,
            data: {
              task_info_target: "noteInput",
              action: "keydown.cmd+enter->task-info#addNote keydown.ctrl+enter->task-info#addNote"
            }
          )
          div(class: "note-actions") do
            button(
              class: "button button--primary",
              data: { action: "click->task-info#addNote" }
            ) { "Add Note" }
          end
        end
      end

      def status_emoji(status)
        task_status = TaskStatus.find(status)
        task_status&.emoji || "❓"
      end

      def status_label(status)
        task_status = TaskStatus.find(status)
        task_status&.label || status&.humanize || "Unknown"
      end

      def format_timestamp(timestamp)
        if timestamp.today?
          "today at #{timestamp.strftime("%l:%M %p").strip}"
        elsif timestamp.yesterday?
          "yesterday at #{timestamp.strftime("%l:%M %p").strip}"
        elsif timestamp.year == Time.current.year
          timestamp.strftime("%b %d at %l:%M %p").strip
        else
          timestamp.strftime("%b %d, %Y at %l:%M %p").strip
        end
      end

      def format_time_only(timestamp)
        timestamp.strftime("%l:%M %p").strip
      end
    end
  end
end
