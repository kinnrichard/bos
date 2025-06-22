module Views
  module Tasks
    class ListComponent < Phlex::HTML
      def initialize(job:, tasks_tree:)
        @job = job
        @tasks_tree = tasks_tree
      end

      def template
        @tasks_tree.each do |task_node|
          render_task_with_subtasks(task_node)
        end

        # New task placeholder
        div(class: "task-wrapper new-task-wrapper") do
          div(
            class: "task-item new-task",
            data: {
              action: "click->job#showNewTaskInput",
              job_target: "newTaskPlaceholder"
            },
            title: "Click or press Enter to create a new task"
          ) do
            div(class: "task-status-container") do
              button(class: "task-status-button", disabled: true) do
                span { "⚫" }
              end
            end
            div(class: "task-content") do
              div(class: "task-title", contenteditable: "true", data: { job_target: "newTaskText" }) do
                "New task..."
              end
            end
          end
        end
      end

      private

      def render_task_with_subtasks(task_node)
        task = task_node[:task]
        subtasks = task_node[:subtasks]

        # Main task
        render_task_item(task)

        # Subtasks (if any)
        if subtasks.any?
          div(class: "subtasks-container", data: { parent_task_id: task.id }) do
            subtasks.each do |subtask_node|
              render_subtask_item(subtask_node[:task])
              # Recursive call for nested subtasks
              if subtask_node[:subtasks].any?
                render_task_with_subtasks(subtask_node)
              end
            end
          end
        end
      end

      def render_task_item(task)
        # Get time tracking data for in-progress tasks
        time_data = {}
        if task.in_progress?
          # Get the last time it went into progress
          last_start = task.activity_logs
            .where(action: "status_changed")
            .where("metadata->>'new_status' = ?", "in_progress")
            .order(:created_at)
            .last&.created_at

          time_data[:in_progress_since] = last_start.iso8601 if last_start
          time_data[:accumulated_seconds] = task.time_in_progress
        end

        div(class: "task-wrapper") do
          div(
            class: "task-item #{task.successfully_completed? ? 'completed' : ''}",
            data: {
              task_id: task.id,
              task_status: task.status,
              task_position: task.position,
              job_target: "task",
              action: "click->job#handleTaskClick"
            }.merge(time_data)
          ) do
            # Status indicator with dropdown
            div(class: "task-status-container") do
              button(
                class: "task-status-button",
                data: { action: "click->job#toggleTaskStatus" }
              ) do
                span { task.status_emoji || "⚫" }
              end

              # Status dropdown (hidden by default)
              div(
                class: "task-status-dropdown hidden",
                data: { job_target: "taskStatusDropdown" }
              ) do
                render_task_status_options(task)
              end
            end

            # Task content
            div(class: "task-content") do
              div(
                class: "task-title",
                contenteditable: "true",
                data: {
                  action: "focus->job#storeOriginalTitle blur->job#updateTaskTitle click->job#handleTaskTitleClick keydown->job#handleTaskTitleKeydown",
                  task_id: task.id,
                  original_title: task.title
                }
              ) { task.title }
            end

            # Task right section (icons, time tracking)
            div(class: "task-right") do
              if task.subtasks_count > 0
                span(class: "subtask-count", title: "#{task.subtasks_count} subtask#{'s' if task.subtasks_count > 1}") do
                  span(class: "subtask-icon") { "▼" }
                  span { task.subtasks_count }
                end
              end

              if task.notes.any?
                span(class: "note-indicator", title: "Has notes") { "📝" }
              end

              if task.assigned_to
                span(class: "assignee-indicator", title: "Assigned to #{task.assigned_to.name}") do
                  initials = task.assigned_to.name.split.map(&:first).join.upcase[0..1]
                  span(class: "assignee-initials") { initials }
                end
              end

              # Time tracking display
              if task.in_progress?
                div(
                  class: "task-timer active",
                  data: {
                    job_target: "taskTimer",
                    task_id: task.id
                  }
                ) do
                  span(class: "timer-icon") { "⏱️" }
                  span(class: "timer-display") { task.formatted_time_in_progress || "0m" }
                end
              elsif task.time_in_progress > 0
                div(class: "task-timer") do
                  span(class: "timer-icon") { "⏱️" }
                  span(class: "timer-display") { task.formatted_time_in_progress }
                end
              end
            end
          end
        end
      end

      def render_subtask_item(subtask)
        div(
          class: "subtask-item #{subtask.successfully_completed? ? 'completed' : ''}",
          data: {
            task_id: subtask.id,
            task_status: subtask.status,
            task_position: subtask.position,
            parent_id: subtask.parent_id,
            job_target: "task",
            action: "click->job#handleTaskClick"
          }
        ) do
          # Indentation
          span(class: "subtask-indent") { "" }

          # Status button (simpler for subtasks)
          button(
            class: "subtask-status-button",
            data: { action: "click->job#toggleTaskStatus" }
          ) do
            span { subtask.status_emoji || "⚫" }
          end

          # Status dropdown for subtasks
          div(
            class: "task-status-dropdown hidden",
            data: { job_target: "taskStatusDropdown" }
          ) do
            render_task_status_options(subtask)
          end

          # Subtask content
          div(class: "subtask-content") do
            div(
              class: "task-title",
              contenteditable: "true",
              data: {
                action: "focus->job#storeOriginalTitle blur->job#updateTaskTitle keydown->job#handleTaskTitleKeydown",
                task_id: subtask.id,
                original_title: subtask.title
              }
            ) { subtask.title }
          end

          # Subtask icons/indicators
          div(class: "subtask-right") do
            if subtask.notes.any?
              span(class: "note-indicator", title: "Has notes") { "📝" }
            end

            if subtask.assigned_to
              span(class: "assignee-indicator", title: "Assigned to #{subtask.assigned_to.name}") do
                initials = subtask.assigned_to.name.split.map(&:first).join.upcase[0..1]
                span(class: "assignee-initials") { initials }
              end
            end
          end
        end
      end

      def render_task_status_options(task)
        task_statuses = {
          "new_task" => { emoji: "⚫", label: "New" },
          "in_progress" => { emoji: "🟢", label: "In Progress" },
          "paused" => { emoji: "⏸️", label: "Paused" },
          "successfully_completed" => { emoji: "☑️", label: "Successfully Completed" },
          "cancelled" => { emoji: "❌", label: "Cancelled" }
        }

        task_statuses.each do |status, info|
          button(
            class: "task-status-option #{task.status == status ? 'active' : ''}",
            data: {
              action: "click->job#updateTaskStatus",
              task_id: task.id,
              status: status
            }
          ) do
            span(class: "status-emoji") { info[:emoji] }
            span { info[:label] }
          end
        end
      end
    end
  end
end
