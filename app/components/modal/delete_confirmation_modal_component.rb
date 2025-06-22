# frozen_string_literal: true

module Components
  module Modal
    class DeleteConfirmationModalComponent < Components::Base
    def initialize(message: nil, checkbox_label: nil)
      @message = message || "Are you sure you want to delete this item? This action cannot be undone."
      @checkbox_label = checkbox_label || "I understand this action cannot be undone"
    end

    def view_template
      div(
        class: "modal-backdrop hidden",
        data: {
          delete_confirmation_target: "modal"
        }
      ) do
        div(
          class: "modal-overlay",
          data: { action: "click->delete-confirmation#close" }
        )
        div(
          class: "modal-container"
        ) do
          div(class: "modal-content") do
            # Header
            div(class: "modal-header") do
              h2 { "Confirm Deletion" }
              button(
                type: "button",
                class: "modal-close",
                data: { action: "click->delete-confirmation#close" }
              ) { "×" }
            end

            # Body
            div(class: "modal-body") do
              p(data: { delete_confirmation_target: "message" }) { @message }

              div(class: "modal-checkbox-container") do
                input(
                  type: "checkbox",
                  id: "delete-confirmation-checkbox",
                  class: "modal-checkbox",
                  data: {
                    delete_confirmation_target: "checkbox",
                    action: "change->delete-confirmation#toggleDeleteButton"
                  }
                )
                label(for: "delete-confirmation-checkbox", class: "modal-checkbox-label") do
                  @checkbox_label
                end
              end
            end

            # Footer
            div(class: "modal-footer") do
              button(
                type: "button",
                class: "button button--secondary",
                data: { action: "click->delete-confirmation#close" }
              ) { "Cancel" }

              button(
                type: "button",
                class: "button button--danger",
                disabled: true,
                data: {
                  delete_confirmation_target: "deleteButton",
                  action: "click->delete-confirmation#confirmDelete"
                }
              ) { "Delete" }
            end
          end
        end
      end
    end
    end
  end
end
