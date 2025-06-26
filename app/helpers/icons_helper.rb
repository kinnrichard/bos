module IconsHelper
  # Status lists
  TASK_STATUSES = [ "new_task", "in_progress", "successfully_completed", "cancelled" ]
  JOB_STATUSES = [ "open", "in_progress", "paused", "successfully_completed", "cancelled" ]

  # Priority lists
  PRIORITIES = [ "critical", "high", "normal", "low", "proactive_followup" ]

  # Unassigned icon
  def unassigned_icon
    "❓"
  end
  # SVG Icons
  def note_icon_svg(width: 16, height: 16, css_class: nil)
    svg_attrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 19.8242 17.998",
      width: width,
      height: height,
      class: css_class
    }.compact.map { |k, v| "#{k}=\"#{v}\"" }.join(" ")

    <<~SVG.html_safe
      <svg #{svg_attrs}>
        <path d="M3.06641 17.998L16.4062 17.998C18.4473 17.998 19.4629 16.9824 19.4629 14.9707L19.4629 3.04688C19.4629 1.03516 18.4473 0.0195312 16.4062 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.04688L0 14.9707C0 16.9922 1.02539 17.998 3.06641 17.998ZM2.91992 16.4258C2.05078 16.4258 1.57227 15.9668 1.57227 15.0586L1.57227 5.84961C1.57227 4.95117 2.05078 4.48242 2.91992 4.48242L16.5332 4.48242C17.4023 4.48242 17.8906 4.95117 17.8906 5.84961L17.8906 15.0586C17.8906 15.9668 17.4023 16.4258 16.5332 16.4258Z" fill="currentColor" fill-opacity="0.85"/>
        <path d="M4.61914 8.11523L14.873 8.11523C15.2148 8.11523 15.4785 7.8418 15.4785 7.5C15.4785 7.16797 15.2148 6.91406 14.873 6.91406L4.61914 6.91406C4.25781 6.91406 4.00391 7.16797 4.00391 7.5C4.00391 7.8418 4.25781 8.11523 4.61914 8.11523Z" fill="currentColor" fill-opacity="0.85"/>
        <path d="M4.61914 11.0547L14.873 11.0547C15.2148 11.0547 15.4785 10.8008 15.4785 10.4688C15.4785 10.1172 15.2148 9.85352 14.873 9.85352L4.61914 9.85352C4.25781 9.85352 4.00391 10.1172 4.00391 10.4688C4.00391 10.8008 4.25781 11.0547 4.61914 11.0547Z" fill="currentColor" fill-opacity="0.85"/>
        <path d="M4.61914 13.9941L11.1328 13.9941C11.4746 13.9941 11.7383 13.7402 11.7383 13.4082C11.7383 13.0664 11.4746 12.793 11.1328 12.793L4.61914 12.793C4.25781 12.793 4.00391 13.0664 4.00391 13.4082C4.00391 13.7402 4.25781 13.9941 4.61914 13.9941Z" fill="currentColor" fill-opacity="0.85"/>
      </svg>
    SVG
  end

  def info_icon_svg(width: 16, height: 16, css_class: nil)
    svg_attrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 18 18",
      width: width,
      height: height,
      class: css_class
    }.compact.map { |k, v| "#{k}=\"#{v}\"" }.join(" ")

    <<~SVG.html_safe
      <svg #{svg_attrs}>
        <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-opacity="0.85"/>
        <circle cx="9" cy="4.5" r="0.75" fill="currentColor" fill-opacity="0.85"/>
        <rect x="8.25" y="7" width="1.5" height="7" rx="0.75" fill="currentColor" fill-opacity="0.85"/>
      </svg>
    SVG
  end

  def chevron_down_svg(width: 12, height: 8, css_class: nil)
    svg_attrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 12 8",
      width: width,
      height: height,
      class: css_class
    }.compact.map { |k, v| "#{k}=\"#{v}\"" }.join(" ")

    <<~SVG.html_safe
      <svg #{svg_attrs}>
        <path d="M 1 2 L 6 7 L 11 2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    SVG
  end

  def chevron_right_svg(width: 8, height: 12, css_class: nil)
    svg_attrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 8 12",
      width: width,
      height: height,
      class: css_class
    }.compact.map { |k, v| "#{k}=\"#{v}\"" }.join(" ")

    <<~SVG.html_safe
      <svg #{svg_attrs}>
        <path d="M 2 1 L 7 6 L 2 11" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    SVG
  end

  def popover_arrow_svg(css_class: nil)
    <<~SVG.html_safe
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 6" width="12" height="6" class="#{css_class}">
        <path d="M 0 6 L 6 0 L 12 6 Z" fill="white" stroke="#e5e7eb" stroke-width="1"/>
      </svg>
    SVG
  end

  def filter_icon_svg(width: 16, height: 16, css_class: nil)
    svg_attrs = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 16 16",
      width: width,
      height: height,
      class: css_class
    }.compact.map { |k, v| "#{k}=\"#{v}\"" }.join(" ")

    <<~SVG.html_safe
      <svg #{svg_attrs}>
        <path d="M 2 3 L 14 3 L 10 8 L 10 13 L 6 13 L 6 8 Z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      </svg>
    SVG
  end

  # Task Status Emojis
  def task_status_emoji(status)
    case status.to_s
    when "new_task" then "⚫"
    when "in_progress" then "🟢"
    when "paused" then "⏸️"
    when "successfully_completed" then "☑️"
    when "cancelled" then "❌"
    else "❓"
    end
  end

  def task_status_label(status)
    case status.to_s
    when "new_task" then "New"
    when "in_progress" then "In Progress"
    when "paused" then "Paused"
    when "successfully_completed" then "Completed"
    when "cancelled" then "Cancelled"
    else status.to_s.humanize
    end
  end

  # Job Status Emojis
  def job_status_emoji(status)
    case status.to_s
    when "open" then "🔵"
    when "in_progress" then "🟢"
    when "paused" then "⏸️"
    when "waiting_for_customer" then "⏳"
    when "waiting_for_scheduled_appointment" then "📅"
    when "successfully_completed" then "✅"
    when "cancelled" then "❌"
    else "❓"
    end
  end

  def job_status_label(status)
    case status.to_s
    when "open" then "Open"
    when "in_progress" then "In Progress"
    when "paused" then "Paused"
    when "waiting_for_customer" then "Waiting for Customer"
    when "waiting_for_scheduled_appointment" then "Scheduled"
    when "successfully_completed" then "Completed"
    when "cancelled" then "Cancelled"
    else status.to_s.humanize
    end
  end

  # Priority Emojis
  def job_priority_emoji(priority)
    case priority.to_s
    when "critical" then "🔥"
    when "high" then "❗"
    when "normal" then ""
    when "low" then "➖"
    when "proactive_followup" then "💬"
    else ""
    end
  end

  def priority_emoji(priority)
    case priority.to_s
    when "high" then "🔴"
    when "medium" then "🟡"
    when "low" then "🟢"
    else ""
    end
  end

  def priority_label(priority)
    case priority.to_s
    when "critical" then "Critical"
    when "high" then "High"
    when "normal", "medium" then "Normal"
    when "low" then "Low"
    when "proactive_followup" then "Proactive Follow-up"
    else priority.to_s.humanize
    end
  end

  # Client Type Icons
  def client_type_emoji(type)
    case type.to_s
    when "business" then "🏢"
    when "residential" then "🏠"
    else "❓"
    end
  end

  # Contact Method Icons
  def contact_method_emoji(method)
    case method.to_s
    when "phone", "primary_phone" then "📱"
    when "email" then "📧"
    when "address" then "📍"
    else "📞"
    end
  end

  # Schedule Type Icons
  def schedule_type_emoji(type)
    case type.to_s
    when "scheduled_appointment" then "📅"
    when "follow_up" then "🔄"
    when "due_date" then "⏰"
    when "start_date" then "▶️"
    else "📅"
    end
  end

  # Utility Icons
  def timer_emoji
    "⏱️"
  end

  def trash_emoji
    "🗑️"
  end

  def warning_emoji
    "❗"
  end

  def check_emoji
    "✓"
  end

  # Helper methods
  def render_emoji(emoji, css_class: nil, title: nil)
    content_tag(:span, emoji, class: css_class, title: title)
  end

  def status_with_emoji(status, type: :task)
    emoji = type == :job ? job_status_emoji(status) : task_status_emoji(status)
    label = type == :job ? job_status_label(status) : task_status_label(status)
    "#{emoji} #{label}"
  end

  def priority_with_emoji(priority, type: :job)
    emoji = type == :job ? job_priority_emoji(priority) : priority_emoji(priority)
    label = priority_label(priority)
    emoji.present? ? "#{emoji} #{label}" : label
  end
end
