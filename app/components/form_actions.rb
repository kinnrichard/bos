# frozen_string_literal: true

module Components
  class FormActions < Base
    include Phlex::Rails::Helpers::ButtonTag
    def initialize(cancel_path:, submit_text: "Save", cancel_text: "Cancel", additional_actions: nil)
      @cancel_path = cancel_path
      @submit_text = submit_text
      @cancel_text = cancel_text
      @additional_actions = additional_actions
    end

    def view_template
      div(class: "form-actions") do
        link_to(@cancel_text, @cancel_path, class: "btn btn-secondary", style: "margin-right: auto;")

        if @additional_actions
          @additional_actions.call
        end

        button_tag(@submit_text, type: "submit", class: "btn btn-primary")
      end
    end
  end
end
