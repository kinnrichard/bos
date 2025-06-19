# frozen_string_literal: true

module IconHelper
  # Client type icons
  def client_type_icon(client_type)
    case client_type.to_s
    when "business" then "🏢"
    when "residential" then "🏠"
    else "🏠"
    end
  end

  # Contact method icons
  def contact_method_icon(method_type)
    case method_type.to_s
    when "phone" then "📱"
    when "email" then "📧"
    when "address" then "📍"
    else "📞"
    end
  end

  # Priority icons
  def priority_icon(priority)
    case priority.to_s
    when "high" then "🔴"
    when "medium" then "🟡"
    when "low" then "🟢"
    else "⚪"
    end
  end

  # Missing/warning icon
  def warning_icon
    "❗"
  end

  # Check icon
  def check_icon
    "✓"
  end
end
