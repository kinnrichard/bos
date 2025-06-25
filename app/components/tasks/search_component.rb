# frozen_string_literal: true

module Components
  module Tasks
    class SearchComponent < Components::Base
      def initialize(job:)
        @job = job
      end

      def view_template
        div(
          class: "task-search-container",
          data: {
            controller: "task-search",
            task_search_job_id_value: @job.id,
            task_search_client_id_value: @job.client_id
          }
        ) do
          div(class: "search-input-wrapper") do
            input(
              type: "text",
              class: "task-search-input",
              placeholder: "Search tasks...",
              data: {
                task_search_target: "input",
                action: "input->task-search#search keydown.escape->task-search#clear"
              }
            )

            button(
              class: "search-clear-button hidden",
              data: {
                task_search_target: "clearButton",
                action: "click->task-search#clear"
              },
              aria_label: "Clear search"
            ) { "✕" }

            div(class: "search-shortcut") { "⌘K" }
          end

          # Search results dropdown
          div(
            class: "search-results hidden",
            data: { task_search_target: "results" }
          ) do
            div(class: "search-results-content", data: { task_search_target: "resultsContent" })
          end
        end
      end
    end
  end
end
