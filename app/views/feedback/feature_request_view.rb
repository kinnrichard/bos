module Views
  module Feedback
    class FeatureRequestView < Views::Base
      def initialize(current_user:)
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Request a Feature - Faultless",
          current_user: @current_user,
          hide_sidebar: true
        ) do
          main_content
        end
      end

      private

      def main_content
        div(class: "modal-backdrop", data: { controller: "feature-request" }) do
          div(class: "modal-overlay", data: {
            feature_request_target: "overlay",
            action: "click->feature-request#close"
          })

          div(class: "modal-container modal-container--large") do
            div(class: "modal-content") do
              # Header
              div(class: "modal-header") do
                h2 { "Request a Feature" }
                button(
                  type: "button",
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

                div(class: "modal-body") do
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
                    h3(class: "form-screen__title") { "Let's start with the basics" }

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :what_to_improve,
                      label: "What would you like to add or improve?",
                      placeholder: "Brief description of your request",
                      required: true,
                      data: { feature_request_target: "input" }
                    )

                    div(class: "form-group") do
                      label(class: "form-input__label") { "How important is this to you?" }
                      div(class: "radio-group") do
                        label(class: "radio-label") do
                          f.radio_button :importance_level, "Nice to have",
                            required: true,
                            class: "radio-input"
                          span(class: "radio-label__text") { "Nice to have" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :importance_level, "Would really help my workflow",
                            class: "radio-input"
                          span(class: "radio-label__text") { "Would really help my workflow" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :importance_level, "Critical - blocking my work",
                            class: "radio-input"
                          span(class: "radio-label__text") { "Critical - blocking my work" }
                        end
                      end
                    end
                  end

                  # Screen 2: Problem Definition
                  div(
                    class: "form-screen",
                    data: { feature_request_target: "screen", screen: "2" }
                  ) do
                    h3(class: "form-screen__title") { "Help us understand the problem" }

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :problem_description,
                      type: :textarea,
                      label: "What problem are you trying to solve?",
                      placeholder: "Describe the challenge or issue you're facing",
                      data: { feature_request_target: "input" }
                    )

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :current_handling,
                      type: :textarea,
                      label: "How do you handle this today?",
                      placeholder: "Describe your current workaround or process",
                      data: { feature_request_target: "input" }
                    )

                    div(class: "form-group") do
                      label(class: "form-input__label") { "How often do you face this?" }
                      div(class: "radio-group") do
                        label(class: "radio-label") do
                          f.radio_button :frequency, "Daily", class: "radio-input"
                          span(class: "radio-label__text") { "Daily" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :frequency, "Weekly", class: "radio-input"
                          span(class: "radio-label__text") { "Weekly" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :frequency, "Monthly", class: "radio-input"
                          span(class: "radio-label__text") { "Monthly" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :frequency, "Occasionally", class: "radio-input"
                          span(class: "radio-label__text") { "Occasionally" }
                        end
                      end
                    end
                  end

                  # Screen 3: Solution Exploration
                  div(
                    class: "form-screen",
                    data: { feature_request_target: "screen", screen: "3" }
                  ) do
                    h3(class: "form-screen__title") { "Describe your ideal solution" }

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :ideal_solution,
                      type: :textarea,
                      label: "Describe your ideal solution",
                      placeholder: "How would this feature work in your ideal scenario?",
                      data: { feature_request_target: "input" }
                    )

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :examples,
                      type: :textarea,
                      label: "Have you seen this done well elsewhere? (optional)",
                      placeholder: "Share any examples or references that inspire your request",
                      required: false
                    )
                  end

                  # Screen 4: Context
                  div(
                    class: "form-screen",
                    data: { feature_request_target: "screen", screen: "4" }
                  ) do
                    h3(class: "form-screen__title") { "Help us understand your goals" }

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :main_goal,
                      type: :textarea,
                      label: "What's your main goal with this feature?",
                      hint: "Examples: Save time, reduce errors, automate tasks, better insights",
                      placeholder: "What are you trying to achieve?",
                      data: { feature_request_target: "input" }
                    )

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :expected_outcome,
                      type: :textarea,
                      label: "Expected outcome after implementation?",
                      hint: "What specific improvement do you expect?",
                      placeholder: "How will things be better?",
                      data: { feature_request_target: "input" }
                    )
                  end

                  # Screen 5: Priority & Impact
                  div(
                    class: "form-screen",
                    data: { feature_request_target: "screen", screen: "5" }
                  ) do
                    h3(class: "form-screen__title") { "Almost done! Let's understand the impact" }

                    div(class: "form-group") do
                      label(class: "form-input__label") { "Business impact if implemented?" }
                      div(class: "radio-group") do
                        label(class: "radio-label") do
                          f.radio_button :business_impact, "Minor efficiency gain", class: "radio-input"
                          span(class: "radio-label__text") { "Minor efficiency gain" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :business_impact, "Significant time savings", class: "radio-input"
                          span(class: "radio-label__text") { "Significant time savings" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :business_impact, "Unlocks new capabilities", class: "radio-input"
                          span(class: "radio-label__text") { "Unlocks new capabilities" }
                        end
                        label(class: "radio-label") do
                          f.radio_button :business_impact, "Revenue/cost impact", class: "radio-input"
                          span(class: "radio-label__text") { "Revenue/cost impact" }
                        end
                      end
                    end

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :success_metrics,
                      type: :textarea,
                      label: "How can we measure success?",
                      hint: "What metrics would show this is working?",
                      placeholder: "e.g., Time saved per task, error reduction, user satisfaction",
                      data: { feature_request_target: "input" }
                    )

                    render Components::Ui::FormInputComponent.new(
                      form: f,
                      attribute: :additional_notes,
                      type: :textarea,
                      label: "Anything else we should know? (optional)",
                      placeholder: "Any other context or considerations",
                      required: false
                    )
                  end
                end

                # Footer with navigation buttons
                div(class: "modal-footer") do
                  render Components::Ui::ButtonComponent.new(
                    variant: :secondary,
                    type: :button,
                    data: {
                      action: "click->feature-request#previousScreen",
                      feature_request_target: "backButton"
                    },
                    html_options: { style: "display: none;" }
                  ) { "Back" }

                  render Components::Ui::ButtonComponent.new(
                    variant: :ghost,
                    type: :button,
                    data: { action: "click->feature-request#close" }
                  ) { "Cancel" }

                  render Components::Ui::ButtonComponent.new(
                    variant: :primary,
                    type: :button,
                    data: {
                      action: "click->feature-request#nextScreen",
                      feature_request_target: "nextButton"
                    }
                  ) { "Next" }

                  render Components::Ui::ButtonComponent.new(
                    variant: :primary,
                    type: :submit,
                    data: { feature_request_target: "submitButton" },
                    html_options: { style: "display: none;" }
                  ) { "Submit Feature Request" }
                end
              end
            end
          end
        end
      end
    end
  end
end
