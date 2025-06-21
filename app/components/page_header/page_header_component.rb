# frozen_string_literal: true

module Components
  module PageHeader
    class PageHeaderComponent < Components::Base
    def initialize(title:, action_text: nil, action_path: nil, action_class: "btn btn-primary", &additional_content)
      @title = title
      @action_text = action_text
      @action_path = action_path
      @action_class = action_class
      @additional_content = additional_content
    end

    def view_template
      div(class: "page-header") do
        h1 { @title }

        if @action_text && @action_path
          render Components::Ui::ButtonComponent.new(
            href: @action_path,
            variant: :primary
          ) { @action_text }
        end

        if @additional_content
          @additional_content.call
        end
      end
    end
    end
  end
end
