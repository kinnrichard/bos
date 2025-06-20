# frozen_string_literal: true

module Components
  module Forms
    class FormErrorsComponent < Components::Base
    def initialize(model:)
      @model = model
    end

    def view_template
      return unless @model && @model.errors.any?

      div(class: "form-errors") do
        h3 { "Please correct the following errors:" }
        ul do
          @model.errors.full_messages.each do |message|
            li { message }
          end
        end
      end
    end
    end
  end
end
