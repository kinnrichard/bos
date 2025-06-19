# frozen_string_literal: true

module JobStatusHelper
  def status_emoji(status)
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

  def status_text(status)
    status.to_s.gsub("_", " ").capitalize
  end

  def status_with_emoji(status)
    "#{status_emoji(status)} #{status_text(status)}"
  end
end
