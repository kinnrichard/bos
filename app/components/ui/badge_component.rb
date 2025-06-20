# frozen_string_literal: true

module Components
  module UI
    class BadgeComponent < Components::Base
      def initialize(
        text: nil,
        icon: nil,
        variant: :default,  # :default, :success, :warning, :danger, :info, :purple
        size: :medium,      # :small, :medium, :large
        rounded: true,
        clickable: false,
        data: {},
        html_options: {},
        &content
      )
        @text = text
        @icon = icon
        @variant = variant
        @size = size
        @rounded = rounded
        @clickable = clickable
        @data = data
        @html_options = html_options
        @content = content
      end

      def view_template
        element = @clickable ? :button : :span
        
        send(element, 
          class: badge_classes,
          data: @data,
          **@html_options
        ) do
          if @icon
            span(class: "badge__icon") { @icon }
          end
          
          if @text || @content
            span(class: "badge__text") do
              @content ? @content.call : @text
            end
          end
        end
      end

      private

      def badge_classes
        classes = [
          "badge",
          "badge--#{@variant}",
          "badge--#{@size}",
          ("badge--rounded" if @rounded),
          ("badge--clickable" if @clickable),
          @html_options[:class]
        ].compact.join(" ")
      end
    end
  end
end