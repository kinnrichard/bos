# frozen_string_literal: true

module Views
  module Jobs
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::ContentTag
      include Phlex::Rails::Helpers::FormWith
      
      def initialize(client:, job:)
        @client = client
        @job = job
      end

      def view_template
        render_layout(
          title: "#{@job.title} - #{@client.name}",
          current_user: current_user,
          active_section: :jobs,
          client: @client,
          toolbar_items: method(:render_toolbar_items),
          extra_controllers: ["job"]
        ) do
          div(class: "job-view", data: { 
            job_id: @job.id, 
            client_id: @client.id,
            job_status_value: @job.status,
            job_priority_value: @job.priority
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
              # New task input (hidden by default)
              div(
                class: "task-item new-task hidden",
                data: { job_target: "newTaskForm" }
              ) do
                div(class: "task-checkbox") do
                  button(class: "checkbox-circle", type: "button")
                end
                input(
                  type: "text",
                  class: "new-task-input",
                  placeholder: "What needs to be done?",
                  data: { 
                    action: "keydown.enter->job#createTask keydown.escape->job#cancelNewTask",
                    job_target: "newTaskInput"
                  }
                )
              end
              
              # Existing tasks (only root tasks)
              div(class: "tasks-list", data: { job_target: "tasksList" }) do
                if @job.tasks.root_tasks.any?
                  @job.tasks.root_tasks.order(:position).each do |task|
                    render_task_item(task)
                  end
                else
                  div(class: "empty-tasks") do
                    p { "No tasks yet. Click + to add a task." }
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
                  div(class: "status-options") do
                    render_status_options
                  end
                end
                
                # Priority section
                div(class: "popover-section") do
                  h3 { "Priority" }
                  div(class: "priority-options") do
                    render_priority_options
                  end
                end
                
                # Assignee section
                div(class: "popover-section") do
                  h3 { "Assigned to" }
                  div(class: "assignee-search", data: { controller: "technician-search" }) do
                    input(
                      type: "text",
                      class: "assignee-input",
                      placeholder: "Search technicians...",
                      data: { 
                        action: "focus->technician-search#showDropdown input->technician-search#search",
                        technician_search_target: "input"
                      }
                    )
                    div(
                      class: "assignee-dropdown hidden",
                      data: { technician_search_target: "dropdown" }
                    ) do
                      # Will be populated by JavaScript
                    end
                  end
                  
                  # Current assignees
                  if @job.technicians.any?
                    div(class: "current-assignees") do
                      @job.technicians.each do |tech|
                        div(class: "assignee-tag") do
                          span { tech.name }
                          button(
                            class: "remove-assignee",
                            data: { 
                              action: "click->job#removeAssignee",
                              technician_id: tech.id
                            }
                          ) { "×" }
                        end
                      end
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
                  if current_user.can_delete?(@job)
                    button(
                      class: "btn-danger",
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
            action: "click->job#togglePopover"
          }
        ) do
          render_status_bubble
        end
        
        # List view button (placeholder)
        view.button(class: "toolbar-button", disabled: true) { "☰" }
        
        # Add task button
        view.button(
          class: "toolbar-button",
          data: { action: "click->job#addNewTask" }
        ) { "+" }
        
        # Search
        view.div(class: "toolbar-search") do
          view.input(
            type: "search",
            placeholder: "Search tasks",
            class: "toolbar-search-input",
            data: { 
              action: "input->job#filterTasks",
              job_target: "searchInput"
            }
          )
        end
      end
      
      def render_status_bubble
        # Priority emoji (if not normal)
        if @job.priority != 'normal'
          span(class: "bubble-icon priority-icon") do
            priority_emoji(@job.priority)
          end
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
        
        # Status icon
        span(class: "bubble-icon status-icon") do
          job_status_emoji(@job.status)
        end
      end
      
      def render_task_item(task)
        div(
          class: "task-item #{task.successfully_completed? ? 'completed' : ''}",
          draggable: "true",
          data: { 
            task_id: task.id,
            task_status: task.status,
            task_position: task.position,
            job_target: "task",
            action: "dragstart->job#handleDragStart dragover->job#handleDragOver drop->job#handleDrop dragend->job#handleDragEnd"
          }
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
            div(class: "task-title") { task.title }
            
            # Show time in progress if available
            if task.formatted_time_in_progress.present?
              div(class: "task-time-tracking") do
                span(class: "time-icon") { "⏱️" }
                span(class: "time-value") { task.formatted_time_in_progress }
              end
            end
            
            if task.notes.any?
              div(class: "task-notes") { "Notes" }
            end
          end
          
          # Right side icons
          div(class: "task-icons") do
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
          div(class: "subtasks-container") do
            task.subtasks.order(:position).each do |subtask|
              render_subtask_item(subtask)
            end
          end
        end
        
        # Add subtask button
        button(
          class: "add-subtask-button",
          data: { 
            action: "click->job#addSubtask",
            parent_task_id: task.id
          }
        ) { "+ Add subtask" }
      end
      
      def render_subtask_item(subtask)
        div(
          class: "subtask-item #{subtask.successfully_completed? ? 'completed' : ''}",
          data: { 
            task_id: subtask.id,
            task_status: subtask.status
          }
        ) do
          # Status indicator
          button(
            class: "subtask-status-button",
            data: { action: "click->job#toggleSubtaskStatus" }
          ) do
            span { subtask.status_emoji || "⚫" }
          end
          
          # Subtask content
          div(class: "subtask-content") do
            div(class: "subtask-title") { subtask.title }
            
            # Show time in progress if available
            if subtask.formatted_time_in_progress.present?
              div(class: "subtask-time-tracking") do
                span(class: "time-icon") { "⏱️" }
                span(class: "time-value") { subtask.formatted_time_in_progress }
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
      
      def technician_icon(technician)
        # For now, use initials. Could be replaced with actual avatars
        initials = technician.name.split.map(&:first).join.upcase[0..1]
        span(class: "technician-initials") { initials }
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