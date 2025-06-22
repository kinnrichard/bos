module Views
  module Tasks
    class ListComponent < Phlex::HTML
      def initialize(job:, tasks_tree:)
        @job = job
        @tasks_tree = tasks_tree
      end

      def view_template
        @tasks_tree.each do |task_node|
          render_task_with_subtasks(task_node, 0)
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
              div(
                class: "task-title",
                contenteditable: "true",
                data: {
                  job_target: "newTaskText",
                  action: "focus->job#clearNewTaskPlaceholder"
                }
              ) do
                "New task..."
              end
            end
          end
        end
      end

      private

      def render_task_with_subtasks(task_node, depth)
        task = task_node[:task]
        subtasks = task_node[:subtasks]
        has_subtasks = subtasks.any?

        # Task wrapper with depth for styling
        div(class: "task-wrapper", data: { depth: depth, task_id: task.id }) do
          # Render the task itself
          render_task_item(task, has_subtasks)

          # Render subtasks container if any
          if has_subtasks
            div(
              class: "subtasks-container",
              data: {
                parent_task_id: task.id,
                job_target: "subtasksContainer"
              }
            ) do
              subtasks.each do |subtask_node|
                render_task_with_subtasks(subtask_node, depth + 1)
              end
            end
          end
        end
      end

      def render_task_item(task, has_subtasks)
        # Get time tracking data for in-progress tasks
        time_data = {}
        if task.in_progress?
          last_start = task.activity_logs
            .where(action: "status_changed")
            .where("metadata->>'new_status' = ?", "in_progress")
            .order(:created_at)
            .last&.created_at

          time_data[:in_progress_since] = last_start.iso8601 if last_start
          time_data[:accumulated_seconds] = task.time_in_progress
        end

        div(
          class: "task-item #{task.successfully_completed? ? 'completed' : ''}",
          data: {
            task_id: task.id,
            task_status: task.status,
            task_position: task.position,
            parent_id: task.parent_id,
            job_target: "task",
            action: "click->job#handleTaskClick"
          }.merge(time_data)
        ) do
          # Status dropdown using the existing dropdown controller
          div(
            class: "dropdown-container task-status-container",
            data: {
              controller: "dropdown",
              dropdown_positioning_value: "fixed",
              dropdown_z_index_value: "1100",
              dropdown_auto_width: "true"
            }
          ) do
            button(
              class: "task-status-button",
              data: {
                dropdown_target: "button",
                action: "click->dropdown#toggle"
              }
            ) do
              span { task.status_emoji || "⚫" }
            end

            # Status dropdown menu
            div(
              class: "dropdown-menu hidden",
              data: { dropdown_target: "menu" }
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

          # Task right section (icons, time tracking, disclosure)
          div(class: "task-right") do
            # Notes indicator
            if task.notes.any?
              span(class: "note-indicator", title: "Has notes") { "📝" }
            end

            # Assignee indicator
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

            # Disclosure triangle for subtasks
            if has_subtasks
              button(
                class: "disclosure-triangle",
                data: {
                  action: "click->job#toggleSubtasks",
                  task_id: task.id,
                  job_target: "disclosureTriangle"
                },
                title: "#{task.subtasks_count} subtask#{'s' if task.subtasks_count > 1}"
              ) do
                span(class: "triangle-icon") { "▶" }
                span(class: "subtask-count") { task.subtasks_count }
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
            class: "dropdown-option task-status-option #{task.status == status ? 'active' : ''}",
            data: {
              action: "click->dropdown#close click->job#updateTaskStatus",
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
