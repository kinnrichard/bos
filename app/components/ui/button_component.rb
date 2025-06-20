# frozen_string_literal: true

module Components
  module UI
    class ButtonComponent < Components::Base
      def initialize(
        variant: :primary,  # :primary, :secondary, :danger, :ghost
        size: :medium,      # :small, :medium, :large
        type: :button,      # :button, :submit, :reset
        disabled: false,
        full_width: false,
        loading: false,
        icon: nil,
        href: nil,          # Makes it a link styled as button
        data: {},
        html_options: {},
        &content
      )
        @variant = variant
        @size = size
        @type = type
        @disabled = disabled
        @full_width = full_width
        @loading = loading
        @icon = icon
        @href = href
        @data = data
        @html_options = html_options
        @content = content
      end

      def view_template
        if @href
          a(
            href: @href,
            class: button_classes,
            data: @data,
            **@html_options
          ) do
            render_button_content
          end
        else
          button(
            type: @type,
            class: button_classes,
            disabled: @disabled || @loading,
            data: @data,
            **@html_options
          ) do
            render_button_content
          end
        end
      end

      private

      def button_classes
        classes = [
          "button",
          "button--#{@variant}",
          "button--#{@size}",
          ("button--full-width" if @full_width),
          ("button--loading" if @loading),
          ("button--disabled" if @disabled),
          ("button--with-icon" if @icon)
        ].compact.join(" ")
        
        # Add any custom classes from html_options
        if @html_options[:class]
          "#{classes} #{@html_options[:class]}"
        else
          classes
        end
      end

      def render_button_content
        if @icon && @loading
          span(class: "button__spinner") { "⏳" } # Could be replaced with spinner component
        elsif @icon
          span(class: "button__icon") { @icon }
        end
        
        if @content
          span(class: "button__text", &@content)
        end
      end
    end
  end
end