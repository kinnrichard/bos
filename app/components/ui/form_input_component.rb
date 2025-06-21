# frozen_string_literal: true

module Components
  module Ui
    class FormInputComponent < Components::Base
      include Phlex::Rails::Helpers::FieldsFor
      
      def initialize(
        form: nil,
        attribute: nil,
        type: :text,        # :text, :email, :password, :number, :tel, :url, :search, :textarea
        label: nil,
        placeholder: nil,
        required: false,
        disabled: false,
        readonly: false,
        error: nil,
        hint: nil,
        value: nil,
        size: :medium,      # :small, :medium, :large
        full_width: true,
        icon: nil,
        data: {},
        input_html: {},
        wrapper_html: {}
      )
        @form = form
        @attribute = attribute
        @type = type
        @label = label || attribute&.to_s&.humanize
        @placeholder = placeholder
        @required = required
        @disabled = disabled
        @readonly = readonly
        @error = error
        @hint = hint
        @value = value
        @size = size
        @full_width = full_width
        @icon = icon
        @data = data
        @input_html = input_html
        @wrapper_html = wrapper_html
      end

      def view_template
        div(class: wrapper_classes, **@wrapper_html) do
          # Label
          if @label
            label(
              class: "form-input__label",
              for: input_id
            ) do
              span { @label }
              if @required
                span(class: "form-input__required") { " *" }
              end
            end
          end
          
          # Input wrapper (for icon support)
          div(class: "form-input__wrapper") do
            if @icon
              span(class: "form-input__icon") { @icon }
            end
            
            # Input field
            if @type == :textarea
              render_textarea
            else
              render_input
            end
          end
          
          # Error message
          if @error
            div(class: "form-input__error") { @error }
          end
          
          # Hint text
          if @hint
            div(class: "form-input__hint") { @hint }
          end
        end
      end

      private

      def wrapper_classes
        classes = [
          "form-input",
          "form-input--#{@size}",
          ("form-input--full-width" if @full_width),
          ("form-input--with-icon" if @icon),
          ("form-input--error" if @error),
          ("form-input--disabled" if @disabled)
        ].compact.join(" ")
        
        if @wrapper_html[:class]
          "#{classes} #{@wrapper_html[:class]}"
        else
          classes
        end
      end

      def input_classes
        classes = [
          "form-input__field",
          @input_html[:class]
        ].compact.join(" ")
      end

      def input_id
        if @form && @attribute
          "#{@form.object_name}_#{@attribute}"
        else
          @input_html[:id] || "input_#{object_id}"
        end
      end

      def input_name
        if @form && @attribute
          "#{@form.object_name}[#{@attribute}]"
        else
          @input_html[:name]
        end
      end

      def input_value
        if @form && @attribute
          @form.object.send(@attribute)
        else
          @value
        end
      end

      def render_input
        if @form && @attribute
          case @type
          when :email
            @form.email_field(@attribute, input_options)
          when :password
            @form.password_field(@attribute, input_options)
          when :number
            @form.number_field(@attribute, input_options)
          when :tel
            @form.telephone_field(@attribute, input_options)
          when :url
            @form.url_field(@attribute, input_options)
          when :search
            @form.search_field(@attribute, input_options)
          else
            @form.text_field(@attribute, input_options)
          end
        else
          input(input_attributes)
        end
      end

      def render_textarea
        if @form && @attribute
          @form.text_area(@attribute, input_options.merge(rows: 4))
        else
          textarea(input_attributes.merge(rows: 4)) { input_value }
        end
      end

      def input_options
        @input_html.merge(
          class: input_classes,
          placeholder: @placeholder,
          required: @required,
          disabled: @disabled,
          readonly: @readonly,
          data: @data
        )
      end

      def input_attributes
        {
          type: @type,
          id: input_id,
          name: input_name,
          value: input_value,
          class: input_classes,
          placeholder: @placeholder,
          required: @required,
          disabled: @disabled,
          readonly: @readonly,
          data: @data
        }.merge(@input_html)
      end
    end
  end
end