# frozen_string_literal: true

module Components
  class Sidebar < Base
    
    def initialize(current_user:, active_section: nil, client: nil)
      @current_user = current_user
      @active_section = active_section
      @client = client
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
        
        if @client
          div(class: "sidebar-client-header") do
            h3 { @client.name }
          end
        end
      end
    end

    def client_navigation_sections
      div(class: "flex-1") do
        # Client-specific navigation
        nav_item("People", href: client_people_path(@client), icon: "👤", active: @active_section == :people)
        nav_item("Devices", href: client_devices_path(@client), icon: "💻", active: @active_section == :devices)
        nav_item("Jobs", href: client_jobs_path(@client), icon: "💼", badge: @client.jobs.count, active: @active_section == :jobs)
        #nav_item("Schedule", href: schedule_client_path(@client), icon: "🗓️", badge: scheduled_count, active: @active_section == :schedule)
        #nav_item("Invoices", href: client_invoices_path(@client), icon: "🧾", active: @active_section == :invoices)
        
        div(style: "margin-top: 24px; margin-bottom: 12px;") do
          nav_item("Client Info", href: client_path(@client), icon: "ℹ️", active: @active_section == :client_info)
          nav_item("Client Logs", href: logs_client_path(@client), icon: "📜", active: @active_section == :client_logs)
        end
        
        # All Cases section
        div(class: "sidebar-section", style: "margin-top: 24px;") do
          div(class: "sidebar-section-header") { "All Jobs" }
          nav_item("My Jobs", href: "/jobs?filter=mine", icon: "👤", badge: my_jobs_count, active: @active_section == :my_jobs)
          nav_item("Unassigned", href: "/jobs?filter=unassigned", icon: "❓", badge: unassigned_count, active: @active_section == :unassigned)
          nav_item("Assigned to Others", href: "/jobs?filter=others", icon: "👥", active: @active_section == :others)
          nav_item("Closed", href: "/jobs?filter=closed", icon: "☑️", active: @active_section == :closed)
        end
      end
    end

    def navigation_sections
      div(class: "flex-1") do
        # Recents
        div(style: "margin-top: 12px;") do
          nav_item("Recents", href: "#", icon: "🕘", active: @active_section == :recents)
        end

        # Jobs section
        div(class: "sidebar-section") do
          div(class: "sidebar-section-header") { "Jobs" }
          nav_item("My Jobs", href: "/jobs?filter=mine", icon: "👤", badge: my_jobs_count, active: @active_section == :my_jobs)
          nav_item("Unassigned", href: "/jobs?filter=unassigned", icon: "❓", badge: unassigned_count, active: @active_section == :unassigned)
          nav_item("Assigned to Others", href: "/jobs?filter=others", icon: "👥", active: @active_section == :others)
          nav_item("Closed", href: "/jobs?filter=closed", icon: "☑️", active: @active_section == :closed)
        end
      end
    end

    def bottom_sections
      div(style: "margin-top: auto;") do
        # Bottom links
        nav_item("Logs", href: "/logs", icon: "📜", active: @active_section == :logs)
        div(style: "margin-bottom: 0;") do
          #nav_item("Settings", href: "/settings", icon: "⚙️", active: @active_section == :settings)
        end
      end
    end

    def my_jobs_count
      Job.joins(:job_assignments).where(job_assignments: { user_id: @current_user.id }).count
    end

    def unassigned_count
      Job.left_joins(:job_assignments).where(job_assignments: { id: nil }).count
    end
    
    def scheduled_count
      return 0 unless @client
      # TODO: Replace with actual count from database
      @client.jobs.where.not(start_on_date: nil).count
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
  end
end