# frozen_string_literal: true

module Components
  module Ui
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
        html_options: {}
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
      end

      def view_template(&block)
        if @href
          a(
            href: @href,
            class: button_classes,
            data: @data,
            **@html_options
          ) do
            render_button_content(&block)
          end
        else
          button(
            type: @type,
            class: button_classes,
            disabled: @disabled || @loading,
            data: @data,
            **@html_options
          ) do
            render_button_content(&block)
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

      def render_button_content(&block)
        if @icon && @loading
          span(class: "button__spinner") { "⏳" }
        elsif @icon
          span(class: "button__icon") { @icon }
        end
        
        # Call the block if provided
        if block
          span(class: "button__text", &block)
        end
      end
    end
  end
end