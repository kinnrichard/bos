# frozen_string_literal: true

module Components
  module Tasks
    class InfoPanelComponent < Components::Base
      def initialize(task:, current_user:, available_technicians: [])
        @task = task
        @current_user = current_user
        @available_technicians = available_technicians
      end

      def view_template
        div(
          class: "task-info-panel hidden",
          data: {
            controller: "task-info",
            task_info_task_id_value: @task.id,
            task_info_client_id_value: @task.job.client_id,
            task_info_job_id_value: @task.job_id
          }
        ) do
          # Header with close button
          div(class: "info-panel-header") do
            h3 { "Task Details" }
            button(
              class: "close-button",
              data: { action: "click->task-info#close" },
              aria_label: "Close panel"
            ) { "✕" }
          end

          # Content
          div(class: "info-panel-content") do
            # Task title
            div(class: "info-section") do
              h4 { @task.title }
            end

            # Assignment section
            render_assignment_section

            # Duration section
            render_duration_section

            # Notes section
            render_notes_section

            # Status history
            render_status_history
          end
        end
      end

      private

      def render_assignment_section
        div(class: "info-section") do
          h5 { "Assigned To" }

          div(class: "dropdown-container", data: {
            controller: "dropdown",
            dropdown_positioning_value: "fixed"
          }) do
            button(
              class: "dropdown-button",
              data: {
                action: "click->dropdown#toggle",
                dropdown_target: "button"
              }
            ) do
              span(class: "dropdown-value") do
                if @task.assigned_to
                  render_technician_badge(@task.assigned_to)
                  span { @task.assigned_to.name }
                else
                  span { "❓" }
                  span { "Unassigned" }
                end
              end
              span(class: "dropdown-arrow") { "▼" }
            end

            div(
              class: "dropdown-menu hidden",
              data: { dropdown_target: "menu" }
            ) do
              # Unassigned option
              button(
                class: "dropdown-option",
                data: {
                  action: "click->dropdown#close click->task-info#updateAssignment",
                  technician_id: ""
                }
              ) do
                span { "❓" }
                span { "Unassigned" }
              end

              # Technician options
              @available_technicians.each do |tech|
                button(
                  class: "dropdown-option #{@task.assigned_to_id == tech.id ? 'active' : ''}",
                  data: {
                    action: "click->dropdown#close click->task-info#updateAssignment",
                    technician_id: tech.id
                  }
                ) do
                  render_technician_badge(tech)
                  span { tech.name }
                end
              end
            end
          end
        end
      end

      def render_duration_section
        div(class: "info-section") do
          h5 { "Time Tracking" }

          div(class: "duration-info") do
            if @task.in_progress?
              div(class: "timer active") do
                span(class: "timer-icon") { "⏱️" }
                span(class: "timer-display", data: {
                  task_info_target: "timer",
                  duration: @task.time_in_progress
                }) { @task.formatted_time_in_progress || "0m" }
              end
            elsif @task.time_in_progress > 0
              div(class: "timer") do
                span(class: "timer-icon") { "⏱️" }
                span(class: "timer-display") { @task.formatted_time_in_progress }
              end
            else
              p(class: "text-muted") { "No time tracked yet" }
            end
          end
        end
      end

      def render_notes_section
        div(class: "info-section") do
          h5 { "Notes" }

          div(class: "notes-container", data: { task_info_target: "notesContainer" }) do
            # Existing notes
            if @task.notes.any?
              @task.notes.order(created_at: :desc).each do |note|
                render_note(note)
              end
            end
          end

          # Add note form
          div(class: "add-note-form") do
            textarea(
              class: "note-input",
              placeholder: "Add a note...",
              data: {
                task_info_target: "noteInput",
                action: "keydown.cmd+enter->task-info#addNote keydown.ctrl+enter->task-info#addNote"
              }
            )
            button(
              class: "button button--primary button--sm",
              data: { action: "click->task-info#addNote" }
            ) { "Add Note" }
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
        div(class: "info-section") do
          h5 { "Status History" }

          status_logs = @task.activity_logs
            .where(action: "status_changed")
            .order(created_at: :desc)
            .limit(10)

          if status_logs.any?
            div(class: "status-history") do
              status_logs.each do |log|
                render_status_change(log)
              end
            end
          else
            p(class: "text-muted") { "No status changes yet" }
          end
        end
      end

      def render_status_change(log)
        div(class: "status-change-item") do
          div(class: "status-change-info") do
            span(class: "status-emoji") { status_emoji(log.metadata["new_status"]) }
            span(class: "status-label") { status_label(log.metadata["new_status"]) }
            span(class: "status-arrow") { "←" }
            if log.metadata["old_status"].present?
              span(class: "status-emoji muted") { status_emoji(log.metadata["old_status"]) }
            end
          end
          div(class: "status-change-meta") do
            span(class: "status-user") { log.user.name }
            span(class: "status-time") { time_ago_in_words(log.created_at) + " ago" }
          end
        end
      end

      def render_technician_badge(technician)
        initials = technician.name.split.map(&:first).join.upcase[0..1]
        span(class: "technician-badge") { initials }
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
        when "successfully_completed" then "Successfully Completed"
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
