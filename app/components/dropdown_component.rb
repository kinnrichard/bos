# frozen_string_literal: true

class DropdownComponent < ViewComponent::Base
  include IconsHelper

  def initialize(button_content: nil, menu_items: [], button_class: "dropdown-button", menu_class: "dropdown-menu hidden", positioning: nil, **options)
    @button_content = button_content
    @menu_items = menu_items
    @button_class = button_class
    @menu_class = menu_class
    @positioning = positioning
    @options = options
  end

  def call
    content_tag :div, class: "dropdown-container", data: dropdown_data_attributes do
      button_tag + menu_tag
    end
  end

  private

  def dropdown_data_attributes
    attrs = { controller: "dropdown" }
    attrs[:dropdown_positioning_value] = @positioning if @positioning
    attrs.merge(@options[:data] || {})
  end

  def button_tag
    button_options = {
      type: "button",
      class: @button_class,
      data: {
        dropdown_target: "button",
        action: "click->dropdown#toggle"
      }
    }

    button_options.merge!(@options.except(:data, :class))

    content_tag :button, button_options do
      if @button_content
        @button_content.is_a?(String) ? @button_content.html_safe : @button_content
      elsif block_given?
        content
      else
        raise ArgumentError, "Button content must be provided either as button_content parameter or as a block"
      end
    end
  end

  def menu_tag
    content_tag :div, class: @menu_class, data: { dropdown_target: "menu" } do
      if @menu_items.any?
        safe_join(@menu_items.map { |item| render_menu_item(item) })
      elsif content?
        content
      end
    end
  end

  def render_menu_item(item)
    case item
    when Hash
      if item[:divider]
        content_tag :div, "", class: "dropdown-divider"
      elsif item[:header]
        content_tag :div, item[:header], class: "dropdown-header"
      elsif item[:action]
        content_tag :button,
                    type: "button",
                    class: "dropdown-item #{item[:class]}".strip,
                    data: item[:data] do
          item[:label] || item[:content]
        end
      elsif item[:link]
        link_to item[:label] || item[:content],
                item[:link],
                class: "dropdown-item #{item[:class]}".strip,
                data: item[:data]
      else
        content_tag :div, item[:content] || item[:label], class: "dropdown-item #{item[:class]}".strip
      end
    when String
      content_tag :div, item, class: "dropdown-item"
    else
      item
    end
  end
end
