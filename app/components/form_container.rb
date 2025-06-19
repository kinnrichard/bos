# frozen_string_literal: true

module Components
  class FormContainer < Base
    def initialize(title: nil)
      @title = title
    end

    def view_template(&block)
      div(class: "form-container") do
        if @title
          h1(class: "form-title") { @title }
        end

        yield if block_given?
      end
    end
  end
end
