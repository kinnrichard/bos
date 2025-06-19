# frozen_string_literal: true

module Components
  class Sidebar < Base
    def initialize(current_user:, active_section: nil)
      @current_user = current_user
      @active_section = active_section
    end

    def view_template
      logo_section
      div(class: "flex-1 flex flex-col") do
        navigation_sections
        bottom_sections
      end
    end

    private

    def logo_section
      div(class: "sidebar-logo") do
        img(src: asset_path("faultless_logo.png"), alt: "Faultless", class: "logo-image")
      end
    end

    def navigation_sections
      div(class: "flex-1") do
        # Recents
        div(style: "margin-top: 12px;") do
          nav_item("Recents", href: "#", icon: "🕘", active: @active_section == :recents)
        end

        # Cases section
        div(class: "sidebar-section") do
          div(class: "sidebar-section-header") { "Cases" }
          nav_item("My Cases", href: "/cases?filter=mine", icon: "👤", badge: my_cases_count, active: @active_section == :my_cases)
          nav_item("Unassigned", href: "/cases?filter=unassigned", icon: "❓", badge: unassigned_count, active: @active_section == :unassigned)
          nav_item("Assigned to Others", href: "/cases?filter=others", icon: "👥", active: @active_section == :others)
          nav_item("Closed", href: "/cases?filter=closed", icon: "☑️", active: @active_section == :closed)
        end
      end
    end

    def bottom_sections
      div(style: "margin-top: auto;") do
        # Bottom links
        nav_item("Logs", href: "/logs", icon: "📜", active: @active_section == :logs)
        div(style: "margin-bottom: 12px;") do
          nav_item("Settings", href: "/settings", icon: "⚙️", active: @active_section == :settings)
        end
      end
    end

    def my_cases_count
      # TODO: Replace with actual count from database
      12
    end

    def unassigned_count
      # TODO: Replace with actual count from database
      5
    end

    def nav_item(text, href:, icon:, badge: nil, active: false)
      classes = "sidebar-item"
      classes += " active" if active
      a(href: href, class: classes) do
        span(class: "sidebar-item-icon") { icon }
        span(class: "sidebar-item-text") { text }
        if badge
          span(class: "sidebar-item-badge") { badge.to_s }
        end
      end
    end
  end
end