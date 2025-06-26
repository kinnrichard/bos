module Views
  module Feedback
    class FeatureRequestView < Views::Base
      def page_title
        "Request a Feature"
      end

      def main_content
        div(class: "feedback-container", data: { controller: "feature-request" }) do
          div(class: "modal-overlay active", data: { feature_request_target: "overlay" })

          div(class: "modal active") do
            div(class: "modal-header") do
              h2 { "Request a Feature" }
              button(
                class: "modal-close",
                data: { action: "click->feature-request#close" }
              ) { "×" }
            end

            form_with(
              url: feedback_path,
              method: :post,
              class: "feature-request-form",
              data: {
                feature_request_target: "form",
                action: "submit->feature-request#handleSubmit"
              }
            ) do |f|
              input(type: "hidden", name: "type", value: "feature")

              # Progress indicator
              div(class: "progress-indicator") do
                5.times do |i|
                  div(
                    class: "progress-step #{i == 0 ? 'active' : ''}",
                    data: { step: i + 1 }
                  ) { i + 1 }
                end
              end

              # Screen 1: Initial Request
              div(
                class: "form-screen active",
                data: { feature_request_target: "screen", screen: "1" }
              ) do
                h3 { "Let's start with the basics" }

                div(class: "form-group") do
                  label(for: "what_to_improve") { "What would you like to add or improve?" }
                  f.text_field :what_to_improve,
                    required: true,
                    placeholder: "Brief description of your request",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end

                div(class: "form-group") do
                  label { "How important is this to you?" }
                  div(class: "radio-group") do
                    label(class: "radio-label") do
                      f.radio_button :importance_level, "Nice to have", required: true
                      span { "Nice to have" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :importance_level, "Would really help my workflow"
                      span { "Would really help my workflow" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :importance_level, "Critical - blocking my work"
                      span { "Critical - blocking my work" }
                    end
                  end
                end
              end

              # Screen 2: Problem Definition
              div(
                class: "form-screen",
                data: { feature_request_target: "screen", screen: "2" }
              ) do
                h3 { "Help us understand the problem" }

                div(class: "form-group") do
                  label(for: "problem_description") { "What problem are you trying to solve?" }
                  f.text_area :problem_description,
                    rows: 3,
                    placeholder: "Describe the challenge or issue you're facing",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end

                div(class: "form-group") do
                  label(for: "current_handling") { "How do you handle this today?" }
                  f.text_area :current_handling,
                    rows: 3,
                    placeholder: "Describe your current workaround or process",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end

                div(class: "form-group") do
                  label { "How often do you face this?" }
                  div(class: "radio-group") do
                    label(class: "radio-label") do
                      f.radio_button :frequency, "Daily"
                      span { "Daily" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :frequency, "Weekly"
                      span { "Weekly" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :frequency, "Monthly"
                      span { "Monthly" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :frequency, "Occasionally"
                      span { "Occasionally" }
                    end
                  end
                end
              end

              # Screen 3: Solution Exploration
              div(
                class: "form-screen",
                data: { feature_request_target: "screen", screen: "3" }
              ) do
                h3 { "Describe your ideal solution" }

                div(class: "form-group") do
                  label(for: "ideal_solution") { "Describe your ideal solution" }
                  f.text_area :ideal_solution,
                    rows: 4,
                    placeholder: "How would this feature work in your ideal scenario?",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end

                div(class: "form-group") do
                  label(for: "examples") { "Have you seen this done well elsewhere? (optional)" }
                  f.text_area :examples,
                    rows: 3,
                    placeholder: "Share any examples or references that inspire your request",
                    class: "form-control"
                end
              end

              # Screen 4: Context
              div(
                class: "form-screen",
                data: { feature_request_target: "screen", screen: "4" }
              ) do
                h3 { "Help us understand your goals" }

                div(class: "form-group") do
                  label(for: "main_goal") { "What's your main goal with this feature?" }
                  small(class: "form-help") { "Examples: Save time, reduce errors, automate tasks, better insights" }
                  f.text_area :main_goal,
                    rows: 3,
                    placeholder: "What are you trying to achieve?",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end

                div(class: "form-group") do
                  label(for: "expected_outcome") { "Expected outcome after implementation?" }
                  small(class: "form-help") { "What specific improvement do you expect?" }
                  f.text_area :expected_outcome,
                    rows: 3,
                    placeholder: "How will things be better?",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end
              end

              # Screen 5: Priority & Impact
              div(
                class: "form-screen",
                data: { feature_request_target: "screen", screen: "5" }
              ) do
                h3 { "Almost done! Let's understand the impact" }

                div(class: "form-group") do
                  label { "Business impact if implemented?" }
                  div(class: "radio-group") do
                    label(class: "radio-label") do
                      f.radio_button :business_impact, "Minor efficiency gain"
                      span { "Minor efficiency gain" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :business_impact, "Significant time savings"
                      span { "Significant time savings" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :business_impact, "Unlocks new capabilities"
                      span { "Unlocks new capabilities" }
                    end
                    label(class: "radio-label") do
                      f.radio_button :business_impact, "Revenue/cost impact"
                      span { "Revenue/cost impact" }
                    end
                  end
                end

                div(class: "form-group") do
                  label(for: "success_metrics") { "How can we measure success?" }
                  small(class: "form-help") { "What metrics would show this is working?" }
                  f.text_area :success_metrics,
                    rows: 3,
                    placeholder: "e.g., Time saved per task, error reduction, user satisfaction",
                    class: "form-control",
                    data: { feature_request_target: "input" }
                end

                div(class: "form-group") do
                  label(for: "additional_notes") { "Anything else we should know? (optional)" }
                  f.text_area :additional_notes,
                    rows: 3,
                    placeholder: "Any other context or considerations",
                    class: "form-control"
                end
              end

              # Navigation buttons
              div(class: "form-navigation") do
                button(
                  type: "button",
                  class: "button button--secondary",
                  data: {
                    action: "click->feature-request#previousScreen",
                    feature_request_target: "backButton"
                  },
                  style: "display: none;"
                ) { "Back" }

                button(
                  type: "button",
                  class: "button button--primary",
                  data: {
                    action: "click->feature-request#nextScreen",
                    feature_request_target: "nextButton"
                  }
                ) { "Next" }

                button(
                  type: "submit",
                  class: "button button--primary",
                  data: { feature_request_target: "submitButton" },
                  style: "display: none;"
                ) { "Submit Feature Request" }

                button(
                  type: "button",
                  class: "button button--ghost",
                  data: { action: "click->feature-request#close" }
                ) { "Cancel" }
              end
            end
          end
        end
      end
    end
  end
end
