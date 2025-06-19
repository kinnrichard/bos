# frozen_string_literal: true

module Components
  class FormContainer < Base
    def initialize(title: nil, &content)
      @title = title
      @content = content
    end

    def view_template
      div(class: "form-container") do
        if @title
          h1(class: "form-title") { @title }
        end

        @content.call if @content
      end
    end
  end
end
