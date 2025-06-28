module Views
  module Tasks
    class ListComponent < Phlex::HTML
      include IconsHelper
      def initialize(job:, tasks_tree:, last_status_changes: nil, time_in_progress: nil)
        @job = job
        @tasks_tree = tasks_tree
        @last_status_changes = last_status_changes || {}
        @time_in_progress = time_in_progress || {}
      end

      def view_template
        # First, render existing tasks if any
        if !@tasks_tree.empty?
          @tasks_tree.each do |task_node|
            render_task_with_subtasks(task_node, 0)
          end
        end

        # New task placeholder - always shown first when no tasks
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
                span { task_status_emoji("new_task") }
              end
            end
            div(class: "task-content") do
              div(
                class: "task-title new-task-placeholder",
                contenteditable: "false",
                data: {
                  job_target: "newTaskText",
                  placeholder: "New task..."
                }
              )
            end
          end
        end

        # Show instructional text only if no tasks exist
        if @tasks_tree.empty?
          div(class: "empty-tasks") do
            p { "No tasks yet." }
            p { "Please add your first task above." }
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
          last_start = @last_status_changes[task.id]

          time_data[:in_progress_since] = last_start.iso8601 if last_start
          time_data[:accumulated_seconds] = @time_in_progress[task.id] || 0
        end

        div(
          class: "task-item #{task.successfully_completed? ? 'completed' : ''}",
          data: {
            task_id: task.id,
            task_status: task.status,
            task_position: task.position,
            parent_id: task.parent_id,
            job_target: "task",
            flip_target: "item",
            action: "click->job#handleTaskClick",
            flip_item: task.id.to_s  # Unique identifier for FLIP
          }.merge(time_data)
        ) do
          # Status dropdown using the existing dropdown controller
          div(
            class: "dropdown-container task-status-container",
            data: {
              controller: "dropdown",
              dropdown_positioning_value: "fixed",
              dropdown_z_index_value: "10000",
              dropdown_auto_width: "true",
              dropdown_close_on_select_value: "true"
            }
          ) do
            button(
              class: "task-status-button",
              data: {
                dropdown_target: "button",
                action: "click->dropdown#toggle"
              }
            ) do
              span { task_status_emoji(task.status) }
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
              contenteditable: "false",
              data: {
                action: "focus->job#storeOriginalTitle blur->job#updateTaskTitle click->job#handleTaskTitleClick keydown->job#handleTaskTitleKeydown",
                task_id: task.id,
                original_title: task.title
              }
            ) { task.title }
          end

          # Task right section (icons, time tracking, disclosure)
          div(class: "task-right") do
            # Info button
            button(
              class: "task-info-button",
              data: {
                action: "click->job#showTaskInfo",
                task_id: task.id
              },
              title: "Task details",
              aria_label: "Show task details"
            ) do
              svg(
                xmlns: "http://www.w3.org/2000/svg",
                viewBox: "0 0 20.2832 19.9316",
                width: "16",
                height: "16",
                style: "display: block;"
              ) do |s|
                # Outer circle
                s.path(
                  d: "M9.96094 19.9219C15.459 19.9219 19.9219 15.459 19.9219 9.96094C19.9219 4.46289 15.459 0 9.96094 0C4.46289 0 0 4.46289 0 9.96094C0 15.459 4.46289 19.9219 9.96094 19.9219ZM9.96094 18.2617C5.37109 18.2617 1.66016 14.5508 1.66016 9.96094C1.66016 5.37109 5.37109 1.66016 9.96094 1.66016C14.5508 1.66016 18.2617 5.37109 18.2617 9.96094C18.2617 14.5508 14.5508 18.2617 9.96094 18.2617Z",
                  fill: "currentColor"
                )
                # Info "i" symbol
                s.path(
                  d: "M8.25195 15.4297L12.2266 15.4297C12.627 15.4297 12.9395 15.1367 12.9395 14.7363C12.9395 14.3555 12.627 14.0527 12.2266 14.0527L11.0156 14.0527L11.0156 9.08203C11.0156 8.55469 10.752 8.20312 10.2539 8.20312L8.41797 8.20312C8.01758 8.20312 7.70508 8.50586 7.70508 8.88672C7.70508 9.28711 8.01758 9.58008 8.41797 9.58008L9.46289 9.58008L9.46289 14.0527L8.25195 14.0527C7.85156 14.0527 7.53906 14.3555 7.53906 14.7363C7.53906 15.1367 7.85156 15.4297 8.25195 15.4297ZM9.87305 6.58203C10.5859 6.58203 11.1426 6.01562 11.1426 5.30273C11.1426 4.58984 10.5859 4.02344 9.87305 4.02344C9.16992 4.02344 8.60352 4.58984 8.60352 5.30273C8.60352 6.01562 9.16992 6.58203 9.87305 6.58203Z",
                  fill: "currentColor"
                )
              end
            end

            # Notes indicator
            if task.association(:notes).loaded? && task.notes.any?
              span(class: "note-indicator", title: "Has notes") do
                svg(
                  xmlns: "http://www.w3.org/2000/svg",
                  viewBox: "0 0 19.8242 17.998",
                  width: "16",
                  height: "16"
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
            end

            # Assignee indicator
            if task.association(:assigned_to).loaded? && task.assigned_to
              span(class: "assignee-indicator", title: "Assigned to #{task.assigned_to.name}") do
                initials = task.assigned_to.name.split.map(&:first).join.upcase[0..1]
                span(class: "assignee-initials") { initials }
              end
            end


            # Disclosure triangle for subtasks
            if has_subtasks
              div(class: "disclosure-container") do
                # Subtask count (visible when collapsed)
                span(
                  class: "subtask-count",
                  data: {
                    disclosure_target: "count",
                    task_id: task.id
                  },
                  style: "display: none;"
                ) { task.subtasks_count.to_s }

                button(
                  class: "disclosure-triangle",
                  data: {
                    action: "click->job#toggleSubtasks",
                    task_id: task.id,
                    job_target: "disclosureTriangle"
                  },
                  title: "#{task.subtasks_count} subtask#{'s' if task.subtasks_count > 1}",
                  aria_expanded: "true",
                  aria_label: "Toggle subtasks"
                ) do
                  # Chevron down (expanded state)
                  svg(
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 17.3242 10.4004",
                    width: "12",
                    height: "8",
                    class: "chevron-down"
                  ) do |s|
                    s.path(
                      d: "M8.48633 10.4004C8.73047 10.4004 8.97461 10.3027 9.14062 10.1172L16.6992 2.37305C16.8652 2.20703 16.9629 1.99219 16.9629 1.74805C16.9629 1.24023 16.582 0.849609 16.0742 0.849609C15.8301 0.849609 15.6055 0.947266 15.4395 1.10352L7.95898 8.75L9.00391 8.75L1.52344 1.10352C1.36719 0.947266 1.14258 0.849609 0.888672 0.849609C0.380859 0.849609 0 1.24023 0 1.74805C0 1.99219 0.0976562 2.20703 0.263672 2.38281L7.82227 10.1172C8.00781 10.3027 8.23242 10.4004 8.48633 10.4004Z",
                      fill: "currentColor"
                    )
                  end

                  # Chevron right (collapsed state)
                  svg(
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 11.6895 16.9629",
                    width: "8",
                    height: "12",
                    class: "chevron-right"
                  ) do |s|
                    s.path(
                      d: "M11.6895 8.47656C11.6895 8.23242 11.5918 8.00781 11.4062 7.83203L3.67188 0.253906C3.49609 0.0878906 3.28125 0 3.02734 0C2.5293 0 2.13867 0.380859 2.13867 0.888672C2.13867 1.13281 2.23633 1.35742 2.39258 1.52344L9.50195 8.47656L2.39258 15.4297C2.23633 15.5957 2.13867 15.8105 2.13867 16.0645C2.13867 16.5723 2.5293 16.9531 3.02734 16.9531C3.28125 16.9531 3.49609 16.8652 3.67188 16.6895L11.4062 9.12109C11.5918 8.93555 11.6895 8.7207 11.6895 8.47656Z",
                      fill: "currentColor"
                    )
                  end
                end
              end
            end
          end
        end
      end

      def render_task_status_options(task)
        TASK_STATUSES.each do |status|
          button(
            class: "dropdown-option task-status-option #{task.status == status ? 'active' : ''}",
            data: {
              action: "click->dropdown#close click->job#updateTaskStatus",
              task_id: task.id,
              status: status
            }
          ) do
            span(class: "status-emoji") { task_status_emoji(status) }
            span { task_status_label(status) }
          end
        end
      end

      private

      def format_time_duration(seconds)
        return nil if seconds == 0

        hours = seconds / 3600.0
        minutes = (seconds % 3600) / 60

        if hours >= 1.0
          # Show only hours with exactly 1 decimal place
          "#{format('%.1f', hours)} hr"
        else
          # Show only minutes, rounded down
          "#{minutes.floor} min"
        end
      end
    end
  end
end
