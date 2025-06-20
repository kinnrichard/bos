# frozen_string_literal: true

module Components
  module InfoGrid
    class InfoGridComponent < Components::Base
    def initialize(items:)
      @items = items
    end

    def view_template
      div(class: "info-grid") do
        @items.each do |item|
          div(class: "info-item") do
            div(class: "info-label") { item[:label] }
            div(class: "info-value") do
              if item[:content].is_a?(Proc)
                item[:content].call
              else
                plain item[:content]
              end
            end
          end
        end
      end
    end
    end
  end
end
