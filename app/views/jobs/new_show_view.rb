# frozen_string_literal: true

module Views
  module Jobs
    class NewShowView < Views::Base
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
          title: "New Job - #{@client.name}",
          current_user: @current_user,
          active_section: :jobs,
          client: @client,
          toolbar_items: method(:render_toolbar_items),
          sidebar_stats: @sidebar_stats
        ) do
          div(class: "job-view", data: {
            controller: "job sortable flip job-title",
            new_job: "true",
            client_id: @client.id,
            job_status_value: @job.status || "open",
            job_priority_value: @job.priority || "normal",
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
                    action: "blur->job-title#handleBlur focus->job-title#handleFocus input->job-title#handleInput keydown.enter->job-title#handleEnter",
                    job_title_target: "titleField",
                    placeholder: "Untitled Job"
                  },
                  autofocus: true
                ) { "" }  # Empty for true placeholder behavior

                # Task search (hidden for new jobs)
                div(style: "visibility: hidden;") do
                  render Components::Tasks::SearchComponent.new(job: @job)
                end
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
              # Empty task list for new jobs
              div(id: "tasks-list", class: "tasks-list", data: { flip_target: "container", job_target: "tasksList", turbo_frame: "tasks-frame" }) do
                div(class: "empty-tasks") do
                  p { "Start by giving your job a title above" }
                end
              end
            end

            # Status/Assignment Popover (hidden for new jobs)
            div(
              class: "popover job-popover hidden",
              data: {
                job_target: "popover",
                controller: "job-popover"
              },
              style: "display: none;"
            )

            # Schedule Popover (hidden for new jobs)
            div(
              class: "schedule-popover hidden",
              style: "display: none;"
            )
          end
        end
      end

      private

      def render_toolbar_items(view)
        # Calendar button (disabled for new jobs)
        view.button(
          type: "button",
          class: "btn-icon",
          disabled: true,
          style: "opacity: 0.5;",
          title: "Save the job first to schedule"
        ) do
          svg(
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 19.8242 17.998",
            width: "20",
            height: "18",
            style: "display: block;"
          ) do |s|
            s.path(
              d: "M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258ZM7.83203 7.98828L8.4082 7.98828C8.75 7.98828 8.85742 7.89062 8.85742 7.54883L8.85742 6.97266C8.85742 6.63086 8.75 6.52344 8.4082 6.52344L7.83203 6.52344C7.49023 6.52344 7.37305 6.63086 7.37305 6.97266L7.37305 7.54883C7.37305 7.89062 7.49023 7.98828 7.83203 7.98828ZM11.0742 7.98828L11.6504 7.98828C11.9922 7.98828 12.1094 7.89062 12.1094 7.54883L12.1094 6.97266C12.1094 6.63086 11.9922 6.52344 11.6504 6.52344L11.0742 6.52344C10.7324 6.52344 10.6152 6.63086 10.6152 6.97266L10.6152 7.54883C10.6152 7.89062 10.7324 7.98828 11.0742 7.98828ZM14.3164 7.98828L14.8926 7.98828C15.2344 7.98828 15.3516 7.89062 15.3516 7.54883L15.3516 6.97266C15.3516 6.63086 15.2344 6.52344 14.8926 6.52344L14.3164 6.52344C13.9746 6.52344 13.8672 6.63086 13.8672 6.97266L13.8672 7.54883C13.8672 7.89062 13.9746 7.98828 14.3164 7.98828ZM4.58984 11.1816L5.15625 11.1816C5.50781 11.1816 5.61523 11.084 5.61523 10.7422L5.61523 10.166C5.61523 9.82422 5.50781 9.72656 5.15625 9.72656L4.58984 9.72656C4.23828 9.72656 4.13086 9.82422 4.13086 10.166L4.13086 10.7422C4.13086 11.084 4.23828 11.1816 4.58984 11.1816ZM7.83203 11.1816L8.4082 11.1816C8.75 11.1816 8.85742 11.084 8.85742 10.7422L8.85742 10.166C8.85742 9.82422 8.75 9.72656 8.4082 9.72656L7.83203 9.72656C7.49023 9.72656 7.37305 9.82422 7.37305 10.166L7.37305 10.7422C7.37305 11.084 7.49023 11.1816 7.83203 11.1816ZM11.0742 11.1816L11.6504 11.1816C11.9922 11.1816 12.1094 11.084 12.1094 10.7422L12.1094 10.166C12.1094 9.82422 11.9922 9.72656 11.6504 9.72656L11.0742 9.72656C10.7324 9.72656 10.6152 9.82422 10.6152 10.166L10.6152 10.7422C10.6152 11.084 10.7324 11.1816 11.0742 11.1816ZM14.3164 11.1816L14.8926 11.1816C15.2344 11.1816 15.3516 11.084 15.3516 10.7422L15.3516 10.166C15.3516 9.82422 15.2344 9.72656 14.8926 9.72656L14.3164 9.72656C13.9746 9.72656 13.8672 9.82422 13.8672 10.166L13.8672 10.7422C13.8672 11.084 13.9746 11.1816 14.3164 11.1816ZM4.58984 14.3848L5.15625 14.3848C5.50781 14.3848 5.61523 14.2773 5.61523 13.9355L5.61523 13.3594C5.61523 13.0176 5.50781 12.9199 5.15625 12.9199L4.58984 12.9199C4.23828 12.9199 4.13086 13.0176 4.13086 13.3594L4.13086 13.9355C4.13086 14.2773 4.23828 14.3848 4.58984 14.3848ZM7.83203 14.3848L8.4082 14.3848C8.75 14.3848 8.85742 14.2773 8.85742 13.9355L8.85742 13.3594C8.85742 13.0176 8.75 12.9199 8.4082 12.9199L7.83203 12.9199C7.49023 12.9199 7.37305 13.0176 7.37305 13.3594L7.37305 13.9355C7.37305 14.2773 7.49023 14.3848 7.83203 14.3848ZM11.0742 14.3848L11.6504 14.3848C11.9922 14.3848 12.1094 14.2773 12.1094 13.9355L12.1094 13.3594C12.1094 13.0176 11.9922 12.9199 11.6504 12.9199L11.0742 12.9199C10.7324 12.9199 10.6152 13.0176 10.6152 13.3594L10.6152 13.9355C10.6152 14.2773 10.7324 14.3848 11.0742 14.3848Z",
              fill: "currentColor"
            )
          end
        end

        # Status bubble (disabled for new jobs)
        view.button(
          class: "status-bubble job-status-bubble",
          disabled: true,
          style: "opacity: 0.5;"
        ) do
          render_status_bubble
        end
      end

      def render_status_bubble
        # Default status for new job
        span(class: "bubble-icon status-icon") do
          "🆕"  # New job emoji
        end

        # Unassigned by default
        span(class: "bubble-icon assignee-icon") do
          unassigned_icon
        end
      end
    end
  end
end
