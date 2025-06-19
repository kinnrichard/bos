# frozen_string_literal: true

module Components
  class Sidebar < Base
    include Phlex::Rails::Helpers::Routes
    
    def initialize(current_user:, active_section: nil, client: nil)
      @current_user = current_user
      @active_section = active_section
      @client = client
    end

    def view_template
      logo_section
      div(class: "flex-1 flex flex-col") do
        if @client
          client_navigation_sections
        else
          navigation_sections
        end
        bottom_sections
      end
    end

    private

    def logo_section
      div(class: "sidebar-logo") do
        img(src: asset_path("faultless_logo.png"), alt: "Faultless", class: "logo-image")
      end
    end

    def client_navigation_sections
      div(class: "flex-1") do
        # Client name header
        div(class: "sidebar-client-header") do
          h3 { @client.name }
        end
        
        # Client-specific navigation
        nav_item("People", href: client_people_path(@client), icon: "👤", active: @active_section == :people)
        nav_item("Devices", href: client_devices_path(@client), icon: "💻", active: @active_section == :devices)
        nav_item("Cases", href: client_cases_path(@client), icon: "💼", badge: @client.cases.count, active: @active_section == :cases)
        nav_item("Schedule", href: client_schedule_path(@client), icon: "🗓️", badge: scheduled_count, active: @active_section == :schedule)
        nav_item("Invoices", href: client_invoices_path(@client), icon: "🧾", active: @active_section == :invoices)
        
        div(style: "margin-top: 24px; margin-bottom: 12px;") do
          nav_item("Client Info", href: client_path(@client), icon: "ℹ️", active: @active_section == :client_info)
          nav_item("Client Logs", href: client_logs_path(@client), icon: "📜", active: @active_section == :client_logs)
        end
        
        # All Cases section
        div(class: "sidebar-section", style: "margin-top: 24px;") do
          div(class: "sidebar-section-header") { "All Cases" }
          nav_item("My Cases", href: "/cases?filter=mine", icon: "👤", badge: my_cases_count, active: @active_section == :my_cases)
          nav_item("Unassigned", href: "/cases?filter=unassigned", icon: "❓", badge: unassigned_count, active: @active_section == :unassigned)
          nav_item("Assigned to Others", href: "/cases?filter=others", icon: "👥", active: @active_section == :others)
          nav_item("Closed", href: "/cases?filter=closed", icon: "☑️", active: @active_section == :closed)
        end
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
    
    def scheduled_count
      return 0 unless @client
      # TODO: Replace with actual count from database
      @client.cases.where.not(start_on_date: nil).count
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