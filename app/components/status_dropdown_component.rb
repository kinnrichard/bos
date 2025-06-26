# frozen_string_literal: true

class StatusDropdownComponent < DropdownComponent
  include IconsHelper

  def initialize(current_status:, statuses:, type: :task, update_url: nil, **options)
    @current_status = current_status
    @statuses = statuses
    @type = type
    @update_url = update_url

    super(
      button_content: button_content_html,
      menu_items: build_menu_items,
      button_class: "dropdown-button status-dropdown-button #{options[:button_class]}".strip,
      **options
    )
  end

  private

  def button_content_html
    emoji = @type == :job ? job_status_emoji(@current_status) : task_status_emoji(@current_status)
    label = @type == :job ? job_status_label(@current_status) : task_status_label(@current_status)

    safe_join([
      content_tag(:span, emoji, class: "dropdown-emoji"),
      content_tag(:span, label, class: "dropdown-value"),
      content_tag(:span, chevron_down_svg, class: "dropdown-chevron")
    ])
  end

  def build_menu_items
    @statuses.map do |status|
      emoji = @type == :job ? job_status_emoji(status) : task_status_emoji(status)
      label = @type == :job ? job_status_label(status) : task_status_label(status)

      {
        action: true,
        label: safe_join([
          content_tag(:span, emoji, class: "status-emoji"),
          content_tag(:span, label)
        ]),
        class: status == @current_status ? "selected" : nil,
        data: @update_url ? {
          action: "click->#{@type}#updateStatus",
          status: status,
          url: @update_url
        } : { status: status }
      }
    end
  end
end
