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
          div(class: "page-header") do
            h1 { "Devices" }
            link_to("Add Device", new_client_device_path(@client), class: "btn btn-primary")
          end
          
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
        div(class: "empty-state") do
          h2 { "No devices yet" }
          p { "Add your first device to get started." }
          link_to("Add Device", new_client_device_path(@client), class: "btn btn-primary")
        end
      end
      
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
end