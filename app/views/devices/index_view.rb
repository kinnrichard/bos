module Devices
  class IndexView < ApplicationView
    def initialize(client:, devices:)
      @client = client
      @devices = devices
    end

    def template
      render Layout.new do
        render Sidebar.new(active_section: :devices, client: @client)
        
        div(class: "main-content") do
          div(class: "devices-container") do
            div(class: "page-header") do
              h1 { "Devices" }
              link_to("Add Device", new_client_device_path(@client), class: "btn btn-primary")
            end
            
            if @devices.any?
              div(class: "devices-grid") do
                @devices.each do |device|
                  device_card(device)
                end
              end
            else
              empty_state
            end
          end
        end
      end
    end
    
    private
    
    def device_card(device)
      div(class: "device-card") do
        link_to(client_device_path(@client, device), class: "device-card-link") do
          div(class: "device-header") do
            h3 { device.name }
          end
          
          if device.person
            div(class: "device-owner") do
              span(class: "owner-icon") { "👤" }
              span { device.person.name }
            end
          end
          
          if device.display_location?
            div(class: "device-location") do
              span(class: "location-icon") { "📍" }
              span { device.location }
            end
          end
          
          if device.display_notes?
            div(class: "device-notes") do
              device.notes.truncate(100)
            end
          end
        end
      end
    end
    
    def empty_state
      div(class: "empty-state") do
        h2 { "No devices yet" }
        p { "Add your first device to get started." }
        link_to("Add Device", new_client_device_path(@client), class: "btn btn-primary")
      end
    end
  end
end