# frozen_string_literal: true

module Views
  module Jobs
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::ContentTag
      include Phlex::Rails::Helpers::FormWith
      
      def initialize(client:, job:, current_user:)
        @client = client
        @job = job
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "#{@job.title} - #{@client.name}",
          current_user: @current_user,
          active_section: :jobs,
          client: @client,
          toolbar_items: method(:render_toolbar_items)
        ) do
          div(class: "job-view", data: { 
            controller: "job sortable",
            job_id: @job.id, 
            client_id: @client.id,
            job_status_value: @job.status,
            job_priority_value: @job.priority,
            action: "task:reorder->job#handleTaskReorder subtask:reorder->job#handleSubtaskReorder"
          }) do
            # Job title
            div(class: "job-title-section") do
              h1(
                class: "job-title",
                contenteditable: "true",
                data: { 
                  action: "blur->job#updateTitle keydown.enter->job#handleTitleEnter",
                  job_target: "title"
                }
              ) { @job.title }
            end
            
            # Tasks list
            div(class: "tasks-container", data: { job_target: "tasksContainer" }) do
              # Existing tasks (only root tasks)
              div(class: "tasks-list", data: { job_target: "tasksList" }) do
                if @job.tasks.root_tasks.any?
                  @job.tasks.root_tasks.order(Arel.sql("CASE 
                    WHEN status = 1 THEN 1
                    WHEN status = 2 THEN 2
                    WHEN status = 0 THEN 3
                    WHEN status = 3 THEN 4
                    WHEN status = 4 THEN 5
                    END, position ASC")).each do |task|
                    render_task_item(task)
                  end
                else
                  div(class: "empty-tasks") do
                    p { "No tasks yet. Click below to add a task." }
                  end
                end
                
                # New task placeholder with same structure as regular tasks
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
                      button(
                        class: "task-status-button",
                        disabled: true
                      ) do
                        span { "⚫" }
                      end
                    end
                    div(class: "task-content") do
                      div(
                        class: "task-title", 
                        contenteditable: "true",
                        data: { job_target: "newTaskText" }
                      ) { "New task..." }
                    end
                  end
                end
              end
            end
            
            # Status/Assignment Popover
            div(
              class: "job-popover hidden",
              data: { job_target: "popover" }
            ) do
              # Arrow pointer
              div(class: "popover-arrow")
              
              div(class: "popover-content") do
                # Status section
                div(class: "popover-section") do
                  h3 { "Status" }
                  div(class: "dropdown-container", data: { controller: "dropdown" }) do
                    button(
                      class: "dropdown-button",
                      data: { 
                        action: "click->dropdown#toggle",
                        dropdown_target: "button"
                      }
                    ) do
                      span(class: "dropdown-value") do
                        span(class: "status-emoji") { job_status_emoji(@job.status) }
                        span { status_label(@job.status) }
                      end
                      span(class: "dropdown-arrow") { "▼" }
                    end
                    div(
                      class: "dropdown-menu hidden",
                      data: { dropdown_target: "menu" }
                    ) do
                      render_status_options
                    end
                  end
                end
                
                # Assignee section (moved to second position)
                div(class: "popover-section") do
                  h3 { "Assigned to" }
                  div(class: "dropdown-container", data: { controller: "dropdown" }) do
                    button(
                      class: "dropdown-button",
                      data: { 
                        action: "click->dropdown#toggle",
                        dropdown_target: "button"
                      }
                    ) do
                      span(class: "dropdown-value") do
                        if @job.technicians.any?
                          if @job.technicians.count == 1
                            technician_icon(@job.technicians.first)
                            span { @job.technicians.first.name }
                          else
                            span { "#{@job.technicians.count} assigned" }
                          end
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
                      render_assignee_options
                    end
                  end
                end
                
                # Priority section (moved to third position)
                div(class: "popover-section") do
                  h3 { "Priority" }
                  div(class: "dropdown-container", data: { controller: "dropdown" }) do
                    button(
                      class: "dropdown-button",
                      data: { 
                        action: "click->dropdown#toggle",
                        dropdown_target: "button"
                      }
                    ) do
                      span(class: "dropdown-value") do
                        if priority_emoji(@job.priority).present?
                          span(class: "priority-emoji") { priority_emoji(@job.priority) }
                        end
                        span { priority_label(@job.priority) }
                      end
                      span(class: "dropdown-arrow") { "▼" }
                    end
                    div(
                      class: "dropdown-menu hidden",
                      data: { dropdown_target: "menu" }
                    ) do
                      render_priority_options
                    end
                  end
                end
                
                # Job details section
                if @job.description.present? || @job.people.any?
                  div(class: "popover-section") do
                    h3 { "Details" }
                    
                    if @job.description.present?
                      div(class: "job-description") do
                        p { @job.description }
                      end
                    end
                    
                    if @job.people.any?
                      div(class: "related-people") do
                        h4 { "Related People" }
                        @job.people.each do |person|
                          div(class: "person-tag") { person.name }
                        end
                      end
                    end
                  end
                end
                
                # Actions section
                div(class: "popover-section popover-actions") do
                  if @current_user.can_delete?(@job)
                    render Components::Ui::ButtonComponent.new(
                      variant: :danger,
                      data: { 
                        action: "click->job#confirmDelete"
                      }
                    ) { "Delete Job" }
                  end
                end
              end
            end
          end
        end
      end
      
      private
      
      def render_toolbar_items(view)
        # Status bubble with assignee and status
        view.button(
          class: "status-bubble job-status-bubble",
          data: { 
            action: "click->header-job#toggleJobPopover"
          }
        ) do
          render_status_bubble
        end
      end
      
      def render_status_bubble
        # Status icon
        span(class: "bubble-icon status-icon") do
          job_status_emoji(@job.status)
        end
        
        # Assignee or unassigned icon
        span(class: "bubble-icon assignee-icon") do
          if @job.technicians.any?
            # Show first technician's initial or emoji
            technician_icon(@job.technicians.first)
          else
            "❓"
          end
        end
        
        # Priority emoji (if not normal)
        if @job.priority != 'normal'
          span(class: "bubble-icon priority-icon") do
            priority_emoji(@job.priority)
          end
        end
      end
      
      def render_task_item(task)
        # Get time tracking data for in-progress tasks
        time_data = {}
        if task.in_progress?
          # Get the last time it went into progress
          last_start = task.activity_logs
            .where(action: 'status_changed')
            .where("metadata->>'new_status' = ?", 'in_progress')
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
              
              # Show subtask count if any
              if task.has_subtasks?
                span(class: "subtask-count", style: "font-size: 13px; color: #8E8E93; margin-left: 8px;") do
                  "(#{task.subtasks.count} subtask#{task.subtasks.count == 1 ? '' : 's'})"
                end
              end
            end
            
            # Right side section
            div(class: "task-right") do
              # Time tracking (if in progress)
              if task.in_progress? || task.formatted_time_in_progress.present?
                div(
                  class: "task-time-tracking",
                  data: { 
                    job_target: "taskTimer",
                    task_id: task.id
                  }
                ) do
                  span(class: "time-value") { task.formatted_time_in_progress || "0m" }
                end
              end
              
              # Icons
              if task.notes.any?
                span(class: "task-icon info-icon", title: "#{task.notes.count} notes") { "ⓘ" }
              end
              
              if task.assigned_to
                div(class: "task-assignee-icon", title: task.assigned_to.name) do
                  technician_icon(task.assigned_to)
                end
              end
              
            end
          end
          
          # Render subtasks if any
          if task.has_subtasks?
            div(class: "subtasks subtasks-container") do
              task.subtasks.order(:position).each do |subtask|
                render_subtask_item(subtask)
              end
            end
          end
        end
      end
      
      def render_subtask_item(subtask)
        # Wrap subtask in task-wrapper for drag-and-drop
        div(class: "task-wrapper") do
          div(
            class: "subtask-item #{subtask.successfully_completed? ? 'completed' : ''}",
            data: { 
              task_id: subtask.id,
              task_status: subtask.status,
              parent_id: subtask.parent_id,
              action: "click->job#handleTaskClick"
            }
          ) do
            # Status button container
            div(class: "task-status-container") do
              button(
                class: "subtask-status-button",
                data: { 
                  action: "click->job#toggleTaskStatus",
                  job_target: "taskStatusButton"
                }
              ) do
                span { subtask.status_emoji || "⚫" }
              end
              
              # Status dropdown (hidden by default)
              div(
                class: "task-status-dropdown hidden",
                data: { job_target: "taskStatusDropdown" }
              ) do
                render_task_status_options(subtask)
              end
            end
            
            # Subtask content
            div(class: "subtask-content") do
              div(
                class: "subtask-title",
                contenteditable: "true",
                data: { 
                  action: "focus->job#storeOriginalTitle blur->job#updateTaskTitle click->job#handleTaskTitleClick keydown->job#handleTaskTitleKeydown",
                  task_id: subtask.id,
                  original_title: subtask.title
                }
              ) { subtask.title }
              
              # Show subtask count if any
              if subtask.has_subtasks?
                span(class: "subtask-count", style: "font-size: 13px; color: #8E8E93; margin-left: 8px;") do
                  "(#{subtask.subtasks.count} subtask#{subtask.subtasks.count == 1 ? '' : 's'})"
                end
              end
              
              # Show time in progress if available
              if subtask.formatted_time_in_progress.present?
                div(class: "subtask-time-tracking") do
                  span(class: "time-icon") { "⏱️" }
                  span(class: "time-value") { subtask.formatted_time_in_progress }
                end
              end
            end
          end
          
          # Render sub-subtasks if any
          if subtask.has_subtasks?
            div(class: "subtasks subtasks-container") do
              subtask.subtasks.order(:position).each do |sub_subtask|
                render_subtask_item(sub_subtask)
              end
            end
          end
        end
      end
      
      def render_status_options
        statuses = {
          'open' => { emoji: '⚫', label: 'New' },
          'in_progress' => { emoji: '🟢', label: 'In Progress' },
          'paused' => { emoji: '⏸️', label: 'Paused' },
          'successfully_completed' => { emoji: '☑️', label: 'Successfully Completed' },
          'cancelled' => { emoji: '❌', label: 'Cancelled' }
        }
        
        statuses.each do |status, info|
          button(
            class: "status-option #{@job.status == status ? 'active' : ''}",
            data: { 
              action: "click->job#updateStatus",
              status: status
            }
          ) do
            span(class: "status-emoji") { info[:emoji] }
            span { info[:label] }
          end
        end
      end
      
      def render_priority_options
        priorities = {
          'critical' => { emoji: '🔥', label: 'Critical' },
          'high' => { emoji: '❗', label: 'High' },
          'normal' => { emoji: '', label: 'Normal' },
          'low' => { emoji: '➖', label: 'Low' },
          'proactive_followup' => { emoji: '💬', label: 'Proactive Followup' }
        }
        
        priorities.each do |priority, info|
          button(
            class: "priority-option #{@job.priority == priority ? 'active' : ''}",
            data: { 
              action: "click->job#updatePriority",
              priority: priority
            }
          ) do
            if info[:emoji].present?
              span(class: "priority-emoji") { info[:emoji] }
            else
              span(class: "priority-emoji") { "&nbsp;".html_safe }
            end
            span { info[:label] }
          end
        end
      end
      
      def priority_emoji(priority)
        case priority
        when 'critical' then '🔥'
        when 'high' then '❗'
        when 'low' then '➖'
        when 'proactive_followup' then '💬'
        else ''
        end
      end
      
      def job_status_emoji(status)
        case status
        when 'open' then '⚫'
        when 'in_progress' then '🟢'
        when 'paused' then '⏸️'
        when 'successfully_completed' then '☑️'
        when 'cancelled' then '❌'
        else '❓'
        end
      end
      
      def status_label(status)
        case status
        when 'open' then 'New'
        when 'in_progress' then 'In Progress'
        when 'paused' then 'Paused'
        when 'successfully_completed' then 'Successfully Completed'
        when 'cancelled' then 'Cancelled'
        else status.humanize
        end
      end
      
      def priority_label(priority)
        case priority
        when 'proactive_followup' then 'Proactive Followup'
        else priority&.humanize || 'Normal'
        end
      end
      
      def technician_icon(technician)
        # For now, use initials. Could be replaced with actual avatars
        initials = technician.name.split.map(&:first).join.upcase[0..1]
        span(class: "technician-initials") { initials }
      end
      
      def render_assignee_options
        # Unassigned option
        button(
          class: "assignee-option #{@job.technicians.empty? ? 'active' : ''}",
          data: { 
            action: "click->job#setUnassigned"
          }
        ) do
          span { "❓" }
          span { "Unassigned" }
        end
        
        # Get all available technicians
        User.where(role: [:technician, :admin]).order(:name).each do |tech|
          is_assigned = @job.technicians.include?(tech)
          button(
            class: "assignee-option #{is_assigned ? 'active' : ''}",
            data: { 
              action: "click->job#toggleAssignee",
              technician_id: tech.id
            }
          ) do
            technician_icon(tech)
            span { tech.name }
            if is_assigned
              span(class: "checkmark") { "✓" }
            end
          end
        end
      end
      
      def render_task_status_options(task)
        task_statuses = {
          'new_task' => { emoji: '⚫', label: 'New' },
          'in_progress' => { emoji: '🟢', label: 'In Progress' },
          'paused' => { emoji: '⏸️', label: 'Paused' },
          'successfully_completed' => { emoji: '☑️', label: 'Successfully Completed' },
          'cancelled' => { emoji: '❌', label: 'Cancelled' }
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