module Devices
  class EditView < ApplicationView
    def initialize(client:, device:, people:)
      @client = client
      @device = device
      @people = people
    end

    def template
      render Layout.new do
        render Sidebar.new(active_section: :devices, client: @client)
        
        div(class: "main-content") do
          div(class: "form-container") do
            h1(class: "form-title") { "Edit Device" }
            
            form_with(model: [@client, @device], class: "device-form") do |f|
              if @device.errors.any?
                div(class: "error-messages") do
                  h3 { "Please correct the following errors:" }
                  ul do
                    @device.errors.full_messages.each do |message|
                      li { message }
                    end
                  end
                end
              end
              
              div(class: "form-group") do
                f.label(:name, "Device Name", class: "form-label")
                f.text_field(:name, class: "form-input", placeholder: "e.g., MacBook Pro, iPhone 15, Dell Desktop")
              end
              
              div(class: "form-group") do
                f.label(:person_id, "Owner (Optional)", class: "form-label")
                f.select(:person_id, 
                  options_for_select([["No owner", ""]] + @people.map { |p| [p.name, p.id] }, @device.person_id),
                  {},
                  class: "form-input"
                )
              end
              
              div(class: "form-group") do
                f.label(:location, "Location (Optional)", class: "form-label")
                f.text_field(:location, class: "form-input", placeholder: "e.g., Main office, Home, Reception desk")
              end
              
              div(class: "form-group") do
                f.label(:notes, "Notes (Optional)", class: "form-label")
                f.text_area(:notes, class: "form-input", rows: 4, placeholder: "Any additional information about this device...")
              end
              
              div(class: "form-actions") do
                f.submit("Save Changes", class: "btn btn-primary", style: "margin-left: auto;")
                link_to("Cancel", client_device_path(@client, @device), class: "btn btn-secondary", style: "margin-right: auto;")
              end
              
              if current_user.can_delete?(@device)
                div(style: "margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--border-primary);") do
                  form_with(url: client_device_path(@client, @device), method: :delete, data: { confirm: "Are you sure you want to delete this device?" }) do |delete_form|
                    button_tag("Delete Device", type: "submit", class: "btn btn-danger")
                  end
                end
              end
            end
          end
        end
      end
    end
    
    private
    
    def current_user
      # TODO: Replace with actual current user from authentication
      User.first || User.create!(
        name: 'System User',
        email: 'system@example.com',
        role: :admin
      )
    end
  end
end