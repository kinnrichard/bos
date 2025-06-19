module Devices
  class NewView < ApplicationView
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
            h1(class: "form-title") { "New Device" }
            
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
                f.submit("Save", class: "btn btn-primary")
                link_to("Cancel", client_devices_path(@client), class: "btn btn-secondary")
              end
            end
          end
        end
      end
    end
  end
end