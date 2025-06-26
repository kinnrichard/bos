# frozen_string_literal: true

module Components
  module Sidebar
    class SidebarComponent < Components::Base
    def initialize(current_user:, active_section: nil, client: nil, stats: nil)
      @current_user = current_user
      @active_section = active_section
      @client = client
      @stats = stats || fetch_stats
    end

    def view_template
      logo_and_header_section
      div(class: "sidebar-scroll-container") do
        if @client
          client_navigation_sections
        else
          navigation_sections
        end
        bottom_sections
      end
    end

    private

    def logo_and_header_section
      div(class: "sidebar-logo") do
        link_to(root_path) do
          img(src: asset_path("faultless_logo.png"), alt: "Faultless", class: "logo-image")
        end

        # Close button that appears on hover
        button(
          type: "button",
          class: "sidebar-close-btn",
          data: { action: "click->sidebar#hide" },
          title: "Hide sidebar"
        ) do
          span(class: "close-icon") { "×" }
        end

        # if @client
        #  div(class: "sidebar-client-header") do
        #    h3 { @client.name }
        #  end
        # end
      end
    end

    def client_navigation_sections
      div(class: "flex-1") do
        # Client-specific navigation
        div(style: "margin-top: 24px; margin-bottom: 12px;") do
          nav_item(@client.name, href: client_path(@client), icon: client_icon(@client), active: @active_section == :client_info)
        end

        div(style: "margin-top: 24px; margin-bottom: 12px;") do
          nav_item("People", href: client_people_path(@client), icon: "👤", active: @active_section == :people)
          nav_item("Devices", href: client_devices_path(@client), icon: "💻", active: @active_section == :devices)
          nav_item("Jobs", href: client_jobs_path(@client), icon: "💼", active: @active_section == :jobs)
          # nav_item("Schedule", href: schedule_client_path(@client), icon: "🗓️", badge: scheduled_count, active: @active_section == :schedule)
          # nav_item("Invoices", href: client_invoices_path(@client), icon: "🧾", active: @active_section == :invoices)
        end

        # div(style: "margin-top: 24px; margin-bottom: 12px;") do
        #  nav_item("Client Logs", href: logs_client_path(@client), icon: "📜", active: @active_section == :client_logs)
        # end

        # All Jobs section
        # render_jobs_section(header_text: "All Jobs", margin_top: "24px")
      end
    end

    def navigation_sections
      div(class: "flex-1") do
        # Recents
        div(style: "margin-top: 12px;") do
          nav_item("Recents", href: "#", icon: "🕘", active: @active_section == :recents)
        end

        # Jobs section
        render_jobs_section(header_text: "Jobs")
      end
    end

    def bottom_sections
      div(style: "margin-top: auto;") do
        # Admin section (owners only)
        if @current_user&.owner?
          div(class: "sidebar-section", style: "margin-bottom: 12px;") do
            div(class: "sidebar-section-header") { "Admin" }
            nav_item("Automation Dashboard", href: admin_automation_dashboard_path, icon: "🤖", active: @active_section == :automation_dashboard)
          end
        end

        # Settings section
        # div(class: "sidebar-section", style: "margin-bottom: 12px;") do
        #  div(class: "sidebar-section-header") { "Settings" }
        #  # User settings (available to all users)
        #  nav_item("My Settings", href: settings_path, icon: "⚙️", active: @active_section == :user_settings)
        #
        #  # User management (owners only)
        #  if @current_user&.owner?
        #    nav_item("Users", href: users_path, icon: "👥", active: @active_section == :settings)
        #  end
        # end

        # Bottom links
        if @client
          nav_item("#{@client.name }’s Logs", href: logs_client_path(@client), icon: "📜", active: @active_section == :client_logs)
        else
          nav_item("Logs", href: logs_path, icon: "📜", active: @active_section == :logs)
        end
      end
    end

    def render_jobs_section(header_text:, margin_top: nil)
      div_attrs = { class: "sidebar-section" }
      div_attrs[:style] = "margin-top: #{margin_top};" if margin_top

      div(**div_attrs) do
        div(class: "sidebar-section-header") { header_text }
        nav_item("My Jobs", href: "/jobs?filter=mine", icon: "👤", badge: my_jobs_count, active: @active_section == :my_jobs)
        nav_item("Unassigned", href: "/jobs?filter=unassigned", icon: "❓", badge: unassigned_count, active: @active_section == :unassigned)
        nav_item("Assigned to Others", href: "/jobs?filter=others", icon: "👥", badge: others_count, active: @active_section == :others)
        nav_item("Closed", href: "/jobs?filter=closed", icon: "☑️", badge: closed_count, active: @active_section == :closed)
      end
    end

    def my_jobs_count
      @stats[:my_jobs] || 0
    end

    def unassigned_count
      @stats[:unassigned] || 0
    end

    def others_count
      @stats[:others] || 0
    end

    def closed_count
      @stats[:closed] || 0
    end

    def scheduled_count
      @stats[:scheduled] || 0
    end

    def nav_item(text, href:, icon:, badge: nil, active: false)
      classes = "sidebar-item"
      classes += " active" if active
      a(href: href, class: classes) do
        span(class: "sidebar-item-icon") { icon }
        span(class: "sidebar-item-text") { text }
        if badge && badge > 0
          span(class: "sidebar-item-badge") { badge.to_s }
        end
      end
    end

    private

    def fetch_stats
      # Use the service to get stats if not provided
      SidebarStatsService.new(user: @current_user, client: @client).calculate
    end
    end
  end
end
