# frozen_string_literal: true

module Views
  module Jobs
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::ContentTag
      include Phlex::Rails::Helpers::FormWith
      include Phlex::Rails::Helpers::TurboFrameTag

      def initialize(client:, job:, current_user:, available_technicians: nil, sidebar_stats: nil, tasks_tree: nil, task_list_data: nil)
        @client = client
        @job = job
        @current_user = current_user
        @available_technicians = available_technicians || []
        @sidebar_stats = sidebar_stats
        @tasks_tree = tasks_tree || []
        @task_list_data = task_list_data || {}
      end

      def view_template
        render_layout(
          title: "#{@job.title} - #{@client.name}",
          current_user: @current_user,
          active_section: :jobs,
          client: @client,
          toolbar_items: method(:render_toolbar_items),
          sidebar_stats: @sidebar_stats
        ) do
          div(class: "job-view", data: {
            controller: "job sortable flip",
            job_id: @job.id,
            client_id: @client.id,
            job_status_value: @job.status,
            job_priority_value: @job.priority,
            lock_version: @job.lock_version,
            flip_duration_value: 400,
            flip_stagger_value: 20,
            flip_easing_value: "cubic-bezier(0.4, 0, 0.2, 1)",
            action: "task:reorder->job#handleTaskReorder subtask:reorder->job#handleSubtaskReorder flip:connect->job#registerFlipController"
          }) do
            # Job title and search
            div(class: "job-title-section") do
              div(class: "title-row") do
                h1(
                  class: "job-title",
                  contenteditable: "true",
                  data: {
                    action: "blur->job#updateTitle keydown.enter->job#handleTitleEnter",
                    job_target: "title"
                  }
                ) { @job.title }

                # Task search
                render Components::Tasks::SearchComponent.new(job: @job)
              end
            end

            # Tasks list
            div(
              class: "tasks-container",
              data: {
                job_target: "tasksContainer",
                action: "click->job#handleTasksContainerClick"
              }
            ) do
              # Use pre-loaded task data from controller
              # Render the task list using the new ListComponent
              div(id: "tasks-list", class: "tasks-list", data: { flip_target: "container", job_target: "tasksList", turbo_frame: "tasks-frame" }) do
                if @tasks_tree.any?
                  render Views::Tasks::ListComponent.new(
                    job: @job,
                    tasks_tree: @tasks_tree,
                    last_status_changes: @task_list_data[:last_status_changes],
                    time_in_progress: @task_list_data[:time_in_progress]
                  )
                else
                  div(class: "empty-tasks") do
                    p { "No tasks yet. Click below to add a task." }
                  end
                end
              end
            end

            # Status/Assignment Popover
            div(
              class: "popover job-popover hidden",
              data: {
                job_target: "popover",
                controller: "job-popover",
                job_popover_job_id_value: @job.id,
                job_popover_client_id_value: @client.id
              }
            ) do
              # Arrow pointer
              div(class: "popover-arrow") do
                svg(xmlns: "http://www.w3.org/2000/svg", width: "16", height: "8", viewBox: "0 0 16 8", style: "display: block; overflow: visible;") do |s|
                  # Create clean triangle with crisp edges
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
                          if @job.technicians.size == 1
                            technician_icon(@job.technicians.first)
                            span { @job.technicians.first.name }
                          else
                            span { "#{@job.technicians.size} assigned" }
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

                # Actions section - only show if there are actions available
                if @current_user.can_delete?(@job) && @job.status == "cancelled"
                  div(class: "popover-section popover-actions") do
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

            # Schedule Popover - Streamlined version
            # Use pre-loaded scheduled_date_times from the job
            render Components::Jobs::StreamlinedSchedulePopoverComponent.new(
              job: @job,
              current_user: @current_user,
              scheduled_dates: @job.scheduled_date_times.to_a,
              available_technicians: @available_technicians
            )
          end
        end
      end

      private


      def render_toolbar_items(view)
        # Calendar button for scheduling
        view.button(
          type: "button",
          class: "btn-icon",
          data: {
            action: "click->header-job#toggleSchedulePopover"
          },
          title: "Schedule dates and times"
        ) { "📅" }

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
        if @job.priority != "normal"
          span(class: "bubble-icon priority-icon") do
            priority_emoji(@job.priority)
          end
        end
      end



      def render_status_options
        statuses = {
          "open" => { emoji: "⚫", label: "New" },
          "in_progress" => { emoji: "🟢", label: "In Progress" },
          "paused" => { emoji: "⏸️", label: "Paused" },
          "successfully_completed" => { emoji: "☑️", label: "Successfully Completed" },
          "cancelled" => { emoji: "❌", label: "Cancelled" }
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
          "critical" => { emoji: "🔥", label: "Critical" },
          "high" => { emoji: "❗", label: "High" },
          "normal" => { emoji: "", label: "Normal" },
          "low" => { emoji: "➖", label: "Low" },
          "proactive_followup" => { emoji: "💬", label: "Proactive Followup" }
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
        when "critical" then "🔥"
        when "high" then "❗"
        when "low" then "➖"
        when "proactive_followup" then "💬"
        else ""
        end
      end

      def job_status_emoji(status)
        case status
        when "open" then "⚫"
        when "in_progress" then "🟢"
        when "paused" then "⏸️"
        when "successfully_completed" then "☑️"
        when "cancelled" then "❌"
        else "❓"
        end
      end

      def status_label(status)
        case status
        when "open" then "New"
        when "in_progress" then "In Progress"
        when "paused" then "Paused"
        when "successfully_completed" then "Successfully Completed"
        when "cancelled" then "Cancelled"
        else status.humanize
        end
      end

      def priority_label(priority)
        case priority
        when "proactive_followup" then "Proactive Followup"
        else priority&.humanize || "Normal"
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

        # Use provided technicians data instead of querying database
        @available_technicians.each do |tech|
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
    end
  end
end
