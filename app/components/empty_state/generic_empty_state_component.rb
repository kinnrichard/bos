# frozen_string_literal: true

module Components
  module EmptyState
    class GenericEmptyStateComponent < Components::Base
    def initialize(title:, message: nil, action_text: nil, action_path: nil, icon: nil)
      @title = title
      @message = message
      @action_text = action_text
      @action_path = action_path
      @icon = icon
    end

    def view_template
      div(class: "empty-state") do
        if @icon
          div(class: "empty-state-icon") { @icon }
        end

        h2 { @title }

        if @message
          p { @message }
        end

        if @action_text && @action_path
          link_to(@action_text, @action_path, class: "button button--primary")
        end
      end
    end
    end
  end
end
