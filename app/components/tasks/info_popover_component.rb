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

          # Popover content
          div(class: "popover-content") do
            # Header with close button
            div(class: "popover-header") do
              h3 { "Task Info" }
              button(
                class: "close-button",
                data: { action: "click->task-info#close" },
                aria_label: "Close popover"
              ) { "✕" }
            end

            # Duration section (moved from inline)
            render_duration_section

            # Notes section
            render_notes_section

            # Status history
            render_status_history
          end
        end
      end

      private

      def render_duration_section
        div(class: "popover-section") do
          h5 do
            span(class: "section-icon") { "⏱️" }
            span { "Duration" }
          end

          div(class: "duration-info") do
            if @task.in_progress?
              div(class: "timer active") do
                span(class: "timer-display", data: {
                  task_info_target: "timer",
                  duration: @task.time_in_progress
                }) { @task.formatted_time_in_progress || "0 min" }
              end
              p(class: "timer-status") { "Timer running..." }
            elsif @task.time_in_progress > 0
              div(class: "timer") do
                span(class: "timer-display") { @task.formatted_time_in_progress }
              end
            else
              p(class: "text-muted") { "No time tracked" }
            end
          end
        end
      end

      def render_notes_section
        div(class: "popover-section") do
          h5 do
            span(class: "section-icon") { "📝" }
            span { "Notes" }
          end

          # Add note form at the top
          div(class: "add-note-form") do
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
                class: "button button--primary button--sm",
                data: { action: "click->task-info#addNote" }
              ) { "Add Note" }
              span(class: "hint") { "Cmd+Enter to add" }
            end
          end

          # Notes list
          div(class: "notes-container", data: { task_info_target: "notesContainer" }) do
            if @task.notes.any?
              @task.notes.order(created_at: :desc).each do |note|
                render_note(note)
              end
            else
              p(class: "text-muted no-notes") { "No notes yet" }
            end
          end
        end
      end

      def render_note(note)
        div(class: "note-item", data: { note_id: note.id }) do
          div(class: "note-header") do
            span(class: "note-author") { note.user.name }
            span(class: "note-time") { time_ago_in_words(note.created_at) + " ago" }
          end
          div(class: "note-content") { note.content }
        end
      end

      def render_status_history
        div(class: "popover-section") do
          h5 do
            span(class: "section-icon") { "📊" }
            span { "Status History" }
          end

          status_logs = @task.activity_logs
            .where(action: [ "status_changed", "created" ])
            .order(created_at: :desc)
            .limit(10)

          if status_logs.any?
            div(class: "status-history") do
              status_logs.each_with_index do |log, index|
                is_last = (index == status_logs.length - 1)
                render_status_change(log, is_last)
              end
            end
          else
            # If no logs, show created status
            div(class: "status-history") do
              div(class: "status-change-item") do
                div(class: "status-change-info") do
                  span(class: "status-emoji") { "⚫" }
                  span(class: "status-label") { "Created" }
                end
                div(class: "status-change-meta") do
                  span(class: "status-time") { @task.created_at.strftime("%b %d, %l:%M %p") }
                end
              end
            end
          end
        end
      end

      def render_status_change(log, is_last = false)
        div(class: "status-change-item") do
          if log.action == "created"
            div(class: "status-change-info") do
              span(class: "status-emoji") { "⚫" }
              span(class: "status-label") { "Created" }
            end
            div(class: "status-change-meta") do
              span(class: "status-time") { log.created_at.strftime("%b %d, %l:%M %p") }
            end
          else
            div(class: "status-change-info") do
              span(class: "status-emoji") { status_emoji(log.metadata["new_status"]) }
              span(class: "status-label") { status_label(log.metadata["new_status"]) }
              unless is_last
                span(class: "status-arrow") { "→" }
              end
            end
            div(class: "status-change-meta") do
              span(class: "status-time") { log.created_at.strftime("%b %d, %l:%M %p") }
            end
          end
        end
      end

      def status_emoji(status)
        case status
        when "new_task" then "⚫"
        when "in_progress" then "🟢"
        when "paused" then "⏸️"
        when "successfully_completed" then "☑️"
        when "cancelled" then "❌"
        else "❓"
        end
      end

      def status_label(status)
        case status
        when "new_task" then "New"
        when "in_progress" then "In Progress"
        when "paused" then "Paused"
        when "successfully_completed" then "Completed"
        when "cancelled" then "Cancelled"
        else status&.humanize || "Unknown"
        end
      end

      def time_ago_in_words(time)
        seconds = Time.current - time
        case seconds
        when 0..59 then "#{seconds.to_i}s"
        when 60..3599 then "#{(seconds / 60).to_i}m"
        when 3600..86399 then "#{(seconds / 3600).to_i}h"
        else "#{(seconds / 86400).to_i}d"
        end
      end
    end
  end
end
