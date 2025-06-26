# frozen_string_literal: true

class PriorityDropdownComponent < DropdownComponent
  include IconsHelper

  def initialize(current_priority:, priorities:, type: :job, update_url: nil, **options)
    @current_priority = current_priority
    @priorities = priorities
    @type = type
    @update_url = update_url

    super(
      button_content: button_content_html,
      menu_items: build_menu_items,
      button_class: "dropdown-button priority-dropdown-button #{options[:button_class]}".strip,
      **options
    )
  end

  private

  def button_content_html
    emoji = @type == :job ? job_priority_emoji(@current_priority) : priority_emoji(@current_priority)
    label = priority_label(@current_priority)

    if emoji.present?
      safe_join([
        content_tag(:span, emoji, class: "dropdown-emoji"),
        content_tag(:span, label, class: "dropdown-value"),
        content_tag(:span, chevron_down_svg, class: "dropdown-chevron")
      ])
    else
      safe_join([
        content_tag(:span, label, class: "dropdown-value"),
        content_tag(:span, chevron_down_svg, class: "dropdown-chevron")
      ])
    end
  end

  def build_menu_items
    @priorities.map do |priority|
      emoji = @type == :job ? job_priority_emoji(priority) : priority_emoji(priority)
      label = priority_label(priority)

      content = if emoji.present?
        safe_join([
          content_tag(:span, emoji, class: "priority-emoji"),
          content_tag(:span, label)
        ])
      else
        label
      end

      {
        action: true,
        label: content,
        class: priority == @current_priority ? "selected" : nil,
        data: @update_url ? {
          action: "click->job#updatePriority",
          priority: priority,
          url: @update_url
        } : { priority: priority }
      }
    end
  end
end
