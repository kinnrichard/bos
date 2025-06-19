# frozen_string_literal: true

module Views
  module Devices
    class IndexView < Views::Base
      def initialize(client:, devices:)
        @client = client
        @devices = devices
      end

      def view_template
        render_layout(
          title: "Devices - #{@client.name}",
          current_user: current_user,
          active_section: :devices,
          client: @client
        ) do
          render Components::PageHeader.new(
            title: "Devices",
            action_text: "Add Device", 
            action_path: new_client_device_path(@client)
          )
          
          if @devices.any?
            div(class: "devices-list") do
              @devices.each do |device|
                link_to client_device_path(@client, device), class: "device-item" do
                  div(class: "device-info") do
                    span(class: "device-name") { device.name }
                    
                    div(class: "device-meta") do
                      if device.person
                        span(class: "meta-icon") { "👤" }
                        span(class: "meta-text") { device.person.name }
                      end
                      
                      if device.display_location?
                        span(class: "meta-icon") { "📍" }
                        span(class: "meta-text") { device.location }
                      end
                    end
                  end
                end
              end
            end
          else
            empty_state
          end
        end
      end
      
      private
      
      def empty_state
        render Components::GenericEmptyState.new(
          title: "No devices yet",
          message: "Add your first device to get started.",
          action_text: "Add Device",
          action_path: new_client_device_path(@client)
        )
      end
      
    end
  end
end